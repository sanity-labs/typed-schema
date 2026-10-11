---
'@sanity-labs/typed-schema': patch
---

The type of an object array's `element` now includes the `_key` field that `array()` adds to it at runtime (to every member, for a union). For `const Pets = array(Pet)`, `Infer<typeof Pets.element>` used to leave `_key` out.
