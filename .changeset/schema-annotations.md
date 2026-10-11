---
'@sanity-labs/typed-schema': minor
---

Schemas can have annotations that say what a value means and how to author a good one. Every creator takes them as its last argument; `number()` takes them together with its constraints:

```ts
const Pet = document(
  {
    _type: literal('pet'),
    name: string({description: 'Display name shown on the adoption card'}),
    birthYear: optional(number({min: 1990, step: 1, examples: [2019]})),
    nickname: optional(string({deprecated: 'Use `name` instead'})),
  },
  {title: 'Pet', description: 'An animal available for adoption'},
)
```

The keys are `title`, `description`, `guidelines`, `examples`, `deprecated` and `readOnly`. Text accepts a string or a per-locale map, and `AnnotationText<'en' | 'nb'>` lets a project require its locales. `examples` are type-checked against the schema's value type.

New exports:

- `getAnnotations(schema, {locale?, fallback?})` reads annotations back with text resolved to strings, looking through `optional()` and `lazy()`
- `validateExamples(schema)` parses every example in a schema tree against its node and returns `{ok: true, value}` or `{ok: false, error: ExampleError}`; `validateExamplesOrThrow(schema)` throws the error instead
- `resolveAnnotationText(text, {locale?, fallback?})`
- `toClassicSchema(schema, {locale?})` now maps `title`, `description`, `deprecated` and `readOnly` onto the classic definitions
- the types `SchemaAnnotations`, `AnnotationText`, `ResolvedSchemaAnnotations`, `ExampleValue`, `ExampleFailure`, `ExampleError`, `ValidateExamplesResult`, `GetAnnotationsOptions`, `ToClassicSchemaOptions` and `NumberOptions`

Annotations survive the schema transforms; `extend`, `rename`, `shallowRequired` and `deepRequired` drop `examples`, since they change the value type.
