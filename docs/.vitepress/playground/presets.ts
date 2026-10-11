export interface Preset {
  /** Used in links: /playground?example=<id>. Keep it stable. */
  id: string
  name: string
  /** Every preset default-exports a schema: its type is shown, and input is validated against it */
  code: string
  /** Sample input for the input panel */
  json: string
}

export const presets: Preset[] = [
  {
    id: 'event',
    name: 'Event',
    code: `import * as s from '@sanity-labs/typed-schema'

const Slug = s.object({_type: s.literal('slug'), current: s.string()})

const Artist = s.document({_type: s.literal('artist'), name: s.string()})

const Venue = s.document({
  _type: s.literal('venue'),
  name: s.string(),
  city: s.optional(s.string()),
  country: s.optional(s.string()),
})

const Event = s.document({
  _type: s.literal('event'),
  name: s.string(),
  slug: Slug,
  eventType: s.enums(['in-person', 'virtual']),
  date: s.dateTime(),
  // minutes before the start time
  doorsOpen: s.optional(s.number({min: 0})),
  venue: s.optional(s.reference(Venue)),
  headline: s.optional(s.reference(Artist)),
  image: s.optional(s.image()),
  details: s.optional(s.array(s.block({}))),
  tickets: s.optional(s.string()),
})

export type Event = s.Infer<typeof Event>

// The default export's inferred type is shown on the right, and the
// Validate tab checks input against it
export default Event
`,
    json: `{
  "_id": "a1d9c5e2-6f1b-4c3e-9a7d-3b2f8e4c1d05",
  "_type": "event",
  "name": "Midnight Echoes",
  "slug": {"_type": "slug", "current": "midnight-echoes"},
  "eventType": "hybrid",
  "date": "2026-11-21 20:00",
  "doorsOpen": -30,
  "venue": {"_type": "reference", "_ref": "venue-oslo-spektrum"},
  "headline": {"_type": "reference", "_ref": "artist-aurora"},
  "details": [
    {
      "_type": "block",
      "_key": "d1",
      "style": "normal",
      "markDefs": [],
      "children": [
        {"_type": "span", "_key": "s1", "text": "An evening of ambient pop.", "marks": []}
      ]
    }
  ],
  "tickets": "https://example.com/tickets/midnight-echoes"
}
`,
  },
  {
    id: 'blog-post',
    name: 'Blog post',
    code: `import * as s from '@sanity-labs/typed-schema'

const Slug = s.object({_type: s.literal('slug'), current: s.string()})

const Author = s.document({
  _type: s.literal('author'),
  name: s.string(),
  slug: Slug,
  image: s.optional(s.image()),
})

const Category = s.document({
  _type: s.literal('category'),
  title: s.string(),
  description: s.optional(s.string()),
})

const Post = s.document({
  _type: s.literal('post'),
  title: s.string(),
  slug: Slug,
  author: s.reference(Author),
  mainImage: s.optional(s.image({alt: s.optional(s.string())})),
  categories: s.optional(s.array(s.reference(Category))),
  publishedAt: s.optional(s.dateTime()),
  body: s.portableText({
    block: s.block({
      style: s.union([s.literal('normal'), s.literal('h2'), s.literal('blockquote')]),
      list: s.literal('bullet'),
      decorator: s.union([s.literal('strong'), s.literal('em')]),
      annotation: s.object({_type: s.literal('link'), href: s.string()}),
    }),
    element: s.object({
      _type: s.literal('callout'),
      tone: s.union([s.literal('info'), s.literal('warning')]),
      text: s.string(),
    }),
  }),
})

export type Post = s.Infer<typeof Post>

export default Post
`,
    json: `{
  "_id": "post-hello-world",
  "_type": "post",
  "title": "Hello, world",
  "slug": {"_type": "slug", "current": "hello-world"},
  "author": {"_type": "reference", "_ref": "author-grace"},
  "mainImage": {
    "_type": "image",
    "alt": "A desk with a laptop",
    "asset": {"_type": "reference", "_ref": "image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg"}
  },
  "categories": [
    {"_type": "reference", "_key": "c1", "_ref": "category-news"}
  ],
  "publishedAt": "2026-10-01T09:30:00Z",
  "body": [
    {
      "_type": "block",
      "_key": "b1",
      "style": "normal",
      "markDefs": [{"_type": "link", "_key": "l1", "href": "https://www.sanity.io"}],
      "children": [
        {"_type": "span", "_key": "s1", "text": "Built with ", "marks": []},
        {"_type": "span", "_key": "s2", "text": "Sanity", "marks": ["l1", "strong"]}
      ]
    },
    {"_type": "callout", "_key": "c1", "tone": "info", "text": "This post is valid."}
  ]
}
`,
  },
  {
    id: 'person',
    name: 'Declare a document',
    code: `import * as s from '@sanity-labs/typed-schema'

const Person = s.document({
  _type: s.literal('person'),
  fullName: s.string(),
  portrait: s.optional(s.image()),
  links: s.optional(s.array(s.object({label: s.string(), url: s.string()}))),
})

// Hover \`Person\` to see the inferred type
export type Person = s.Infer<typeof Person>

const result = s.parse(Person, {_type: 'person', fullName: 'Ada Lovelace'})

if (result.ok) {
  const ada = result.value

  // The image's asset is a reference to an image asset document
  ada.portrait?.asset._ref

  // Objects in arrays get a _key
  ada.links?.[0]?._key

  // A typo in a field name is a type error
  ada.fullname
}

export default Person
`,
    json: `{
  "_type": "person",
  "fullName": "Ada Lovelace",
  "portrait": {
    "_type": "image",
    "asset": {"_type": "reference", "_ref": "image-a1b2c3-800x1000-jpg"}
  },
  "links": [
    {"_key": "w1", "label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Ada_Lovelace"}
  ]
}
`,
  },
  {
    id: 'constraints',
    name: 'Compile-time constraints',
    code: `import * as s from '@sanity-labs/typed-schema'

// Each schema below is a type error. Hover the red squiggles to see why.
// They are wrapped in a function that never runs: some of them also
// throw at runtime, which would stop the input from being validated.
function invalidSchemas() {
  // Arrays of arrays are not allowed
  const Matrix = s.array(s.array(s.number()))

  // Object unions need a _type literal on every member
  const Untyped = s.union([s.object({a: s.string()}), s.object({b: s.string()})])

  // Unions cannot mix primitives and objects
  const Mixed = s.union([s.string(), s.object({_type: s.literal('x')})])

  // Field names starting with _ are reserved for system fields
  const Hidden = s.object({_secret: s.string()})
}

// Each invalid schema above, written the way Sanity allows
const Fixed = s.document({
  _type: s.literal('fixed'),
  // an array of typed objects instead of an array of arrays
  matrix: s.array(s.object({_type: s.literal('row'), cells: s.array(s.number())})),
  // every union member has a _type literal
  blocks: s.array(
    s.union([
      s.object({_type: s.literal('a'), a: s.string()}),
      s.object({_type: s.literal('b'), b: s.string()}),
    ]),
  ),
  // primitives and objects in separate fields
  label: s.string(),
  marker: s.object({_type: s.literal('x')}),
  // no underscore
  secret: s.string(),
})

export type Fixed = s.Infer<typeof Fixed>

export default Fixed
`,
    json: `{
  "_type": "fixed",
  "matrix": [
    {"_type": "row", "_key": "r1", "cells": [1, 2, 3]},
    {"_type": "row", "_key": "r2", "cells": [4, 5, 6]}
  ],
  "blocks": [
    {"_type": "a", "_key": "k1", "a": "first"},
    {"_type": "b", "_key": "k2", "b": "second"}
  ],
  "label": "Fixed",
  "marker": {"_type": "x"},
  "secret": "s3cr3t"
}
`,
  },
  {
    id: 'api-response',
    name: 'Parsing an API response',
    code: `import * as s from '@sanity-labs/typed-schema'

const Author = s.document({_type: s.literal('author'), name: s.string()})

// A document as the API returns it. committed() makes _id, _rev,
// _createdAt and _updatedAt required.
const result = s.parse(s.committed(Author), {
  _id: '200e44f2-14a9-4c7a-a621-a4ca4d9b559c',
  _type: 'author',
  _createdAt: '2025-04-25T15:03:54Z',
  _originalId: '200e44f2-14a9-4c7a-a621-a4ca4d9b559c',
  _rev: 'DOcXr0KgQH6faBzvMdKRNc',
  _updatedAt: '2025-05-02T20:44:48Z',
  name: 'Mark',
})

if (result.ok) {
  // narrowed to the committed author type; undeclared fields such as
  // _originalId are stripped
  result.value._rev
} else {
  // ParseIssue[]: path, code and message
  result.error.issues.map(issue => s.formatPath(issue.path))
}

export type CommittedAuthor = s.Infer<s.Committed<typeof Author>>

// Set Persistence to Committed on the right to validate the input as
// committed(Author)
export default Author
`,
    json: `{
  "_id": "200e44f2-14a9-4c7a-a621-a4ca4d9b559c",
  "_type": "author",
  "_createdAt": "2025-04-25T15:03:54Z",
  "_originalId": "200e44f2-14a9-4c7a-a621-a4ca4d9b559c",
  "_rev": "DOcXr0KgQH6faBzvMdKRNc",
  "_updatedAt": "2025-05-02T20:44:48Z",
  "name": "Mark"
}
`,
  },
  {
    id: 'lifecycles',
    name: 'Document lifecycles',
    code: `import * as s from '@sanity-labs/typed-schema'

// A document schema describes a complete document as you construct it locally
const Author = s.document({_type: s.literal('author'), name: s.string()})

// partial() relaxes completeness: what you hold while editing
const PartialAuthor = s.partial(Author)

// committed() adds the system fields the Content Lake assigns
type CommittedAuthor = s.Infer<s.Committed<typeof Author>>

// A new author needs its declared fields but no system fields
const newAuthor: s.Infer<typeof Author> = {_type: 'author', name: 'Mark'}

// A partial one needs neither
const emptyAuthor: s.Infer<typeof PartialAuthor> = {_type: 'author'}

// Every document the API returns is committed
function revision(fromApi: CommittedAuthor) {
  return fromApi._rev.toUpperCase()
}

export type Author = s.Infer<typeof Author>

// Use Complete/Partial and Not committed/Committed on the right to see each
// combination. The Validate tab checks the input against the selected one:
// this document from the drafts perspective is committed but incomplete.
export default Author
`,
    json: `{
  "_id": "drafts.200e44f2-14a9-4c7a-a621-a4ca4d9b559c",
  "_type": "author",
  "_createdAt": "2025-04-25T15:03:54Z",
  "_rev": "DOcXr0KgQH6faBzvMdKRNc",
  "_updatedAt": "2025-05-02T20:44:48Z"
}
`,
  },
  {
    id: 'portable-text',
    name: 'Portable Text',
    code: `import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({
    style: s.union([s.literal('normal'), s.literal('h1'), s.literal('h2')]),
    list: s.union([s.literal('bullet'), s.literal('number')]),
    decorator: s.union([s.literal('strong'), s.literal('em')]),
    annotation: s.object({_type: s.literal('link'), href: s.string()}),
  }),
  element: s.object({_type: s.literal('codeBlock'), code: s.string()}),
})

export type Body = s.Infer<typeof Body>

function describe(value: Body) {
  return value.map(item =>
    item._type === 'block'
      ? item.style // 'normal' | 'h1' | 'h2' | undefined
      : item.code,
  )
}

export default Body
`,
    json: `[
  {
    "_type": "block",
    "_key": "b1",
    "style": "h1",
    "markDefs": [],
    "children": [{"_type": "span", "_key": "s1", "text": "Install", "marks": []}]
  },
  {"_type": "codeBlock", "_key": "c1", "code": "npm install @sanity-labs/typed-schema"}
]
`,
  },
]
