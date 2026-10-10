import {
  isBooleanSchema,
  isDateSchema,
  isDateTimeSchema,
  isEnumSchema,
  isLiteralSchema,
  isNeverSchema,
  isNumberSchema,
  isObjectArraySchema,
  isObjectLikeSchema,
  isObjectUnionSchema,
  isOptionalSchema,
  isPrimitiveArraySchema,
  isPrimitiveUnionSchema,
  isReferenceSchema,
  isStringSchema,
} from './asserters'
import {
  type Infer,
  INTERNAL_REF_TYPE_SCHEMA,
  type OutputOf,
  type SanityAsset,
  type SanityBlock,
  type SanityBoolean,
  type SanityDate,
  type SanityDateTime,
  type SanityEnum,
  type SanityLiteral,
  type SanityNever,
  type SanityNumber,
  type SanityObjectArray,
  type SanityObjectLike,
  type SanityObjectUnion,
  type SanityOptional,
  type SanityPrimitiveArray,
  type SanityPrimitiveUnion,
  type SanityReference,
  type SanityString,
  type SanityType,
  type SanityTypedObject,
} from './defs'
import {defineNonEnumerableGetter} from './helpers/defineNonEnumerableGetter'
import {getLazySchema} from './helpers/getLazySchema'
import {inspect} from './helpers/inspect'
import {
  isStrictlyDateTime,
  isStrictlyFormatted,
} from './helpers/strictDateParse'

export type Path = Array<string | number | {_key: string}>

export type ErrorCode =
  | 'INVALID_TYPE'
  | 'INVALID_PRIMITIVE_UNION'
  | 'INVALID_ENUM_VALUE'
  | 'NUM_TOO_SMALL'
  | 'NUM_TOO_BIG'
  | 'NUM_NOT_MULTIPLE_OF'
  | 'INVALID_OBJECT_UNION'
  | 'ARRAY_ELEMENT_NOT_KEYED_OBJECT'
export interface ParseErrorDetails {
  path: Path
  input: unknown
  code: ErrorCode
  message: string
}
export type ParseOk<T> = {status: 'ok'; value: T}
export type ParseFail = {status: 'fail'; errors: ParseErrorDetails[]}

export type ParseResult<T> = ParseOk<T> | ParseFail

export function safeParse<T extends SanityType>(
  _schema: T,
  input: unknown,
): ParseResult<Infer<T>> {
  const schema = getLazySchema(_schema)
  if (isOptionalSchema(schema)) {
    return parseOptional(schema, input) as any
  }
  if (isNeverSchema(schema)) {
    return parseNever(schema, input) as any
  }
  if (isStringSchema(schema)) {
    return parseString(schema, input) as any
  }
  if (isNumberSchema(schema)) {
    return parseNumber(schema, input) as any
  }
  if (isBooleanSchema(schema)) {
    return parseBoolean(schema, input) as any
  }
  if (isDateTimeSchema(schema)) {
    return parseDateTime(schema, input) as any
  }
  if (isDateSchema(schema)) {
    return parseDate(schema, input) as any
  }
  if (isReferenceSchema(schema)) {
    return parseReference(schema, input) as any
  }
  // object, document, block, image, file
  if (isObjectLikeSchema(schema)) {
    return parseObject(schema, input) as any
  }
  if (isLiteralSchema(schema)) {
    return parseLiteral(schema, input) as any
  }
  if (isObjectArraySchema(schema)) {
    return parseObjectArray(schema, input) as any
  }
  if (isPrimitiveArraySchema(schema)) {
    return parsePrimitiveArray(schema, input) as any
  }
  if (isObjectUnionSchema(schema)) {
    return parseObjectUnion(schema, input) as any
  }
  if (isPrimitiveUnionSchema(schema)) {
    return parsePrimitiveUnion(schema, input) as any
  }
  if (isEnumSchema(schema)) {
    return parseEnum(schema, input) as any
  }

  return {
    status: 'fail',
    errors: [
      {
        path: [],
        code: 'INVALID_TYPE',
        input,
        message: `Invalid input: ${inspect(input)}. Parsing of schema type "${
          schema.typeName
        }" is not supported.`,
      },
    ],
  }
}
export class ParseError extends Error {
  constructor(public errors: ParseErrorDetails[]) {
    const firstError = errors[0]
    const formattedError = [
      'Invalid input',
      firstError
        ? ` at "${firstError.path.join('.') || '<root>'}": ${
            firstError.message
          }`
        : ': <unknown>',
      errors.length > 1 ? ` (+ ${errors.length - 1})` : '',
    ]
    super(formattedError.join(''))
  }
}

