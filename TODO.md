# Todo

## Schema types

- [x] primitive types
- [x] literal type
- [x] document
- [x] reference
- [x] object
- [x] array (of both primitives and objects and unions of either primitives or typed objects)
- [x] union
- [x] recursive types
- [x] image
- [x] file
- [x] date + datetime
- [ ] other string derivatives: text, email, url (probably best solved by [_refinement_](https://zod.dev/?id=refine))
- [x] block array / portable text

## Schema type features

- [ ] **Parse error formatters**:
      Parse errors are currently represented as a content structure containing array of node paths and errors - there should be some basic utils for formatting these nicely
  - [ ] Terminal (optionally w/colors)
  - [ ] React
  - [ ] Plain HTML
- [x] Life cycle augmentations

  - [x] Draft
  - [x] Published
  - [x] Stored

- [ ] **Serializer (maybe even deserializer)**
  - Serialize TS schema to JSON (easy except for lazy/recursive types), potentially also from JSON to TS schemas too (this might be pretty tricky!)
-
- [ ] **Validation**
      A lot of validation is taken care of by the type system already, but we still need things like:
  - [ ] numbers min/max, decimals, etc
  - [ ] string: max/min length, regex, etc.
  - [ ] array: min, max entries
        In addition, validation needs the following
  - [ ] custom validation rules with custom messages (or i18n-keys)
- [ ] Transformations
- [ ] Refinements
- [x] Partial / deep partial and required/deep required objects
- [ ] Async validations (or perhaps these could be modelled separately as more of "linter" style checks, that can also provide autofix features)

## Forms

Forms need to have the same feature set as current sanity schemas (although without the type aspect)

- [ ] Initial values
- [ ] Conditional fields
- [ ] Field groups
- [ ] Components maps (field, input)

## Compatibility layer

- [ ] [partially supported] implement a function taking a new schema + form as input and convert it to a sanity schema compatible with v3
- [ ] Codemod/migrator from classic (v3) style schema to ts-first schema + form definition
