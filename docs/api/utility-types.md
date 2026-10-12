# Utility types

| Type                      | Notes                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Infer<typeof schema>`    | The value type of a schema as stored: plain data, without `$refSchema` on references                                                |
| `Parsed<typeof schema>`   | The `value` of a `parse` result, and what `parseOrThrow` and the loaders return: `Infer` plus `$refSchema` on every reference value |
| `OutputOf<typeof schema>` | The same as `Infer`                                                                                                                 |
| `Schema<Output>`          | Base type of every schema; `ObjectSchema`, `DocumentSchema`, `ArraySchema`, ... extend it                                           |
| `DocumentSchemaOf<Value>` | A document schema annotated by its value type                                                                                       |
| `DocumentValue`           | `{_type: string; _id?: string; _rev?: string; _createdAt?: string; _updatedAt?: string}`                                            |
| `ReferenceValue<T>`       | The value of a `reference()` to a schema of type `T`                                                                                |
| `ArrayValue<T>`           | `T[]`, with `_key` added to object elements                                                                                         |
| `TypedObjectSchema`       | Any object schema with a `_type` literal; use as a constraint in [custom creators](/guide/custom-creators)                          |
| `ObjectUnionSchema`       | Any `union()` of typed objects, references, images, files or blocks                                                                 |
| `PrimitiveSchema`         | Any string, number, boolean, date, date-time or literal schema                                                                      |
| `PrimitiveUnionSchema`    | Any `union()` of primitives                                                                                                         |
| `ObjectLikeSchema`        | Any object, document, reference, block, image or file schema                                                                        |
| `ArraySchema<T>`          | The schema type `array()` returns for an element schema of type `T`                                                                 |
| `StandardSchemaV1`        | The [Standard Schema](/guide/parsing#standard-schema) interface, the same as in `@standard-schema/spec`                             |

The type guards (`isObjectSchema`, `isDocumentSchema`, `isOptionalSchema`, ...) are exported for code that walks schemas, along with `getInstanceName(schema)`, which returns the `_type` literal of an object or document schema, or `undefined` if it has none.
