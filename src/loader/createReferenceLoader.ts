import {
  type Conceal,
  type OutputOf,
  type Parsed,
  REF_SCHEMA,
  type SanityType,
} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {type Committed, committed} from '../lifecycle'
import {type ParseOk, type ParseResult, parse} from '../parse'
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
 * The schema of the document a reference value points to. A `Parsed`
 * reference carries the schema of its `reference()` target; an `Infer`
 * reference (hand-written or from a raw client result) resolves to the base
 * document schema, so only the system fields are parsed.
 */
export type ReferencedSchema<
  RefValue extends ReferenceWithOptionalRefType<
    SanityType<SanityDocumentValue>
  >,
> = RefValue extends {[REF_SCHEMA]?: infer Ref}
  ? Ref extends SanityType<SanityDocumentValue>
    ? Ref
    : typeof DocumentBase
  : typeof DocumentBase

/**
 * What `loadReference(ref)` resolves to: the referenced document as the
 * Content Lake returns it, i.e. `Parsed<Committed<ReferencedSchema<typeof ref>>>`.
 */
export type LoadedReference<
  RefValue extends ReferenceWithOptionalRefType<
    SanityType<SanityDocumentValue>
  >,
> = Parsed<Committed<ReferencedSchema<RefValue>>>

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

    const target = getLazySchema(reference[REF_SCHEMA] || DocumentBase)
    return fetch(reference._ref, fieldSelection || []).then(input =>
      parse(committed(target as any), input),
    ) as any
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
