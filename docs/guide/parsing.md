# Parsing and errors

`parse` checks a value against a schema and returns a typed copy of it. Properties the schema does not declare are stripped rather than rejected.

## `parse`

`parse(schema, input)` never throws for invalid input. It returns `{ok: true, value}`, or `{ok: false, error}` where `error` is a `ParseError` that lists every problem found, not only the first:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.number(),
})

type Recipe = s.Infer<typeof Recipe>

const response = await fetch('https://example.com/recipes/pancakes.json')
// here the response is {"_type": "recipe", "title": 42}
const input = await response.json()

const result = s.parse(Recipe, input)
if (result.ok) {
  result.value
  //     ^?
} else {
  // [
  //   {path: ['title'], code: 'INVALID_TYPE', message: 'Expected a string'},
  //   {path: ['servings'], code: 'INVALID_TYPE', message: 'Expected a finite number'},
  // ]
  console.log(result.error.issues)
}
```

The value is `Parsed<typeof Recipe>`: `Infer<typeof Recipe>` plus a `$refSchema` key on reference values. The key is non-enumerable, so `JSON.stringify` skips it; see [Loading documents and references](./loaders).

## `parseOrThrow`

`parseOrThrow(schema, input)` returns the value directly, and throws the same `ParseError` that a failed `parse` result holds:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const Recipe = s.document({
  _type: s.literal('recipe'),
  title: s.string(),
  servings: s.number(),
})

type Recipe = s.Infer<typeof Recipe>

const response = await fetch('https://example.com/recipes/pancakes.json')
// here the response is {"_type": "recipe", "title": 42}
const input = await response.json()

try {
  const recipe = s.parseOrThrow(Recipe, input)
  //    ^?
} catch (err) {
  // only handle parse errors; let anything else propagate
  if (!(err instanceof s.ParseError)) throw err
  // Invalid input (2 issues):
  //   title: Expected a string
  //   servings: Expected a finite number
  console.error(err.message)
}
```

## Error details

Each item in `error.issues` is a `ParseIssue` with a `path`, a `code` and a `message`. A path holds field names, array indexes and, for items in arrays of objects, `{_key, index}` segments with the item's key and its position in the input. The codes are listed in the [parsing API reference](/api/parsing).

The error's `message` is a report of every issue, one per line. `formatIssues(issues)` writes the same report, and `formatPath(path)` writes a single path the way Sanity does, such as `body[_key=="abc"].children[0].text`. The empty path, for an issue with the value as a whole, is written `<root>`. Both also accept issues and paths from any [Standard Schema](./standard-schema) library.

Issues leave out the rejected value by default, so error messages and logged issues do not leak untrusted or sensitive input. Pass `{reportInput: true}` as the third argument to `parse` or `parseOrThrow` to include it: each issue then has an `input`, and the report shows it (`title: Expected a string, got 42`).
