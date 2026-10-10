import {
  document,
  draft,
  type Infer,
  literal,
  parse,
  stored,
  string,
} from '@sanity/sanitype'

// The schema for the myDocument type in its "ideal" form (i.e. published/validated state)

const myDocument = document({
  _type: literal('pet'),
  name: string(),
})

// Schema for myDocument as draft
const myDocumentDraft = draft(myDocument)

// Schema for myDocument as stored
const myDocumentStored = stored(myDocument)
const storedMyDocument = parse(myDocumentStored, {/* input */})
// _rev is defined because it's stored!
console.log(storedMyDocument._rev.toUpperCase())

// Schema for myDocument as a stored draft
const myDocumentStoredDraft = stored(myDocumentDraft)
const storedDraft = parse(myDocumentStoredDraft, {/* input */})

// _id is defined because it's stored!
console.log(storedDraft._id.toUpperCase())

// Inferred TypeScript type of myDocument (default is published)
type MyDocument = Infer<typeof myDocument>
// Can create a new instances of published without having to provide _id, _rev, etc.
// but still need to provide required fields
const somePublished: MyDocument = {
  _type: 'pet',
  name: 'someName',
}

// Inferred TypeScript type of myDocument as draft
type MyDocumentDraft = Infer<typeof myDocumentDraft>

// Can create a new instances of drafts without having to provide required attributes
const someDraft: MyDocumentDraft = {
  _type: 'pet',
}
