import {isNeverSchema, isObjectSchema, isObjectUnionSchema} from '../asserters'
import {
  type DocumentSchema,
  type DocumentSchemaOf,
  type ObjectSchema,
  type ObjectSchemaOf,
  type ObjectShape,
  type ObjectUnionKind,
  type ObjectUnionMemberKind,
  type ObjectUnionSchema,
  type OutputFromShape,
  type Schema,
  type TypedObjectSchema,
} from '../defs'
import {withoutExamples} from '../helpers/annotations'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {
  type ExtendSourceError,
  type ExtendTypeFieldError,
  type FieldErrors,
} from '../helpers/schemaErrors'
import {type Combine, type Flatten} from '../helpers/utilTypes'

/**
 * The shape of `Shape` with the fields of `Augmentation` added or replaced.
 * A mapped type rather than {@link Combine}, so fields declared with getters
 * are not read and recursive extensions infer.
 */
type ExtendShape<Shape, Augmentation> = Flatten<
  Omit<Shape, keyof Augmentation> & Augmentation
>

/**
 * What `extend()` accepts: an object, a document, or a `union()` of objects.
 * Matches a union by `typeName` only; a parameter typed as a plain
 * `ObjectUnionSchema` is rejected at the call, since its members may be
 * references, blocks, images or files. Type it as
 * `ObjectUnionSchema<TypedObjectSchema>` to accept any union of objects.
 */
export type ExtendSource = ObjectSchema | DocumentSchema | ObjectUnionKind

/** `extend()` applied to an object or document schema */
type ExtendObject<
  Obj extends ObjectSchema | DocumentSchema,
  Augmentation extends {[key: string]: any},
> =
  Obj extends ObjectSchema<infer Shape>
    ? ObjectShape extends Shape
      ? ObjectSchemaOf<Combine<Obj['output'], OutputFromShape<Augmentation>>>
      : ObjectSchema<ExtendShape<Shape, Augmentation>>
    : Obj extends DocumentSchema<infer Shape>
      ? ObjectShape extends Shape
        ? DocumentSchemaOf<
            Combine<Obj['output'], OutputFromShape<Augmentation>>
          >
        : DocumentSchema<ExtendShape<Shape, Augmentation>>
      : never

/**
 * `extend()` applied to each member of an object union. Distributes over the
 * members, so each keeps its own `_type` literal. Members that are not
 * objects are left out here; `ExtendSourceError` rejects such a union at the
 * call site.
 */
type ExtendUnion<
  Union extends ObjectUnionKind,
  Augmentation extends {[key: string]: any},
> =
  Union extends ObjectUnionSchema<infer Members>
    ? ObjectUnionSchema<
        Extract<
          ExtendObject<Extract<Members, ObjectSchema>, Augmentation>,
          ObjectUnionMemberKind
        >
      >
    : never

/**
 * The schema `extend()` returns: `Obj` with the fields of `Augmentation`
 * added or replaced. For a `union()`, each member is extended.
 */
export type Extends<
  Obj extends ExtendSource,
  Augmentation extends {[key: string]: any},
> = Obj extends ObjectUnionKind
  ? ExtendUnion<Obj, Augmentation>
  : Obj extends ObjectSchema | DocumentSchema
    ? ExtendObject<Obj, Augmentation>
    : never

/**
 * Returns a new schema with the fields of `shape` added to `source`, replacing
 * any fields of the same name. The annotations of `source` are kept, except
 * `examples`, which are values of the schema without the new fields.
 *
 * `source` can be an `object()`, a `document()`, or a `union()` of objects.
 * On a union, the fields are added to every member, each keeping its own
 * `_type` literal: a page builder's section types can share an `anchor`
 * field this way without extending them one by one. A union with a
 * `reference()`, `block()`, `image()` or `file()` member is a type error and
 * throws at runtime: those types have fixed shapes. Replacing `_type` on a
 * union is a type error and throws too, since the members would no longer
 * be told apart.
 *
 * @param source - the schema to extend
 * @param shape - the fields to add or replace
 */
/** The system fields `shape` may replace on `Obj` */
type ReplaceableSystemFields<Obj> = Obj extends DocumentSchema
  ? '_id' | '_type'
  : '_type'

// An object, a document, or a union of objects. Generic code (`extend(u,
// ...)` with `u: T`) matches here, since the check on the overload below
// cannot resolve for a type parameter.
export function extend<
  Obj extends
    | ObjectSchema
    | DocumentSchema
    | ObjectUnionSchema<TypedObjectSchema>,
  // Not `ObjectShape`: checking the field types would read fields
  // declared with getters and break recursive extensions
  Shape extends {[key: string]: any},
>(
  source: Obj,
  shape: Shape &
    NoInfer<
      FieldErrors<Shape, ReplaceableSystemFields<Obj>> &
        ExtendTypeFieldError<Obj, Shape>
    >,
): Extends<Obj, Shape>
// Matches only what the overload above rejects: a union with a member that
// cannot be extended, reported by `ExtendSourceError`
export function extend<
  Obj extends ExtendSource,
  Shape extends {[key: string]: any},
>(
  source: Obj & NoInfer<ExtendSourceError<Obj>>,
  shape: Shape &
    NoInfer<
      FieldErrors<Shape, ReplaceableSystemFields<Obj>> &
        ExtendTypeFieldError<Obj, Shape>
    >,
): Extends<Obj, Shape>
export function extend(source: Schema, shape: {[key: string]: any}): Schema {
  const fields = deferGetters(shape)
  return isObjectUnionSchema(source)
    ? extendUnion(source, fields)
    : extendObject(source as ObjectSchema | DocumentSchema, fields)
}

// `extendObject` and `extendUnion` build through `defineType`, since a spread
// drops the non-enumerable `output` and `~standard` properties of `source`
function extendObject(
  source: ObjectSchema | DocumentSchema,
  fields: ObjectShape,
): Schema {
  const {annotations: _annotations, ...rest} = source
  return defineType(
    {...rest, shape: {...source.shape, ...fields}},
    withoutExamples(source.annotations),
  )
}

function extendUnion(source: ObjectUnionSchema, fields: ObjectShape): Schema {
  if ('_type' in fields) {
    throw new Error(
      'extend() cannot replace _type on a union(): its members are told apart by their _type literals',
    )
  }
  const {annotations: _annotations, ...rest} = source
  return defineType(
    {...rest, union: source.union.map(member => extendMember(member, fields))},
    withoutExamples(source.annotations),
  )
}

function extendMember(member: Schema, fields: ObjectShape): Schema {
  if (isNeverSchema(member)) {
    return member
  }
  if (isObjectUnionSchema(member)) {
    return extendUnion(member, fields)
  }
  if (isObjectSchema(member)) {
    return extendObject(member, fields)
  }
  throw new Error(
    `extend() can only extend a union() of objects, not one with ${member.typeName}() members`,
  )
}
