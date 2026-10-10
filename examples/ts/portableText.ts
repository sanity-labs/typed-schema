import {
  array,
  block,
  type Infer,
  literal,
  number,
  object,
  parse,
  string,
  union,
} from '@sanity-labs/typed-schema'

const someBlock = block({
  _type: literal('someBlock'),
  style: union([literal('normal'), literal('h1'), literal('h2')]),
  list: union([literal('bullet'), literal('number')]),
  inline: union([
    object({
      _type: literal('author'),
      name: string(),
    }),
  ]),
  decorator: union([literal('strong'), literal('em')]),
  annotation: union([
    object({_type: literal('author'), foo: number()}),
    object({_type: literal('book'), bar: number()}),
  ]),
})

const myPTArray = array(someBlock)

type MyPTArray = Infer<typeof myPTArray>

const myPTArrayValue = parse(myPTArray, [])

myPTArrayValue.map(
  element => element._type, // 'someBlock'
)
