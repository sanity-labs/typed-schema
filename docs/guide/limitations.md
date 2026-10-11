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
- Union members must all be primitives, all documents, or all typed objects, references, images, files and blocks. Mixing them is a type error.
- Unknown `_type` values in an object union fail to parse.
- Every reference value has `_type: 'reference'`, so a union cannot tell several references apart. `union()` combines them into one reference to a union of their documents. It throws if one of those references, or a nested `union()` that contains one, has annotations; put them on a single `reference(union([...]))` instead.
- `reference()` can't tell from a `SanityType<Value>` annotation whether the schema is a document, so it accepts one and throws when it's created if the schema is an object. Type documents as `SanityDocumentType<Value>` to have the types check it.
- Pass `union()` members that include a `reference()` inline, or declare the variable with `as const`. A plain variable is typed as an array of unknown length, so `union()` cannot count its references, and passing it is a type error.
