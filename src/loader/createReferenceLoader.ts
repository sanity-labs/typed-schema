import {
  type Conceal,
  type OutputOf,
  type Parsed,
  REF_SCHEMA,
  type SanityObject,
  type SanityType,
} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {inspect} from '../helpers/inspect'
import {isObjectLike} from '../helpers/isObjectLike'
import {
  assertDistinctTargetTypes,
  assertDocumentTargets,
  documentTypeOf,
  listReferenceTargets,
} from '../helpers/referenceTargets'
import {type Committed, committed} from '../lifecycle'
import {ParseError, type ParseOk, type ParseResult, parse} from '../parse'
import {
  DocumentBase,
  type ReferenceBase,
  type SanityDocumentValue,
} from '../shapeDefs'

export type DocumentLike = OutputOf<typeof DocumentBase>
export type ReferenceLike = OutputOf<typeof ReferenceBase>

/**
 * A reference value that may or may not include its referenced schema: a
 * `Parsed` reference has it, an `Infer` reference (hand-written or from a raw
 * client result) does not.
 */
export type ReferenceWithOptionalRefType<RefTypeDef> = ReferenceLike &
  Partial<Conceal<RefTypeDef>>

const NO_REF: Promise<ParseOk<any>> = Promise.resolve({
  ok: true,
  value: undefined,
})

/**
 * The schema of the document a reference value points to. For a `Parsed`
 * reference, this is the schema of its `reference()` target, or, for a
 * reference to a `union()` of documents, a union of the member schemas. For
 * an `Infer` reference (hand-written or from a raw client result), it is the
 * base document schema, so only the system fields are parsed.
 */
export type ReferencedSchema<
  RefValue extends ReferenceWithOptionalRefType<
    SanityType<SanityDocumentValue>
  >,
> = RefValue extends {[REF_SCHEMA]?: infer Ref}
  ? Ref extends {typeName: 'documentUnion'; union: readonly (infer Member)[]}
    ? Extract<Member, SanityType<SanityDocumentValue>>
    : Ref extends SanityType<SanityDocumentValue>
      ? Ref
      : typeof DocumentBase
  : typeof DocumentBase

/**
 * What `loadReference(ref)` resolves to: the referenced document as the
 * Content Lake returns it, i.e. `Parsed<Committed<ReferencedSchema<typeof ref>>>`.
 * For a reference to a `union()` of documents, a union of those documents.
 */
export type LoadedReference<
  RefValue extends ReferenceWithOptionalRefType<
    SanityType<SanityDocumentValue>
  >,
> = Parsed<Committed<ReferencedSchema<RefValue>>>

/** `"a"`, `"a" or "b"`, `"a", "b" or "c"` */
function formatChoices(values: unknown[]): string {
  const quoted = values.map(value => inspect(value))
  return quoted.length > 1
    ? `${quoted.slice(0, -1).join(', ')} or ${quoted.at(-1)}`
    : quoted.join('')
}

/**
 * Finds the target whose `_type` matches the `_type` of `input`, or returns a
 * `ParseError` if none does. With a single target, returns it without
 * checking `_type`, so parsing reports what is wrong with the input.
 */
function findTarget(
  targets: SanityType[],
  input: unknown,
): SanityType | ParseError {
  if (targets.length === 1) {
    return targets[0]!
  }
  const expected = formatChoices(targets.map(documentTypeOf))
  if (!isObjectLike(input)) {
    return new ParseError([
      {
        code: 'INVALID_TYPE',
        path: [],
        message: `Expected a referenced document of type ${expected}`,
      },
    ])
  }
  const target = targets.find(
    candidate => documentTypeOf(candidate) === input._type,
  )
  if (target) {
    return target
  }
  return new ParseError([
    {
      code: 'INVALID_OBJECT_UNION',
      path: ['_type'],
      message: `Expected a referenced document of type ${expected}, got ${inspect(input._type)}`,
    },
  ])
}

export function createLoadReferenceResult(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  return function loadReferenceResult<
    RefValue extends ReferenceWithOptionalRefType<
      SanityType<SanityDocumentValue>
    >,
  >(
    reference: RefValue,
    fieldSelection?: Extract<keyof LoadedReference<RefValue>, string>[],
  ): Promise<ParseResult<LoadedReference<RefValue>>> {
    if (!reference._ref) {
      return NO_REF
    }

    // A target listed twice, directly and through `lazy()`, counts once
    const targets = Array.from(
      new Set(
        listReferenceTargets(reference[REF_SCHEMA] || DocumentBase).map(
          getLazySchema,
        ),
      ),
    )
    // Lazy targets that are not documents, or that have the same `_type`, are
    // a schema error, not a problem with the loaded document, so reject
    // instead of returning a failed result. This matches `reference()`, which
    // throws for targets that are not lazy. The base document schema used
    // without `$refSchema` is an object schema, so it is not checked.
    if (reference[REF_SCHEMA]) {
      try {
        assertDocumentTargets(targets)
        assertDistinctTargetTypes(targets)
      } catch (error) {
        return Promise.reject(error)
      }
    }
    const fields =
      fieldSelection ||
      Array.from(
        new Set(
          targets.flatMap(target =>
            Object.keys((target as SanityObject).shape),
          ),
        ),
      )
    return fetch(reference._ref, fields).then(input => {
      const target = findTarget(targets, input)
      return target instanceof ParseError
        ? {ok: false, error: target}
        : parse(committed(target as any), input)
    }) as any
  }
}

export function createReferenceLoader(
  fetch: (ref: string, fieldSelection: string[]) => Promise<unknown>,
) {
  const loadReferenceResult = createLoadReferenceResult(fetch)

  return function loadReference<
    RefValue extends ReferenceWithOptionalRefType<
      SanityType<SanityDocumentValue>
    >,
  >(reference: RefValue): Promise<LoadedReference<RefValue>> {
    return loadReferenceResult(reference).then(result =>
      result.ok ? result.value : Promise.reject(result.error),
    )
  }
}
