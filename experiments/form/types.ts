import {
  type ArraySchema,
  type AssetSchema,
  type BlockSchema,
  type BooleanSchema,
  type DocumentSchema,
  type LiteralSchema,
  type NeverSchema,
  type ObjectArraySchema,
  type ObjectLikeSchema,
  type ObjectSchema,
  type ObjectUnionSchema,
  type OptionalSchema,
  type PrimitiveArraySchema,
  type PrimitiveSchema,
  type PrimitiveUnionSchema,
  type ReferenceSchema,
  type Schema,
  type StringSchema,
  type TypedObjectSchema,
} from '../../src/defs'

export type CommonFormOptions = {
  readonly?: boolean
  title?: string
}

export type FieldsetsDef = Todo

export type OptionalFieldOptions<T extends OptionalSchema<any>> =
  T extends OptionalSchema<infer FieldType> ? FieldDef<FieldType> : never

export type FieldDef<T extends Schema> = CommonFormOptions &
  (T extends ObjectSchema
    ? ObjectFormDef<T>
    : T extends ArraySchema<any>
      ? ArrayFormDef<T>
      : T extends StringSchema
        ? StringFormDef<T>
        : T extends LiteralSchema
          ? CommonFormOptions
          : T extends BooleanSchema
            ? CommonFormOptions
            : T extends ObjectUnionSchema<
                  infer UnionTypes extends ObjectUnionMember
                >
              ? ObjectUnionFormDef<UnionTypes>
              : T extends PrimitiveUnionSchema<infer UnionTypes>
                ? PrimitiveUnionFormDef<UnionTypes>
                : T extends OptionalSchema<any>
                  ? OptionalFieldOptions<T>
                  : Schema extends T
                    ? CommonFormOptions
                    : ['TODO', T])

export type ItemOptions<T extends Schema> = T extends ObjectSchema
  ? ObjectFormDef<T>
  : T extends ArraySchema<any>
    ? ArrayFormDef<T>
    : T extends StringSchema
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
  Type extends ObjectLikeSchema | ObjectUnionSchema,
  SearchName extends string,
> =
  Type extends ObjectUnionSchema<infer S>
    ? S extends ObjectLikeSchema
      ? FindTypeByName<S, SearchName>
      : unknown
    : Type extends ObjectSchema<{_type: LiteralSchema<infer TName>}>
      ? SearchName extends TName
        ? Type
        : never
      : Type

export type UnpackShapes<Type extends ObjectLikeSchema | ObjectUnionSchema> =
  Type extends ObjectUnionSchema<infer O>
    ? O extends ObjectSchema
      ? UnpackShapes<O>
      : unknown
    : Type extends ObjectSchema<infer Shape>
      ? Shape
      : never

export type Union = ObjectUnionSchema<
  | ObjectSchema<{_type: LiteralSchema<'foo'>}>
  | ObjectSchema<{_type: LiteralSchema<'bar'>}>
  | ObjectSchema<{_type: LiteralSchema<'object'>; anonymous: BooleanSchema}>
>
export type UnionArray = ObjectArraySchema<Union>

export type ExtractArrayItemTypeNames<T extends ObjectArraySchema> =
  UnpackShapes<T['element']>

export type Pluck<T, K extends keyof any> = K extends keyof T ? T[K] : never
export type GetType<T> =
  T extends LiteralSchema<infer Name>
    ? Name extends string
      ? Name
      : never
    : never

export type NamedTypeMap<T extends ObjectArraySchema> =
  T extends ObjectArraySchema<infer ItemType>
    ? ItemType extends ObjectLikeSchema | ObjectUnionSchema
      ? ItemType
      : never
    : never

export type Simple = ObjectArraySchema<
  ObjectSchema<{_type: LiteralSchema<'foo'>; fooProp: StringSchema}>
>

export type ArrayItemTypeNames<T extends ObjectArraySchema<any>> = GetType<
  Pluck<ExtractArrayItemTypeNames<T>, '_type'>
>

export type ArrayTypeMap<T extends ObjectArraySchema> = {
  [Name in ArrayItemTypeNames<T>]: FindTypeByName<T['element'], Name>
}

export type TypeNames<T extends TypedObjectSchema> = GetType<Pluck<T, '_type'>>

export type ObjectArrayFormDef<TMap extends ArrayTypeMap<any>> =
  CommonFormOptions & {
    draggable?: boolean
    items: {
      [TypeName in keyof TMap]: TMap[TypeName] extends Schema
        ? ItemOptions<TMap[TypeName]>
        : never
    }
  }

export type UnionTypeOptions<T extends Schema> = T extends ObjectSchema
  ? ObjectFormDef<T>
  : unknown

export type PrimitiveUnionTypeOptions<T extends LiteralSchema> =
  CommonFormOptions & T extends LiteralSchema ? FieldDef<T> : unknown

type ObjectUnionMember =
  | TypedObjectSchema
  | ReferenceSchema
  | BlockSchema
  | AssetSchema
  | NeverSchema

export type ObjectUnionFormDef<T extends ObjectUnionMember> =
  CommonFormOptions & {
    types: {
      [
        Name in GetType<Exclude<T, NeverSchema>['shape']['_type']>
      ]: UnionTypeOptions<FindTypeByName<Exclude<T, NeverSchema>, Name>>
    }
  }

export type PrimitiveUnionFormDef<
  T extends PrimitiveSchema | LiteralSchema | NeverSchema,
> = CommonFormOptions & T extends LiteralSchema
  ? {
      types: {
        [Name in GetType<T>]: PrimitiveUnionTypeOptions<LiteralSchema<Name>>
      }
    }
  : {
      types: ['TODO']
    }

export type PrimitiveArrayFormDef<_T extends PrimitiveArraySchema> =
  CommonFormOptions & {
    draggable?: boolean
  }

export type StringFormDef<_T extends StringSchema> = CommonFormOptions & {
  multiline?: boolean
}

export type ArrayFormDef<T extends ArraySchema<any>> =
  T extends ObjectArraySchema
    ? ObjectArrayFormDef<ArrayTypeMap<T>>
    : T extends PrimitiveArraySchema
      ? PrimitiveArrayFormDef<T>
      : never

export type Todo = unknown

export type ObjectFormDef<T extends ObjectSchema> = CommonFormOptions & {
  title?: string
  fieldsets?: FieldsetsDef
  fields: Omit<
    {[Key in keyof T['shape']]: FieldDef<T['shape'][Key]>},
    SystemFields
  >
}

export type DocumentFormDef<T extends DocumentSchema> = CommonFormOptions & {
  liveEdit?: boolean
  fieldsets?: FieldsetsDef
  fields: Omit<{[k in keyof T['shape']]: FieldDef<T['shape'][k]>}, SystemFields>
}

export type FormDef<T extends Schema> = T extends DocumentSchema
  ? DocumentFormDef<T>
  : T extends ObjectSchema
    ? ObjectFormDef<T>
    : T extends ObjectArraySchema
      ? ObjectArrayFormDef<ArrayTypeMap<T>>
      : T extends PrimitiveArraySchema
        ? PrimitiveArrayFormDef<T>
        : T extends StringSchema
          ? StringFormDef<T>
          : T extends ObjectUnionSchema<infer U extends ObjectUnionMember>
            ? ObjectUnionFormDef<U>
            : {title?: string}
