# Portable Text

A Portable Text field is an array of blocks. `block()` describes one block, and `portableText()` builds the array, with the other items allowed between the blocks. With nothing between the blocks, use `array(block)`.

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

Each option narrows one part of the block. `style` and `list` set the allowed block styles and list types, `decorator` names the span decorators, `inline` sets the objects allowed among the spans, and `annotation` sets the objects allowed in `markDefs`, such as links. The [`block()` reference](/api/schema-types#block) lists what each option takes.

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

`portableText({block, element})` is the array of blocks plus the block-level objects allowed between them, such as images or code samples. `element` takes a typed object, a reference, an image, a file or a union of these, or `never()` for none:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Body = s.portableText({
  block: s.block({
    style: s.union([s.literal('normal'), s.literal('h2')]),
    annotation: s.object({_type: s.literal('link'), href: s.string()}),
  }),
  element: s.union([
    s.image({alt: s.string()}),
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
      case 'image':
        return `image: ${item.alt}`
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

See [`block()`](/api/schema-types#block) and [`portableText()`](/api/schema-types#portabletext) in the reference for every option.
