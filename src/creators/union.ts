import {
  isAssetSchema,
  isDocumentSchema,
  isDocumentUnionSchema,
  isLazySchema,
  isLiteralSchema,
  isNeverSchema,
  isObjectUnionSchema,
  isPrimitiveSchema,
  isPrimitiveUnionSchema,
  isReferenceSchema,
  isTypedObjectSchema,
} from '../asserters'
import {
  type DocumentSchemaOf,
  type DocumentUnionKind,
  type DocumentUnionMemberKind,
  type DocumentUnionSchema,
  type LazySchema,
  type LiteralSchema,
  type NeverSchema,
  type ObjectUnionMemberKind,
  type ObjectUnionSchema,
  type OutputOf,
  type PrimitiveSchema,
  type PrimitiveUnionSchema,
  type ReferenceSchema,
  type Schema,
  type SchemaAnnotations,
  type SchemaKind,
  type TypedObjectSchema,
} from '../defs'
import {defineType} from '../helpers/defineType'
import {listReferenceTargets} from '../helpers/referenceTargets'
import {
  type AnnotationsError,
  type CheckUnionMembers,
  type UncountedReferences,
} from '../helpers/schemaErrors'
import {reference} from './reference'

export type FlattenUnionTypes<
  T extends ObjectUnionMemberKind | ObjectUnionSchema<any>,
> =
  T extends ObjectUnionSchema<infer UnionTypes>
    ? UnionTypes extends ObjectUnionSchema<any>
      ? FlattenUnionTypes<UnionTypes>
      : Exclude<UnionTypes, NeverSchema>
    : T

export type FlattenPrimitiveUnionTypes<
  T extends
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema<any>
    | NeverSchema,
> =
  T extends PrimitiveUnionSchema<infer UnionTypes>
    ? UnionTypes extends PrimitiveUnionSchema<any>
      ? FlattenPrimitiveUnionTypes<UnionTypes>
      : UnionTypes
    : T

/**
 * The members of a document union: nested document unions flattened, and
 * `never()` left out. Matches on `typeName`, see `defs.ts`.
 */
type FlattenDocumentUnionTypes<T> = T extends {
  typeName: 'documentUnion'
  union: readonly (infer Member)[]
}
  ? Member
  : Exclude<T, NeverSchema>

/**
 * `Target` as a document union member. A document or lazy document is
 * returned as is. A schema typed by its value (`Schema<Person>`), directly
 * or inside `lazy()`, becomes a `DocumentSchemaOf` of that value;
 * `reference()` checks at runtime that it is a document.
 */
type AsDocumentUnionMember<Target> = Target extends DocumentUnionMemberKind
  ? Target
  : Target extends LazySchema<infer Inner>
    ? LazySchema<DocumentSchemaOf<OutputOf<Inner>>>
    : Target extends Schema<infer Value>
      ? DocumentSchemaOf<Value>
      : never

/**
 * `true` if `Member` is a `reference()` or a union with a `reference()`
 * member. Checks `typeName` only, so it never reads the referenced schemas.
 */
type HasReference<Member> = Member extends {typeName: 'reference'}
  ? true
  : Member extends {typeName: 'union'; union: readonly (infer Inner)[]}
    ? [Extract<Inner, {typeName: 'reference'}>] extends [never]
      ? false
      : true
    : false

/** `true` if more than one of the members of the tuple `Members` is or has a `reference()` */
type HasSeveralReferences<
  Members,
  Seen extends boolean = false,
> = Members extends readonly [infer Member, ...infer Rest]
  ? HasReference<Member> extends true
    ? Seen extends true
      ? true
      : HasSeveralReferences<Rest, true>
    : HasSeveralReferences<Rest, Seen>
  : false

/** The documents a reference points to: its target, or the members of its union */
type ReferenceTargetsOf<Reference> = Reference extends {
  referenceType: infer Target
}
  ? AsDocumentUnionMember<FlattenDocumentUnionTypes<Target>>
  : never

