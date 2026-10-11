import {
  type SanityAny,
  type SanityArray,
  type SanityAsset,
  type SanityBlock,
  type SanityBoolean,
  type SanityDocument,
  type SanityLiteral,
  type SanityNever,
  type SanityObject,
  type SanityObjectArray,
  type SanityObjectLike,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityPrimitive,
  type SanityPrimitiveArray,
  type SanityPrimitiveUnion,
  type SanityReference,
  type SanityString,
  type SanityType,
  type SanityTypedObject,
} from '../../src/defs'

export type CommonFormOptions = {
  readonly?: boolean
  title?: string
}

export type FieldsetsDef = Todo

export type OptionalFieldOptions<T extends SanityOptional<any>> =
  T extends SanityOptional<infer FieldType> ? FieldDef<FieldType> : never

export type FieldDef<T extends SanityType> = CommonFormOptions &
  (T extends SanityObject
    ? ObjectFormDef<T>
    : T extends SanityArray<any>
      ? ArrayFormDef<T>
      : T extends SanityString
        ? StringFormDef<T>
        : T extends SanityLiteral
          ? CommonFormOptions
          : T extends SanityBoolean
            ? CommonFormOptions
            : T extends SanityObjectUnion<
                  infer UnionTypes extends ObjectUnionMember
                >
              ? ObjectUnionFormDef<UnionTypes>
              : T extends SanityPrimitiveUnion<infer UnionTypes>
                ? PrimitiveUnionFormDef<UnionTypes>
                : T extends SanityOptional<any>
                  ? OptionalFieldOptions<T>
                  : SanityAny extends T
                    ? CommonFormOptions
                    : ['TODO', T])

export type ItemOptions<T extends SanityType> = T extends SanityObject
  ? ObjectFormDef<T>
  : T extends SanityArray<any>
    ? ArrayFormDef<T>
    : T extends SanityString
      ? StringFormDef<T>
      : unknown

export type SystemFields =
  | '_type'
  | '_id'
  | '_createdAt'
  | '_updatedAt'
  | '_rev'
  | '_key'

export type FindTypeByName<
  Type extends SanityObjectLike | SanityObjectUnion,
  SearchName extends string,
> =
  Type extends SanityObjectUnion<infer S>
    ? S extends SanityObjectLike
      ? FindTypeByName<S, SearchName>
      : unknown
    : Type extends SanityObject<{_type: SanityLiteral<infer TName>}>
      ? SearchName extends TName
        ? Type
        : never
      : Type

export type UnpackShapes<Type extends SanityObjectLike | SanityObjectUnion> =
  Type extends SanityObjectUnion<infer O>
    ? O extends SanityObject
      ? UnpackShapes<O>
      : unknown
    : Type extends SanityObject<infer Shape>
      ? Shape
      : never

export type Union = SanityObjectUnion<
  | SanityObject<{_type: SanityLiteral<'foo'>}>
  | SanityObject<{_type: SanityLiteral<'bar'>}>
  | SanityObject<{_type: SanityLiteral<'object'>; anonymous: SanityBoolean}>
>
export type UnionArray = SanityObjectArray<Union>

export type ExtractArrayItemTypeNames<T extends SanityObjectArray> =
  UnpackShapes<T['element']>

export type Pluck<T, K extends keyof any> = K extends keyof T ? T[K] : never
export type GetType<T> =
  T extends SanityLiteral<infer Name>
    ? Name extends string
      ? Name
      : never
    : never

export type NamedTypeMap<T extends SanityObjectArray> =
  T extends SanityObjectArray<infer ItemType>
    ? ItemType extends SanityObjectLike | SanityObjectUnion
      ? ItemType
      : never
    : never

export type Simple = SanityObjectArray<
  SanityObject<{_type: SanityLiteral<'foo'>; fooProp: SanityString}>
>

export type ArrayItemTypeNames<T extends SanityObjectArray<any>> = GetType<
  Pluck<ExtractArrayItemTypeNames<T>, '_type'>
>

export type ArrayTypeMap<T extends SanityObjectArray> = {
  [Name in ArrayItemTypeNames<T>]: FindTypeByName<T['element'], Name>
}

export type TypeNames<T extends SanityTypedObject> = GetType<Pluck<T, '_type'>>

export type ObjectArrayFormDef<TMap extends ArrayTypeMap<any>> =
  CommonFormOptions & {
    draggable?: boolean
    items: {
      [TypeName in keyof TMap]: TMap[TypeName] extends SanityType
        ? ItemOptions<TMap[TypeName]>
        : never
    }
  }

export type UnionTypeOptions<T extends SanityType> = T extends SanityObject
  ? ObjectFormDef<T>
  : unknown

export type PrimitiveUnionTypeOptions<T extends SanityLiteral> =
  CommonFormOptions & T extends SanityLiteral ? FieldDef<T> : unknown

type ObjectUnionMember =
  | SanityTypedObject
  | SanityReference
  | SanityBlock
  | SanityAsset
  | SanityNever

export type ObjectUnionFormDef<T extends ObjectUnionMember> =
  CommonFormOptions & {
    types: {
      [
        Name in GetType<Exclude<T, SanityNever>['shape']['_type']>
      ]: UnionTypeOptions<FindTypeByName<Exclude<T, SanityNever>, Name>>
    }
  }

export type PrimitiveUnionFormDef<
  T extends SanityPrimitive | SanityLiteral | SanityNever,
> = CommonFormOptions & T extends SanityLiteral
  ? {
      types: {
        [Name in GetType<T>]: PrimitiveUnionTypeOptions<SanityLiteral<Name>>
      }
    }
  : {
      types: ['TODO']
    }

export type PrimitiveArrayFormDef<_T extends SanityPrimitiveArray> =
  CommonFormOptions & {
    draggable?: boolean
  }

export type StringFormDef<_T extends SanityString> = CommonFormOptions & {
  multiline?: boolean
}

export type ArrayFormDef<T extends SanityArray<any>> =
  T extends SanityObjectArray
    ? ObjectArrayFormDef<ArrayTypeMap<T>>
    : T extends SanityPrimitiveArray
      ? PrimitiveArrayFormDef<T>
      : never

export type Todo = unknown

export type ObjectFormDef<T extends SanityObject> = CommonFormOptions & {
  title?: string
  fieldsets?: FieldsetsDef
  fields: Omit<
    {[Key in keyof T['shape']]: FieldDef<T['shape'][Key]>},
    SystemFields
  >
}

export type DocumentFormDef<T extends SanityDocument> = CommonFormOptions & {
  liveEdit?: boolean
  fieldsets?: FieldsetsDef
  fields: Omit<{[k in keyof T['shape']]: FieldDef<T['shape'][k]>}, SystemFields>
}

export type SanityFormDef<T extends SanityType> = T extends SanityDocument
  ? DocumentFormDef<T>
  : T extends SanityObject
    ? ObjectFormDef<T>
    : T extends SanityObjectArray
      ? ObjectArrayFormDef<ArrayTypeMap<T>>
      : T extends SanityPrimitiveArray
        ? PrimitiveArrayFormDef<T>
        : T extends SanityString
          ? StringFormDef<T>
          : T extends SanityObjectUnion<infer U extends ObjectUnionMember>
            ? ObjectUnionFormDef<U>
            : {title?: string}
