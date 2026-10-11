import {document} from './creators/document'
import {
  type _SanityDocument,
  type OutputOf,
  type SanityDocument,
  type SanityDocumentType,
  type SanityLazy,
  type SanityObjectShape,
  type SanityType,
} from './defs'
import {
  type ElementType,
  type Format,
  type RequireSome,
} from './helpers/utilTypes'
import {type SanityDocumentValue} from './shapeDefs'
import {type DeepPartial, deepPartial} from './utils/deepPartial'
import {required} from './utils/required'
import {type ShallowRequiredShape} from './utils/shallowRequired'

/**
 * The fields the Content Lake assigns when it commits a document. `_type` is
 * listed because it is always present on a committed document, even though
 * `document()` already requires it.
 */
export const COMMITTED_KEYS = [
  '_type',
  '_id',
  '_createdAt',
  '_updatedAt',
  '_rev',
] as const

export type CommittedKeys = ElementType<typeof COMMITTED_KEYS>

/**
 * Value-level counterpart of {@link Committed}, used where a schema carries no
 * shape to transform (`SanityDocumentType<Value>`). Not exported: express a
 * committed value as `Infer<Committed<typeof Doc>>`.
 */
type CommittedValue<T> = T extends SanityDocumentValue
  ? Format<RequireSome<T, CommittedKeys>>
  : never

/**
 * The schema `committed(doc)` returns: `doc` with `_id`, `_rev`, `_createdAt`
 * and `_updatedAt` required. `Infer<Committed<typeof Pet>>` is the type of a
 * pet as the Content Lake returns it, whichever perspective it is read from.
 *
 * Document schemas annotated by value (`SanityDocumentType<Value>`) and other
 * document-like schemas keep their kind and get the same change applied to
 * their value type; lazy schemas are transformed when resolved.
 */
export type Committed<
  T extends SanityDocument | SanityType<SanityDocumentValue>,
> =
  T extends SanityLazy<infer Inner>
    ? Inner extends SanityType<SanityDocumentValue>
      ? SanityLazy<Committed<Inner>>
      : never
    : T extends _SanityDocument<infer DocShape>
      ? SanityObjectShape extends DocShape
        ? SanityDocumentType<CommittedValue<OutputOf<T>>>
        : SanityDocument<
            ShallowRequiredShape<Pick<DocShape, CommittedKeys>> &
              Omit<DocShape, CommittedKeys>
          >
      : T extends SanityDocumentType<infer Value>
        ? SanityDocumentType<CommittedValue<Value>>
        : SanityType<CommittedValue<OutputOf<T>>>

/**
 * Makes the fields the Content Lake assigns on commit (`_id`, `_rev`,
 * `_createdAt`, `_updatedAt`) required. Compose with `partial` for a
 * committed document that may be incomplete: `committed(partial(Doc))`.
 */
export function committed<T extends SanityDocument>(schema: T): Committed<T> {
  const committedShape = Object.entries(schema.shape).map(
    ([key, propSchema]) => {
      return [
        key,
        COMMITTED_KEYS.includes(key as CommittedKeys)
          ? required(propSchema)
          : propSchema,
      ]
    },
  )
  return document(Object.fromEntries(committedShape)) as any
}

/**
 * Relaxes completeness: every field except `_type` becomes optional,
 * recursively. This is the shape of a document while it is being edited, and
 * of what the `drafts` or `raw` perspective may return.
 *
 * It is `deepPartial` restricted to documents. A document is a tree, and a
 * document that is still being filled in is partial at every level, so the
 * document-level transform is deep. Use `shallowPartial` to relax only the
 * top level. Compose with `committed` for a partial document as the Content
 * Lake returns it: `committed(partial(Doc))`. Its schema type is
 * `DeepPartial<typeof Doc>`.
 */
export function partial<T extends SanityDocument>(schema: T): DeepPartial<T> {
  return deepPartial(schema)
}