/**
 * `Members` with every `reference()` replaced by one reference to a union of
 * their targets, as `union()` does at runtime
 */
type MergeReferences<Members> =
  | Exclude<Members, {typeName: 'reference'}>
  | ReferenceSchema<
      DocumentUnionSchema<
        ReferenceTargetsOf<Extract<Members, {typeName: 'reference'}>>
      >
    >

/** The members of the object union `union()` returns for `Members` */
type ObjectUnionMembers<
  Members extends readonly (ObjectUnionMemberKind | ObjectUnionSchema<any>)[],
> =
  HasSeveralReferences<Members> extends true
    ? MergeReferences<FlattenUnionTypes<Members[number]>>
    : FlattenUnionTypes<Members[number]>

// A union of typed objects, blocks, images and files without references, as
// a plain array: generic code (`union(xs)` with `xs: T[]`) matches here,
// since the check on the overload below cannot resolve for a type parameter
export function union<
  UnionTypes extends
    | TypedObjectSchema
    | (Schema & {typeName: 'block' | 'image' | 'file'})
    | NeverSchema,
>(
  unionTypes: UnionTypes[],
  annotations?: NoInfer<
    SchemaAnnotations<
      OutputOf<ObjectUnionSchema<Exclude<UnionTypes, NeverSchema>>>
    >
  >,
): ObjectUnionSchema<Exclude<UnionTypes, NeverSchema>>
// A union of typed objects, references, blocks, images and files. A reference
// value does not say which type of document it points to, so a union could
// not tell several references apart. `union()` merges them into one
// reference to a union of their targets: `union([reference(A),
// reference(B)])` is `reference(union([A, B]))`. `Members` is a tuple type so
// that the references can be counted; an array of unknown length that has
// references is rejected by `UncountedReferences`.
export function union<
  const Members extends readonly (
    | ObjectUnionMemberKind
    | ObjectUnionSchema<any>
  )[],
>(
  unionTypes: Members & NoInfer<UncountedReferences<Members>>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<ObjectUnionSchema<ObjectUnionMembers<Members>>>>
  >,
): ObjectUnionSchema<ObjectUnionMembers<Members>>
// A union of documents. Lazy documents are accepted by the constraint alone,
// without a check that would resolve them: TypeScript is still inferring a
// document that references itself through a getter when it checks this
// call. A schema typed by its value must be typed as `DocumentSchemaOf` to
// be a member, since a `Schema<Value>` may be an object at runtime.
export function union<
  const Members extends readonly (
    | DocumentUnionMemberKind
    | DocumentUnionKind
    | NeverSchema
  )[],
>(
  unionTypes: Members,
  annotations?: NoInfer<
    SchemaAnnotations<
      OutputOf<DocumentUnionSchema<FlattenDocumentUnionTypes<Members[number]>>>
    >
  >,
): DocumentUnionSchema<FlattenDocumentUnionTypes<Members[number]>>
export function union<
  UnionTypes extends
    | NeverSchema
    | PrimitiveSchema
    | LiteralSchema
    | PrimitiveUnionSchema<any>,
