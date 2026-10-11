# Portable Text

A Portable Text field is an array of blocks. `block()` describes one block, and `portableText()` builds the array, with the custom objects allowed between the blocks. With no custom objects, use `array(block)`.

## A minimal block

With no options, a block accepts any style, any list type and spans with any marks, and no inline objects or annotations:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Note = s.document({
  _type: s.literal('note'),
  body: s.array(s.block({})),
})

type Note = s.Infer<typeof Note>

type NoteBlock = Note['body'][number]
//   ^?
```

The inferred type matches what Sanity stores: `style`, `listItem`, `level` and `markDefs` are optional, and `children` holds spans. `marks` is a `string[]`, since it holds both decorator names and the `_key`s of entries in `markDefs`.

## Configuring a block

Each option narrows one part of the block:

| Option       | What it allows                                                                          |
| ------------ | --------------------------------------------------------------------------------------- |
| `style`      | Block styles, such as `normal` and `h2`, as a literal or a union of literals            |
| `list`       | List item types, such as `bullet` and `number`                                          |
| `decorator`  | Decorators, such as `strong` and `em`. Spans don't check them: `marks` stays `string[]` |
| `inline`     | Typed objects that can sit among the spans in `children`                                |
| `annotation` | Typed objects in `markDefs`, which spans refer to by `_key` in `marks`, such as links   |
| `_type`      | The block's type name, `block` by default                                               |

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Person = s.document({_type: s.literal('person'), name: s.string()})

type Person = s.Infer<typeof Person>

const ArticleBlock = s.block({
  style: s.union([s.literal('normal'), s.literal('h2'), s.literal('h3')]),
  list: s.union([s.literal('bullet'), s.literal('number')]),
  decorator: s.union([s.literal('strong'), s.literal('em')]),
  inline: s.object({_type: s.literal('mention'), person: s.reference(Person)}),
  annotation: s.object({_type: s.literal('link'), href: s.string()}),
})

type ArticleBlock = s.Infer<typeof ArticleBlock>

function headings(blocks: ArticleBlock[]) {
  return blocks.filter(block => block.style === 'h2' || block.style === 'h3')
}

function mentions(block: ArticleBlock) {
  return block.children.flatMap(child => {
    if (child._type !== 'mention') return []
    return [child.person._ref]
    //      ^?
  })
}
```

A style outside the union is a type error in a block you write yourself, and `parse` rejects it in data that comes from elsewhere.

## Objects between blocks

`portableText({block, element})` is the array of blocks plus the block-level objects allowed between them, such as figures or code samples. `element` takes an object schema with a `_type` literal, or a union of them:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({
    style: s.union([s.literal('normal'), s.literal('h2')]),
    annotation: s.object({_type: s.literal('link'), href: s.string()}),
  }),
  element: s.union([
    s.object({_type: s.literal('figure'), image: s.image(), alt: s.string()}),
    s.object({
      _type: s.literal('codeBlock'),
      language: s.string(),
      code: s.string(),
    }),
  ]),
})

type Body = s.Infer<typeof Body>

type CodeBlock = Extract<Body[number], {_type: 'codeBlock'}>
//   ^?

function describe(body: Body) {
  return body.map(item => {
    switch (item._type) {
      case 'block':
        return item.style ?? 'normal'
      case 'figure':
        return `figure: ${item.alt}`
      case 'codeBlock':
        return `${item.language} code`
    }
  })
}
```

Every item has a `_key`, since it is an object in an array. Narrowing on `_type` gives each branch its own fields.

## Naming a block type

`_type` names the block type, `block` by default. Give a block a name of its own when one schema uses two differently configured blocks, for example a rich article body and a caption that allows only emphasis. Unique names are also what [GraphQL deployment](./graphql) requires:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Figure = s.object({
  _type: s.literal('figure'),
  image: s.image(),
  caption: s.array(
    s.block({
      _type: s.literal('captionBlock'),
      style: s.literal('normal'),
      decorator: s.literal('em'),
    }),
  ),
})

type Figure = s.Infer<typeof Figure>

type CaptionBlock = Figure['caption'][number]['_type']
//   ^?
```

## Parsing Portable Text

`parse` checks every item: blocks against the block schema, other items against the member with the same `_type`. An item with an unknown `_type`, or one without a `_key`, is an issue with its path:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({style: s.union([s.literal('normal'), s.literal('h2')])}),
  element: s.object({_type: s.literal('codeBlock'), code: s.string()}),
})

type Body = s.Infer<typeof Body>

const result = s.parse(Body, [
  {
    _type: 'block',
    _key: 'a1',
    children: [{_type: 'span', _key: 's1', text: 'Hello', marks: []}],
  },
  {_type: 'video', _key: 'b2'},
  {_type: 'codeBlock', code: 'npm install'},
])

if (!result.ok) {
  // Invalid input (2 issues):
  //   [_key=="b2"]: Type "video" not found among valid union types
  //   [2]: Expected an object with a "_key" property
  console.error(result.error.message)
}
```

See the [schema types reference](/api/schema-types#portable-text) for the full list of options.