export function parse<T extends SanityType>(
  schema: T,
  input: unknown,
): Infer<T> {
  const safeResult = safeParse(schema, input)
  if (safeResult.status === 'fail') {
    throw new ParseError(safeResult.errors)
  }
  return safeResult.value
}
function parseString(
  schema: SanityString,
  input: unknown,
): ParseResult<string> {
  return typeof input === 'string'
    ? {status: 'ok', value: input}
    : {
        status: 'fail',
        errors: [
          {
            path: [],
            code: 'INVALID_TYPE',
            input,
            message: `Expected a string`,
          },
        ],
      }
}

function parseNumberConstraints(
  constraints: SanityNumber['constraints'],
  input: number,
): ParseResult<number> {
  if (!constraints) {
    return {status: 'ok', value: input}
  }
  if (constraints.min !== undefined && input < constraints.min) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'NUM_TOO_SMALL',
          input,
          message: `Expected a number greater than, or equal to ${constraints.min}`,
        },
      ],
    }
  }
  if (constraints.gt !== undefined && input <= constraints.gt) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'NUM_TOO_SMALL',
          input,
          message: `Expected a number greater than ${constraints.gt}`,
        },
      ],
    }
  }
  if (constraints.max !== undefined && input > constraints.max) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'NUM_TOO_BIG',
          input,
          message: `Expected a number less than, or equal to ${constraints.max}`,
        },
      ],
    }
  }
  if (constraints.lt !== undefined && input >= constraints.lt) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'NUM_TOO_BIG',
          input,
          message: `Expected a number less than ${constraints.lt}`,
        },
      ],
    }
  }
  if (constraints.step !== undefined && input % constraints.step !== 0) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'NUM_NOT_MULTIPLE_OF',
          input,
          message: `Expected a number that is a multiple of ${constraints.step}`,
        },
      ],
    }
  }
  return {status: 'ok', value: input}
}

function parseNumber(
  schema: SanityNumber,
  input: unknown,
): ParseResult<number> {
  return typeof input === 'number' && Number.isFinite(input)
    ? parseNumberConstraints(schema.constraints, input)
    : {
        status: 'fail',
        errors: [
          {
            path: [],
            code: 'INVALID_TYPE',
            input,
            message: `Expected a finite number`,
          },
        ],
      }
}
function parseBoolean(
  schema: SanityBoolean,
  input: unknown,
): ParseResult<boolean> {
  return typeof input === 'boolean'
    ? {status: 'ok', value: input}
    : {
        status: 'fail',
        errors: [
          {
            path: [],
            code: 'INVALID_TYPE',
            input,
            message: `Expected a boolean`,
          },
        ],
      }
}

// see https://es5.github.io/#x15.9.1.15
const ISO_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)'
function parseDateTime(
  schema: SanityDateTime,
  input: unknown,
): ParseResult<string> {
  if (typeof input !== 'string') {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected a string`,
        },
      ],
    }
  }
  if (!isStrictlyDateTime(input)) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an ISO 8601 dateTime string on the format "${ISO_DATETIME_FORMAT}"`,
        },
      ],
    }
  }
  return {status: 'ok', value: input}
}

// date-fns format (note: `MM` is month, `mm` would be minutes)
const DATE_FNS_FORMAT = 'yyyy-MM-dd'