>(
  unionTypes: UnionTypes[],
  annotations?: NoInfer<
    SchemaAnnotations<
      OutputOf<PrimitiveUnionSchema<FlattenPrimitiveUnionTypes<UnionTypes>>>
    >
  >,
): PrimitiveUnionSchema<FlattenPrimitiveUnionTypes<UnionTypes>>
// Matches only what the overloads above reject, and its parameter can never be
// satisfied. TypeScript 7 reports only the last overload's error, which says
// what is wrong with the members. TypeScript 6 lists every overload's error,
// ending with this one.
export function union<const Members extends readonly SchemaKind[]>(
  unionTypes: Members & NoInfer<CheckUnionMembers<Members>>,
  annotations?: AnnotationsError<'union'>,
): never
export function union(unionTypes: Schema[], annotations?: any): unknown {
  if (
    unionTypes.every(
      schema =>
        isLiteralSchema(schema) ||
        isPrimitiveSchema(schema) ||
        isNeverSchema(schema) ||
        isPrimitiveUnionSchema(schema),
    )
  ) {
    return defineType(
      {
        typeName: 'primitiveUnion',
        union: unionTypes.filter(schema => !isNeverSchema(schema)),
      },
      annotations,
    )
  }

  const members = unionTypes.filter(schema => !isNeverSchema(schema))
  if (members.every(isDocumentUnionMember)) {
    return defineType({typeName: 'documentUnion', union: members}, annotations)
  }
  if (members.every(isObjectUnionMember)) {
    return defineType(
      {
        typeName: 'union',
        union:
          members.filter(hasReference).length > 1
            ? mergeReferences(members)
            : members,
      },
      annotations,
    )
  }
  if (members.some(isDocumentUnionMember)) {
    throw new Error(
      members.some(isLazySchema)
        ? 'union() members cannot mix documents and other object types (lazy() members must be documents)'
        : 'union() members cannot mix documents and other object types',
    )
  }
  throw new Error(
    'Union types must either be of primitive values or typed objects',
  )
}

/**
 * Whether `schema` can be a member of a document union. Any `lazy()` is
 * accepted, since resolving it here would break a document that references
 * itself; the types allow only lazy documents.
 */
function isDocumentUnionMember(schema: Schema): boolean {
  return (
    isDocumentSchema(schema) ||
    isLazySchema(schema) ||
    isDocumentUnionSchema(schema)
  )
}

/** Whether `schema` can be a member of an object union */
function isObjectUnionMember(schema: Schema): boolean {
  return (
    // documents have a `_type` literal too, but go in a document union
    (isTypedObjectSchema(schema) && !isDocumentSchema(schema)) ||
    isObjectUnionSchema(schema) ||
    isReferenceSchema(schema) ||
    isAssetSchema(schema)
  )
}

/** Whether `schema` is a `reference()` or a union that has a `reference()` member */
function hasReference(schema: Schema): boolean {
  return (
    isReferenceSchema(schema) ||
    (isObjectUnionSchema(schema) && schema.union.some(hasReference))
  )
}

const MERGE_ANNOTATIONS_ERROR =
  'union() combines several reference() members into one reference, so they, the unions they point to, and any nested union() that contains them cannot have annotations. Annotate a single reference(union([...])) instead'

/**
 * Flattens a nested union that has a reference, and any unions with
 * references nested inside it. Throws if any of them has annotations.
 */
function flattenReferenceUnion(schema: ObjectUnionSchema): Schema[] {
  if (schema.annotations) {
    throw new Error(MERGE_ANNOTATIONS_ERROR)
  }
  return schema.union.flatMap(member =>
    isObjectUnionSchema(member) && hasReference(member)
      ? flattenReferenceUnion(member)
      : [member],
  )
}

/**
 * Replaces the references among `members`, including those in nested unions,
 * with one reference to a union of their targets, at the position of the
 * first reference
 */
function mergeReferences(members: Schema[]): Schema[] {
  const flat = members.flatMap(member =>
    isObjectUnionSchema(member) && hasReference(member)
      ? flattenReferenceUnion(member)
      : [member],
  )
  const references = flat.filter(isReferenceSchema)
  if (
    references.some(
      member =>
        member.annotations ||
        (isDocumentUnionSchema(member.referenceType) &&
          member.referenceType.annotations),
    )
  ) {
    throw new Error(MERGE_ANNOTATIONS_ERROR)
  }
  const targets = Array.from(
    new Set(
      references.flatMap(member => listReferenceTargets(member.referenceType)),
    ),
  )
  const merged = reference(union(targets as any) as any)
  const first = flat.indexOf(references[0]!)
  return flat.flatMap((member, index) =>
    index === first ? [merged] : isReferenceSchema(member) ? [] : [member],
  )
}
