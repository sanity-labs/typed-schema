# Custom creators

The built-in creators (`object()`, `array()`, `block()`, ...) are ordinary functions that return schemas. When the same structure appears in several places with different contents, write a creator of your own the same way.

## Example: a table creator

A table is a list of rows, each holding a list of cells. Since Sanity does not allow arrays of arrays, each row is an object. Like `block()`, `table()` takes an options object: an optional `_type` that defaults to `table`, and the schema for a cell, which can be any object or primitive schema, but not another array:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

function table<
  CellType extends
    | s.ObjectLikeSchema
    | s.ObjectUnionSchema
    | s.PrimitiveSchema
    | s.PrimitiveUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return s.object({
    _type: (options._type ?? s.literal('table')) as TypeName,
    rows: s.array(s.object({cells: s.array(options.cell)})),
  })
}

const Session = s.object({
  _type: s.literal('session'),
  title: s.string(),
  room: s.string(),
})

// sessions by time slot and track
const Timetable = table({_type: s.literal('timetable'), cell: Session})

type Timetable = s.Infer<typeof Timetable>
//   ^?

const NumberGrid = table({_type: s.literal('numberGrid'), cell: s.number()})

type NumberGrid = s.Infer<typeof NumberGrid>
//   ^?
```

## Build on other creators

A creator can call another one to narrow what it accepts. `objectTable()` is a `table()` that only accepts object cells. `emailTable()` fixes both the cell and the type name, so callers pass nothing:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

function table<
  CellType extends
    | s.ObjectLikeSchema
    | s.ObjectUnionSchema
    | s.PrimitiveSchema
    | s.PrimitiveUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return s.object({
    _type: (options._type ?? s.literal('table')) as TypeName,
    rows: s.array(s.object({cells: s.array(options.cell)})),
  })
}

// ---cut---
// table() is the creator from the example above

function objectTable<
  CellType extends s.TypedObjectSchema | s.ObjectUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return table(options)
}

function emailTable() {
  return table({_type: s.literal('emailTable'), cell: s.string()})
}

const Measurement = s.object({
  _type: s.literal('measurement'),
  value: s.number(),
  unit: s.string(),
})
const Note = s.object({_type: s.literal('note'), text: s.string()})

const MeasurementTable = objectTable({
  _type: s.literal('measurementTable'),
  cell: Measurement,
})

type MeasurementTable = s.Infer<typeof MeasurementTable>
//   ^?

// measurements, with notes such as "not measured" in some cells
const ResultsTable = objectTable({
  _type: s.literal('resultsTable'),
  cell: s.union([Measurement, Note]),
})

type ResultsTable = s.Infer<typeof ResultsTable>
//   ^?

const Contacts = emailTable()

type Contacts = s.Infer<typeof Contacts>
//   ^?
```

## Constrain options with schema types

Give each schema option a type parameter constrained by one of the library's schema types, such as `TypedObjectSchema` (an object with a `_type` literal), `ObjectUnionSchema` (a union of those) or `PrimitiveSchema` (a string, number, boolean, date, date-time or literal). The inferred type then follows whatever schema the caller passes, and passing the wrong kind of schema is a type error at the call site:

```ts twoslash
// @errors: 2322
import * as s from '@sanity-labs/typed-schema'

function table<
  CellType extends
    | s.ObjectLikeSchema
    | s.ObjectUnionSchema
    | s.PrimitiveSchema
    | s.PrimitiveUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return s.object({
    _type: (options._type ?? s.literal('table')) as TypeName,
    rows: s.array(s.object({cells: s.array(options.cell)})),
  })
}

function objectTable<
  CellType extends s.TypedObjectSchema | s.ObjectUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return table(options)
}

// ---cut---
// table() and objectTable() are the creators from the examples above

const Tags = objectTable({cell: s.string()})
```

## Name each use

Every call to a creator returns a new schema, so two tables with the default `_type` are two declarations of the type name `table`, which [`verifyUniqueTypeNames`](./graphql) rejects. Pass a `_type` to each table that holds different cells:

```ts twoslash
import * as s from '@sanity-labs/typed-schema'

function table<
  CellType extends
    | s.ObjectLikeSchema
    | s.ObjectUnionSchema
    | s.PrimitiveSchema
    | s.PrimitiveUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return s.object({
    _type: (options._type ?? s.literal('table')) as TypeName,
    rows: s.array(s.object({cells: s.array(options.cell)})),
  })
}

function objectTable<
  CellType extends s.TypedObjectSchema | s.ObjectUnionSchema,
  TypeName extends s.LiteralSchema<string> = s.LiteralSchema<'table'>,
>(options: {_type?: TypeName; cell: CellType}) {
  return table(options)
}

// ---cut---
// table() and objectTable() are the creators from the examples above

const Measurement = s.object({
  _type: s.literal('measurement'),
  value: s.number(),
  unit: s.string(),
})
const Note = s.object({_type: s.literal('note'), text: s.string()})

const Experiment = s.verifyUniqueTypeNames(
  s.document({
    _type: s.literal('experiment'),
    measurements: objectTable({
      _type: s.literal('measurementTable'),
      cell: Measurement,
    }),
    results: objectTable({
      _type: s.literal('resultsTable'),
      cell: s.union([Measurement, Note]),
    }),
  }),
)

type Experiment = s.Infer<typeof Experiment>
```

To use the same table in more than one place, call the creator once and reuse the schema it returns.
