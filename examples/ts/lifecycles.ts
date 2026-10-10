import {
  document,
  draft,
  type Infer,
  literal,
  parse,
  stored,
  string,
} from '@sanity-labs/typed-schema'

// The schema for the MyDocument type in its "ideal" form (i.e. published/validated state)

const MyDocument = document({
  _type: literal('pet'),
  name: string(),
})

// Schema for MyDocument as draft
const MyDocumentDraft = draft(MyDocument)

// Schema for MyDocument as stored
const MyDocumentStored = stored(MyDocument)
const storedMyDocument = parse(MyDocumentStored, {/* input */})
// _rev is defined because it's stored!
console.log(storedMyDocument._rev.toUpperCase())

// Schema for MyDocument as a stored draft
const MyDocumentStoredDraft = stored(MyDocumentDraft)
const storedDraft = parse(MyDocumentStoredDraft, {/* input */})

// _id is defined because it's stored!
console.log(storedDraft._id.toUpperCase())

// Inferred TypeScript type of MyDocument (default is published)
type MyDocument = Infer<typeof MyDocument>
// Can create a new instances of published without having to provide _id, _rev, etc.
// but still need to provide required fields
const somePublished: MyDocument = {
  _type: 'pet',
  name: 'someName',
}

// Inferred TypeScript type of MyDocument as draft
type MyDocumentDraft = Infer<typeof MyDocumentDraft>

// Can create a new instances of drafts without having to provide required attributes
const someDraft: MyDocumentDraft = {
  _type: 'pet',
}
