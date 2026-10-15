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

The [schema types reference](/api/schema-types) lists what each creator accepts and what is a type error. Two of the rules for `union()` are easy to miss:

- Union members must all be primitives, all documents, or all typed objects, references, images, files and blocks. See [`union()`](/api/schema-types#union).
- Pass `union()` members that include a `reference()` inline, or declare the variable with `as const`, so that `union()` can count the references.
