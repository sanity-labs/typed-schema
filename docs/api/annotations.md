# Annotations

Every creator except `optional()` and `never()` takes a `SchemaAnnotations` object as its last argument; `number()` and its aliases (`safeint()`, `int32()`, ...) take it together with the constraints. See [Schema annotations](/guide/annotations).

| Export                                              | Notes                                                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `SchemaAnnotations<Output>`                         | `{title?, description?, guidelines?, examples?, deprecated?, readOnly?}`. Text is a string or a locale map                        |
| `AnnotationText<Locale?>`                           | `string \| {[locale]: string}`. Narrow `Locale` to require a project's locales                                                    |
| `getAnnotations(schema, {locale?, fallback?})`      | The annotations with text resolved to strings, or `undefined`. Looks through `optional()` and `lazy()`, outer wins                |
| `resolveAnnotationText(text, {locale?, fallback?})` | Resolves one `AnnotationText` value                                                                                               |
| `validateExamples(schema)`                          | Parses every `examples` entry in the tree against its schema; returns `{ok: true, value}` or `{ok: false, error: ExampleError}`   |
| `validateExamplesOrThrow(schema)`                   | Same, returning the schema and throwing the `ExampleError` instead                                                                |
| `ExampleError`                                      | `failures`: each failing example with its `schemaPath`, `index`, `example` and parse `issues`. `message` lists them, one per line |
| `toClassicSchema(schema, {locale?, fallback?})`     | Maps `title`, `description`, `deprecated` and `readOnly` onto the classic definitions; see [Sanity Studio](/guide/studio)         |
| `ExampleFailure`                                    | One entry in `ExampleError.failures`                                                                                              |
| `ValidateExamplesResult<S>`                         | What `validateExamples` returns                                                                                                   |
| `ResolvedSchemaAnnotations`                         | What `getAnnotations` returns: `SchemaAnnotations` with text resolved to strings                                                  |
| `GetAnnotationsOptions`                             | `{locale?, fallback?}`, for `getAnnotations` and `resolveAnnotationText`                                                          |
| `ToClassicSchemaOptions`                            | `{locale?, fallback?}`, for `toClassicSchema`; the same as `GetAnnotationsOptions`                                                |
