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

## References to several document types

A reference can point to documents of several types: pass `reference()` a `union()` of documents. The stored value doesn't say which type it points to, so `loadReference` fetches the fields of every document in the union and parses the loaded document against the schema whose `_type` matches. If the loaded document has any other `_type`, `loadReference` rejects with a `ParseError`. `reference()` throws if two documents in the union have the same `_type`; for `lazy()` documents, which resolve only at load time, `loadReference` rejects instead.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

declare const loadDocument: ReturnType<typeof s.createLoader>['loadDocument']
declare const loadReference: ReturnType<typeof s.createLoader>['loadReference']
// ---cut---
const Author = s.document({_type: s.literal('author'), name: s.string()})
const Book = s.document({_type: s.literal('book'), title: s.string()})
const Review = s.document({
  _type: s.literal('review'),
  subject: s.reference(s.union([Author, Book])),
})

const review = await loadDocument(Review, 'cosmos-review')
const subject = await loadReference(review.subject)
//    ^?
if (subject._type === 'book') {
  console.log(subject.title)
}
```

`loadReference(review.subject)` resolves to `Parsed<Committed<typeof Author>> | Parsed<Committed<typeof Book>>`, which you can narrow on `_type`.

`union([reference(Author), reference(Book)])` is the same as `reference(union([Author, Book]))`. Every reference value has `_type: 'reference'`, so parsing can't tell several reference members apart, and `union()` combines them into one. It throws if one of those references, or a nested `union()` that contains one, has annotations. Put the annotations on a single `reference(union([...]))` instead.

A document that references itself can be a member through a getter, and you can wrap it in `lazy()`: `reference(union([lazy(() => Person), Book]))`. A document typed by its value must be typed as `DocumentSchemaOf<Value>` to be a member, since a `Schema<Value>` could be an object at runtime.

You can also use a `union()` of documents on its own to parse a value that can be one of several documents, such as a query result: `parse(union([Author, Book]), doc)`. It can't include other object types or be an `array()` element. `toClassicSchema` throws for a union of documents that isn't a reference target, since Studio can't store a document inside another document.
