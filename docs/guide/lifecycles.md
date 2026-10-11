# Document lifecycles

A document schema describes a complete document as you construct it locally. Drafts, documents fetched from the API and documents mid-edit are derived from it. `document()` makes the four system fields optional, so a new recipe needs its declared fields and nothing else:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({_type: s.literal('recipe'), title: s.string()})

type Recipe = s.Infer<typeof Recipe>

const recipe: Recipe = {_type: 'recipe', title: 'Waffles'}
```

::: tip Model the ideal document
Write the schema for the document as it should be when it is complete and valid. Make a field optional only if a finished document can leave it out, not because it may be missing while someone edits it or in a draft. Derive those shapes with `partial()` and `committed()` instead of loosening the schema itself, so the schema stays the single description of what valid content looks like.
:::

Two transforms move away from that shape, and they are independent of each other:

- `partial(doc)` relaxes completeness: every field except `_type` becomes optional, recursively. This is what you hold while editing, and what the `drafts` or `raw` perspective may return. It is `deepPartial` restricted to documents.
- `committed(doc)` adds persistence: `_id`, `_rev`, `_createdAt` and `_updatedAt` become required, because the Content Lake assigns them when it accepts a mutation. Every document the API returns is committed.

Because the axes are independent, the four combinations are four schemas:

|                   | Complete            | May be incomplete            |
| ----------------- | ------------------- | ---------------------------- |
| **Not committed** | `Recipe`            | `partial(Recipe)`            |
| **Committed**     | `committed(Recipe)` | `committed(partial(Recipe))` |

Apply `committed` last: `partial` would make the system fields optional again.

`DeepPartial<typeof Recipe>` and `Committed<typeof Recipe>` are the schema types these return, so `Infer<Committed<typeof Recipe>>` is the type of a recipe as the API returns it. There is no separate value-level transform: derive the schema, then infer.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({_type: s.literal('recipe'), title: s.string()})

type Recipe = s.Infer<typeof Recipe>

const committedRecipe = s.parse(s.committed(Recipe), {
  _type: 'recipe',
  _id: 'pancakes',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
  title: 'Pancakes',
})
if (committedRecipe.ok) {
  committedRecipe.value._rev
  //                    ^?
}

const PartialRecipe = s.partial(Recipe)

type PartialRecipe = s.Infer<typeof PartialRecipe>
const committedPartialRecipe = s.parse(s.committed(PartialRecipe), {
  _type: 'recipe',
  _id: 'drafts.pancakes',
  _rev: 'abc',
  _createdAt: '2024-01-01T00:00:00Z',
  _updatedAt: '2024-01-01T00:00:00Z',
})
if (committedPartialRecipe.ok) {
  committedPartialRecipe.value.title
  //                           ^?
}

// A new recipe needs its declared fields but no system fields
const newRecipe: Recipe = {_type: 'recipe', title: 'Waffles'}
// A partial one needs neither
const newPartialRecipe: PartialRecipe = {_type: 'recipe'}

// Name the committed type without calling committed() at runtime
type CommittedRecipe = s.Infer<s.Committed<typeof Recipe>>
```

Published, draft and version are perspectives on committed documents rather than shapes of their own. The Content Lake tells them apart by `_id` prefix and by the `perspective` you query with, and under `perspective: 'drafts'` it returns the published `_id` and keeps the real one in `_originalId`. A type that encoded the prefix into `_id` would be wrong under some perspectives, so the library does not model the variant.

In `@sanity/client` terms, `SanityDocumentStub` corresponds to the base schema and `SanityDocument` to `committed(doc)`. `IdentifiedSanityDocumentStub` (`_id` known, nothing else assigned) has no counterpart.

The [playground](/playground?example=lifecycles) shows all four combinations side by side.
