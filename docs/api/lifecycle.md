# Lifecycle helpers

| Export                                                    | Notes                                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `partial(doc)`                                            | `deepPartial` for documents: every field but `_type` becomes optional, recursively. Returns `DeepPartial<typeof doc>` |
| `committed(doc)`                                          | `_id`, `_rev`, `_createdAt`, `_updatedAt` become required                                                             |
| `Committed<typeof doc>`                                   | The schema type `committed()` returns; `Infer<Committed<typeof doc>>` is a document as the API returns it             |
| `COMMITTED_KEYS`, `CommittedKeys`                         | The fields `committed()` requires, as a constant and as a union of their names                                        |
| `verifyUniqueTypeNames(schema)`, `DuplicateTypeNameError` | See [GraphQL compatibility](/guide/graphql)                                                                           |

See [Document lifecycles](/guide/lifecycles) for examples.
