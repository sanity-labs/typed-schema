/**
 *  Generic utility types
 */

/**
 * Combines two object types into a single, uniform type instead of an intersection of the two
 */
export type Combine<A, B> = {
  [K in keyof A]: K extends keyof B ? B[K] : A[K]
} & B extends infer O
  ? {[K in keyof O]: O[K]}
  : never

/**
 * Flattens an intersection object type into a single object type. Unlike
 * {@link Combine} it is a plain mapped type, which TypeScript resolves lazily,
 * so it is safe to use on the output of recursive schemas.
 *
 * The `& {}` is there for display: a bare mapped type keeps a reference to this
 * alias, so editor hovers and declaration files would show
 * `Flatten<{...} & {...}>`. TypeScript drops the intersection with `{}` and the
 * resulting type has no alias, so it prints as a plain object type.
 */
export type Flatten<T> = {[K in keyof T]: T[K]} & {}

/**
 * Formats an intersection object type, so it outputs as `{"foo": 1, "bar": 1}` instead of `{"foo": 1} & {"bar": 2}`
 */
export type Format<A> = A extends {[Key in keyof A]: A[Key]}
  ? {[Key in keyof A]: A[Key]}
  : A

export type ExtendsNever<T> = [T] extends [never] ? true : false

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type OutputFormatFix = {}

type AZ =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'

type Digits = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

type ValidFieldChar = AZ | '_' | Digits
type ValidFirstChar = AZ

type GetFirstChar<T extends string> =
  T extends `${infer First}${infer _Remainder}` ? First : T

type ValidFieldChars<T extends string> = T extends ''
  ? true
  : T extends `${infer First}${infer Remainder}`
    ? Uppercase<First> extends ValidFieldChar
      ? ValidFieldChars<Remainder>
      : false
    : never

declare const schemaError: unique symbol

/**
 * The expected type at a spot where a schema breaks a rule, in place of
 * `never`. No value has the `unique symbol` key, so the check always fails,
 * and the type error names `SchemaError` and shows `Message`. Unlike a bare
 * string literal, it does not collapse to `never` when intersected with a
 * primitive.
 */
export type SchemaError<Message extends string> = {
  readonly [schemaError]: Message
}

/**
 * Resolves to a message saying why `Name` is not a valid field name, `never`
 * if it is valid.
 */
export type FieldNameError<Name extends PropertyKey> = Name extends number
  ? FieldNameError<`${Name}`>
  : Name extends string
    ? Name extends `_${string}`
      ? `Field name '${Name}' is reserved: names starting with '_' are for system fields`
      : Uppercase<GetFirstChar<Name>> extends ValidFirstChar
        ? ValidFieldChars<Name> extends true
          ? never
          : `Field name '${Name}' can only contain letters A-Z, digits and underscores`
        : `Field name '${Name}' must start with a letter A-Z`
    : 'Field names must be strings'

/**
 * Resolves to the field name if it is valid for a Sanity object field (starts
 * with a letter A-Z and contains only letters A-Z, digits and `_`), `never`
 * otherwise.
 * Field names starting with `_` are reserved for system fields.
 */
export type ValidFieldName<T extends keyof any> = T extends string
  ? [FieldNameError<T>] extends [never]
    ? T
    : never
  : never

export type ElementType<A extends any[] | readonly any[]> =
  A extends readonly (infer T)[] ? T : never

export type RequireSome<T, K extends keyof T> = Omit<T, K> & {[P in K]-?: T[P]}

export type XOR<T, U> = T | U extends object
  ?
      | (T & {[K in Exclude<keyof U, keyof T>]?: never})
      | (U & {[K in Exclude<keyof T, keyof U>]?: never})
  : T | U
