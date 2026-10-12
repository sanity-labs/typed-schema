---
'@sanity-labs/typed-schema': minor
---

`reference()` accepts a `union()` of documents, so a reference can point to documents of several types: `reference(union([Author, Book]))`. `loadReference` fetches the fields of every document in the union and parses the loaded document against the one with the same `_type`. It resolves to a union of those documents, which you can narrow on `_type`, and rejects with a `ParseError` if the loaded document has any other `_type`. `reference()` throws if two documents in the union have the same `_type`. `toClassicSchema` converts such a reference to a classic reference with one `to` entry per document type.

`union()` accepts documents and `lazy()` documents as members, so you can also parse a value that can be one of several document types, such as a query result. A union of documents can't include other object types or be an `array()` element, and a document typed by its value must be typed as `DocumentSchemaOf<Value>` to be a member.

`union()` now combines its `reference()` members into one reference to a union of their documents: `union([reference(Author), reference(Book)])` is the same as `reference(union([Author, Book]))`. Previously, every reference value matched the first reference in the union, so `loadReference` parsed the loaded document against that reference's document schema, whatever its type. If you have a union with several references, remove annotations from the references, from the unions they point to, and from a nested `union()` that contains them, and put them on a single `reference(union([...]))` instead. `union()` throws otherwise.

Pass `union()` members that include a `reference()` inline, or declare the variable with `as const`. Passing a plain variable, which TypeScript types as an array of unknown length, is now a type error.
