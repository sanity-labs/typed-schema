# Limitations

Inference is only as precise as the schema literal TypeScript can see. A shape built dynamically infers as an index signature, with no named fields:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const shape: Record<string, ReturnType<typeof s.string>> = {}
for (const key of ['firstName', 'lastName']) {
  shape[key] = s.string()
}

const Person = s.object(shape)

type Person = s.Infer<typeof Person>

const result = s.parse(Person, {firstName: 'Grace', lastName: 'Hopper'})

if (result.ok) {
  // typed as {[x: string]: string}, so a typo like person.fristName compiles
  const person = result.value
  //    ^?
}
```

Write shapes as literals (`object({firstName: string(), lastName: string()})`) to get narrow types.

Other things to know:

- `date()` accepts `YYYY-MM-DD`; `dateTime()` accepts ISO 8601 with a time zone (`Z` or `±HH:mm`), with or without fractional seconds.
- Union members must all be primitives or all be typed objects. Mixing the two is a type error.
- Unknown `_type` values in an object union fail to parse.
