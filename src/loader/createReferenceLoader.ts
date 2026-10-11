import {type Conceal, type OutputOf, REF_SCHEMA, type SanityType} from '../defs'
import {type StoredDocument} from '../lifecycle'
import {ParseError, type ParseOk, type ParseResult, safeParse} from '../parse'
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
  status: 'ok',
  value: undefined,
})

export type InferReferenceType<
  T extends ReferenceWithOptionalRefType<SanityType<SanityDocumentValue>>,
> = T extends {[REF_SCHEMA]?: infer Ref}
  ? Ref extends SanityType<infer Output>
    ? Output
    : T extends {_weak: true}
      ? undefined | DocumentLike
      : DocumentLike
  : DocumentLike

export function createSafeLoadReference(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  return function safeResolve<
    RefValue extends ReferenceWithOptionalRefType<
      SanityType<SanityDocumentValue>
    >,
  >(
    reference: RefValue,
    fieldSelection?: (keyof ParseResult<InferReferenceType<RefValue>>)[],
  ): Promise<ParseResult<StoredDocument<InferReferenceType<RefValue>>>> {
    if (!reference._ref) {
      return NO_REF
    }

    return fetch(reference._ref, fieldSelection || []).then(input =>
      safeParse(reference[REF_SCHEMA] || DocumentBase, input),
    ) as any
  }
}

export function createReferenceLoader(
  fetch: (ref: string, fieldSelection: string[]) => Promise<unknown>,
) {
  const safeResolve = createSafeLoadReference(fetch)

  return function loadReference<
    T extends ReferenceWithOptionalRefType<RefTypeDef>,
    RefTypeDef extends SanityType<SanityDocumentValue>,
  >(reference: T) {
    return safeResolve(reference).then(result =>
      result.status === 'ok'
        ? result.value
        : Promise.reject(new ParseError(result.errors)),
    )
  }
}
