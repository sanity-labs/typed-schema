# Partial and required variants

A form lets users fill in fields gradually, so you want a type where everything is optional while they edit and a type where required fields are required when they save. Rather than making every field optional in the content model, derive the variants:

| Function                  | Effect                                                           |
| ------------------------- | ---------------------------------------------------------------- |
| `shallowPartial(schema)`  | Every top-level field becomes optional                           |
| `shallowRequired(schema)` | Every top-level field becomes required                           |
| `deepPartial(schema)`     | Every field becomes optional, recursively through nested objects |
| `deepRequired(schema)`    | Every field becomes required, recursively through nested objects |
| `required(schema)`        | Removes `optional()` from a single schema                        |

`_type` stays required in all of them.

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

const ContactDetails = s.object({
  name: s.string(),
  address: s.object({street: s.string(), city: s.string()}),
  email: s.string(),
})

// Validate against this when the user saves
type ContactDetails = s.Infer<typeof ContactDetails>

// Use this while the form is being filled in
const PartialContactDetails = s.deepPartial(ContactDetails)
type PartialContactDetails = s.Infer<typeof PartialContactDetails>
//   ^?
```