function parseDate(schema: SanityDate, input: unknown): ParseResult<string> {
  if (typeof input !== 'string') {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected a date string on the format "${DATE_FNS_FORMAT.toUpperCase()}"`,
        },
      ],
    }
  }

  if (!isStrictlyFormatted(input, DATE_FNS_FORMAT)) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected a date string on the format "${DATE_FNS_FORMAT.toUpperCase()}"`,
        },
      ],
    }
  }
  return {status: 'ok', value: input}
}
function parseOptional<T extends SanityType>(
  schema: SanityOptional<T>,
  input: unknown,
): ParseResult<T | undefined> {
  return input === undefined
    ? {status: 'ok', value: input}
    : safeParse(schema.type, input)
}

function parseNever<T extends SanityType>(
  schema: SanityNever,
  input: unknown,
): ParseResult<T | undefined> {
  return {
    status: 'fail',
    errors: [
      {
        path: [],
        code: 'INVALID_TYPE',
        input,
        message: `Expected never`,
      },
    ],
  }
}

function parseLiteral<S extends SanityLiteral<any>>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  return input === schema.value
    ? {status: 'ok', value: input}
    : {
        status: 'fail',
        errors: [
          {
            path: [],
            code: 'INVALID_TYPE',
            input,
            message: `Expected literal value "${schema.value}"`,
          },
        ],
      }
}

function parseReference<S extends SanityReference<any>>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  // parse against the schema's own shape rather than the static reference
  // base, so that `_key` (added for array items) and extended shapes apply
  const parsed = parseObject(schema, input)
  if (parsed.status === 'fail') {
    return parsed
  }
  return {
    ...parsed,
    value: defineNonEnumerableGetter(
      parsed.value,
      INTERNAL_REF_TYPE_SCHEMA,
      () => schema.referenceType,
    ),
  }
}

function parsePrimitiveUnion<S extends SanityPrimitiveUnion>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  const errors: ParseErrorDetails[] = []
  for (const unionTypeDef of schema.union) {
    const result = safeParse(unionTypeDef, input)
    if (result.status === 'ok') {
      return result
    }
    errors.push(...result.errors)
  }
  return {
    status: 'fail',
    errors: [
      {
        code: 'INVALID_PRIMITIVE_UNION',
        input,
        path: [],
        message: "Input doesn't match any of the valid union types",
      },
      ...errors,
    ],
  }
}

function parseEnum<S extends SanityEnum>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  const errors: ParseErrorDetails[] = []
  for (const [, enumVal] of Object.entries(schema.enum)) {
    if (enumVal === input) {
      return {
        status: 'ok',
        value: enumVal,
      }
    }
  }
  return {
    status: 'fail',
    errors: [
      {
        code: 'INVALID_ENUM_VALUE',
        input,
        path: [],
        message: "Input doesn't match any of the valid enum values",
      },
      ...errors,
    ],
  }
}

function findUnionSchemaForType(
  unionSchema: SanityObjectUnion,
  typeName: string,
):
  | SanityTypedObject
  | SanityObjectUnion
  | SanityReference
  | SanityBlock
  | SanityAsset
  | undefined {
  return unionSchema.union
    .filter(
      (unionType): unionType is Exclude<typeof unionType, SanityNever> =>
        !isNeverSchema(unionType),
    )
    .find(
      (
        objectDef:
          | SanityTypedObject
          | SanityObjectUnion
          | SanityReference
          | SanityBlock
          | SanityAsset,
      ) => {
        if (isObjectUnionSchema(objectDef)) {
          return findUnionSchemaForType(objectDef, typeName)
        }
        const typeLiteral = objectDef.shape._type
        return isLiteralSchema(typeLiteral) && typeLiteral.value === typeName
      },
    )
}

