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

type ValidFieldChar = AZ | '_' | '-' | Digits
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

/**
 * Resolves to the field name if it is valid for a Sanity object field (starts
 * with a letter, contains only letters, digits, `_` and `-`), `never` otherwise.
 * Field names starting with `_` are reserved for system fields.
 */
export type ValidFieldName<T extends keyof any> = T extends string
  ? Uppercase<GetFirstChar<T>> extends ValidFirstChar
    ? ValidFieldChars<T> extends true
      ? T
      : never
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
