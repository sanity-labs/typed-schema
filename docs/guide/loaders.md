# Loading documents and references

`createLoader(fetch)` wraps a function that fetches a document by id and returns typed `loadDocument` and `loadReference` helpers. The library does not talk to the Sanity API itself; you supply the fetch, for example with `@sanity/client`:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'
import {createClient} from '@sanity/client'

const client = createClient({projectId: 'abc123', dataset: 'production'})

const {loadDocument, loadReference} = s.createLoader((id, fields) =>
  client.fetch(`*[_id == $id][0]{${fields.join(', ')}}`, {id}),
)

const Author = s.document({_type: s.literal('author'), name: s.string()})

type Author = s.Infer<typeof Author>

const Post = s.document({
  _type: s.literal('post'),
  title: s.string(),
  author: s.reference(Author),
})

type Post = s.Infer<typeof Post>

const welcome = await loadDocument(Post, 'welcome')
//    ^?
const writer = await loadReference(welcome.author)
//    ^?
```

`loadDocument` parses what the fetch returns against `committed(Post)`, so a document that does not match its schema, or that lacks `_id`, `_rev`, `_createdAt` or `_updatedAt`, rejects with a `ParseError`. `fields` is the list of top-level field names in the schema, including those four, so you can project only what you need. `loadReference` passes the fields of the schema the reference points to.

`loadDocument` returns `Parsed<Committed<typeof Post>>`, where each reference value includes the schema it points to under a non-enumerable `$refSchema` key, which `JSON.stringify` skips. That is how `loadReference(welcome.author)` knows to parse the result as an `Author`. A reference typed as `Infer<typeof Post>['author']` has no `$refSchema`, for example one built by hand or read straight from the client. For those, `loadReference` fetches and parses only the document system fields, and the result is typed as a committed document with `_type`, `_id`, `_rev`, `_createdAt` and `_updatedAt` and nothing else.

`createLoader` also returns `loadDocuments` and `loadReferences` for lists. Use `createDocumentLoader` or `createReferenceLoader` if you only need one of them.