function hasTypeField(input: any): input is {_type: string} {
  return '_type' in input
}
function parseObjectUnion<S extends SanityObjectUnion>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  if (!isPlainObject(input) || !hasTypeField(input)) {
    return {
      status: 'fail',
      errors: [
        {
          code: 'INVALID_OBJECT_UNION',
          input,
          path: [],
          message: `Expected an object with a "_type"-property`,
        },
      ],
    }
  }
  const unionSchema = input._type && findUnionSchemaForType(schema, input._type)
  if (!unionSchema) {
    return {
      status: 'fail',
      errors: [
        {
          code: 'INVALID_OBJECT_UNION',
          input,
          path: [],
          message: `Type "${input._type}" not found among valid union types`,
        },
      ],
    }
  }
  const result = safeParse(unionSchema, input)
  if (result.status === 'ok') {
    return result as any
  }
  return {
    status: 'fail',
    errors: [
      {
        code: 'INVALID_OBJECT_UNION',
        input,
        path: [],
        message: `Cannot parse input as union type "${input._type}"`,
      },
      ...result.errors,
    ],
  }
}

type PlainObject = {[key: string]: unknown}
const isPlainObject = (value: unknown): value is {[key: string]: unknown} => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function parseObject<S extends SanityObjectLike>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  // This isn't strictly correct: there may be additional keys present, however,
  // other approaches break type inference for objects that have both known
  // and unknown keys (such as assets).
  //
  // https://github.com/microsoft/TypeScript/issues/52931
  const keys = Object.keys(schema.shape) as (keyof typeof schema.shape)[]

  if (!isPlainObject(input)) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an object with keys {${keys.join(', ')}}`,
        },
      ],
    }
  }
  const errors: ParseErrorDetails[] = []
  const value: PlainObject = {}

  keys.forEach(key => {
    const parsed = safeParse(schema.shape[key]!, input[key])
    if (parsed.status === 'fail') {
      errors.push(
        ...parsed.errors.map(err => ({
          ...err,
          path: [key, ...err.path],
        })),
      )
    } else if (parsed.value !== undefined) {
      value[key] = parsed.value
    }
  })
  if (errors.length > 0) {
    return {status: 'fail', errors}
  }
  return {status: 'ok', value}
}

function isKeyedObject(value: unknown): value is {_key: string} {
  return isPlainObject(value) && typeof value._key === 'string'
}

function parseObjectArray<S extends SanityObjectArray>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  if (!Array.isArray(input)) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an array"`,
        },
      ],
    }
  }

  const errors: ParseErrorDetails[] = []
  const value = (input as unknown[]).map((item, index) => {
    if (!isKeyedObject(item)) {
      errors.push({
        code: 'ARRAY_ELEMENT_NOT_KEYED_OBJECT',
        input,
        path: [index],
        message: 'Expected an object with a "_key" property',
      })
      return
    }
    const parsed = safeParse(schema.element, item)
    if (parsed.status === 'fail') {
      errors.push(
        ...parsed.errors.map(err => ({
          ...err,
          path: [item._key, ...err.path],
        })),
      )
      return undefined
    }
    return parsed.value
  }) as {_key: string}[]

  if (errors.length > 0) {
    return {status: 'fail', errors}
  }
  return {status: 'ok', value}
}

function parsePrimitiveArray<S extends SanityPrimitiveArray>(
  schema: S,
  input: unknown,
): ParseResult<OutputOf<S>> {
  if (!Array.isArray(input)) {
    return {
      status: 'fail',
      errors: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an array`,
        },
      ],
    }
  }

  const errors: ParseErrorDetails[] = []
  const value = (input as unknown[]).map((item, index) => {
    const parsed = safeParse(schema.element, item)
    if (parsed.status === 'fail') {
      errors.push(
        ...parsed.errors.map(err => ({
          ...err,
          path: [index, ...err.path],
        })),
      )
      return undefined
    }
    return parsed.value
  }) as any[]

  if (errors.length > 0) {
    return {status: 'fail', errors}
  }
  return {status: 'ok', value}
}
