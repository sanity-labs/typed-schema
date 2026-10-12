# Parsing

| Export                                      | Notes                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `parse(schema, input, options?)`            | Returns `{ok: true, value}` or `{ok: false, error}`; never throws for invalid input                                                              |
| `parseOrThrow(schema, input, options?)`     | Returns `Parsed<typeof schema>` or throws a `ParseError`                                                                                         |
| `ParseOptions`                              | `{reportInput?: boolean}`. With `reportInput`, issues include the rejected value as `input`                                                      |
| `ParseResult<T>`, `ParseOk<T>`, `ParseFail` | The types of a `parse` result                                                                                                                    |
| `ParseError`                                | `message` is a report of every issue; `issues` holds them                                                                                        |
| `ParseIssue`                                | `{path, code, message}`, plus `input` with `reportInput`                                                                                         |
| `Path`                                      | An array of field names, array indexes and `{_key, index}` segments for items in arrays of objects                                               |
| `formatPath(path)`                          | Writes a path the way Sanity does: `body[_key=="abc"].children[0].text`; `<root>` for the empty path. Also takes Standard Schema paths           |
| `formatIssues(issues)`                      | Writes issues as a report, one per line; the same text as `ParseError.message`. Also takes the `issues` of any Standard Schema `validate` result |
| `IssueLike`                                 | What `formatIssues` accepts: `{message, path?, input?}`, which both `ParseIssue` and a Standard Schema issue satisfy                             |
| `PathSegmentLike`                           | What `formatPath` accepts in a path: a field name, index, symbol, `{_key, index}` or Standard Schema `{key}` segment                             |
| `schema['~standard']`                       | The [Standard Schema](/guide/standard-schema) properties; `validate` runs `parse`                                                                |
| `ErrorCode`                                 | One of the codes below                                                                                                                           |

| Error code                       | Raised when                                           |
| -------------------------------- | ----------------------------------------------------- |
| `INVALID_TYPE`                   | The value has the wrong type or format                |
| `INVALID_ENUM_VALUE`             | The value is not one of the values given to `enums()` |
| `INVALID_PRIMITIVE_UNION`        | The value matches no member of a union of primitives  |
| `NUM_TOO_SMALL`, `NUM_TOO_BIG`   | A number is outside the range given to `number()`     |
| `NUM_NOT_MULTIPLE_OF`            | A number does not match the `step` constraint         |
| `INVALID_OBJECT_UNION`           | No member of an object union matches the `_type`      |
| `ARRAY_ELEMENT_NOT_KEYED_OBJECT` | An object in an array has no `_key`                   |

See [Parsing and errors](/guide/parsing) for examples.
