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
  REF_SCHEMA,
  type OutputOf,
  type Parsed,
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
import {type StandardSchemaV1} from './standardSchema'

/**
 * Where in the input a {@link ParseIssue} was found: object field names,
 * primitive array indexes and, for keyed object arrays, the item's `_key`
 * together with its `index` in the input array.
 */
export type Path = Array<string | number | {_key: string; index: number}>

/**
 * A path segment {@link formatPath} understands: a {@link Path} segment, or a
 * Standard Schema one (a property key, or `{key}` as the spec allows).
 */
export type PathSegmentLike =
  | Path[number]
  | PropertyKey
  | StandardSchemaV1.PathSegment

/**
 * Formats a path the way Sanity paths are written: `author.name`, `tags[0]`,
 * `body[_key=="abc"].text`. The empty path is `<root>`. Takes a
 * {@link ParseIssue} path or a Standard Schema issue path.
 *
 * @param path - the path to format
 */
export function formatPath(path: ReadonlyArray<PathSegmentLike>): string {
  if (path.length === 0) return '<root>'
  return path.map((segment, i) => formatSegment(segment, i === 0)).join('')
}

function formatSegment(segment: PathSegmentLike, first: boolean): string {
  if (typeof segment === 'object' && segment !== null) {
    if ('_key' in segment && typeof segment._key === 'string') {
      // `_key` comes from the input, so quote it the way `inspect` quotes
      // strings: escaped and capped, so it cannot add lines to a report
      return `[_key==${inspect(segment._key)}]`
    }
    if ('key' in segment) return formatSegment(segment.key, first)
  }
  if (typeof segment === 'string') return first ? segment : `.${segment}`
  return `[${String(segment)}]`
}

export type ErrorCode =
  | 'INVALID_TYPE'
  | 'INVALID_PRIMITIVE_UNION'
  | 'INVALID_ENUM_VALUE'
  | 'NUM_TOO_SMALL'
  | 'NUM_TOO_BIG'
  | 'NUM_NOT_MULTIPLE_OF'
  | 'INVALID_OBJECT_UNION'
  | 'ARRAY_ELEMENT_NOT_KEYED_OBJECT'
/**
 * One problem found while parsing: where it is and why it was rejected.
 * `input`, the rejected value, is only present when parsing with
 * `reportInput: true`, so that issues can be logged without leaking the data
 * they were found in.
 */
export interface ParseIssue {
  path: Path
  input?: unknown
  code: ErrorCode
  message: string
}

/** Options for {@link parse} and {@link parseOrThrow}. */
export interface ParseOptions {
  /**
   * Include the rejected value as `input` on every issue, so that
   * {@link formatIssues} and `ParseError.message` show it. Off by default:
   * input often comes from untrusted or sensitive sources, and error messages
   * tend to end up in logs.
   */
  reportInput?: boolean
}
export type ParseOk<T> = {ok: true; value: T}
export type ParseFail = {ok: false; error: ParseError}

/** What {@link parse} returns: the parsed value, or a {@link ParseError} listing every issue found in the input. */
export type ParseResult<T> = ParseOk<T> | ParseFail

/**
 * Validates `input` against `schema` and returns a {@link ParseResult}. It never
 * throws for invalid input; use {@link parseOrThrow} for that.
 *
 * @param schema - the schema to validate against
 * @param input - the value to validate
 * @param options - see {@link ParseOptions}
 */
export function parse<T extends SanityType>(
  schema: T,
  input: unknown,
  options: ParseOptions = {},
): ParseResult<Parsed<T>> {
  const result = parseInternal(schema, input)
  if (result.ok) return result
  const issues = options.reportInput
    ? result.issues
    : result.issues.map(({input: _, ...issue}) => issue)
  return {ok: false, error: new ParseError(issues)}
}

/**
 * The result the per-type parsers pass around: plain issue arrays, so that a
 * nested failure is not wrapped in an Error until the public `parse` returns.
 * Every internal issue has its `input`; `parse` drops it unless asked to keep
 * it.
 */
type InternalResult<T> = ParseOk<T> | {ok: false; issues: ParseIssue[]}

function parseInternal<T extends SanityType>(
  _schema: T,
  input: unknown,
): InternalResult<Parsed<T>> {
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
    ok: false,
    issues: [
      {
        path: [],
        code: 'INVALID_TYPE',
        input,
        message: `Parsing of schema type "${schema.typeName}" is not supported`,
      },
    ],
  }
}
/**
 * What {@link formatIssues} accepts: a {@link ParseIssue}, or a Standard
 * Schema issue from any library. `input`, when present, is shown as the
 * rejected value.
 */
export interface IssueLike {
  readonly message: string
  readonly path?: ReadonlyArray<PathSegmentLike> | undefined
  readonly input?: unknown
}

/**
 * Renders a list of issues as a readable report: one issue on a single line,
 * several as a header line followed by one indented line per issue. Each line
 * gives the issue's path (see {@link formatPath}), its message and, when the
 * issue has an `input` (see {@link ParseOptions}), the value that was rejected.
 *
 * Accepts `ParseError.issues` as well as the `issues` of a failed Standard
 * Schema `validate` result, from this or any other library.
 *
 * @param issues - the issues to render
 */
export function formatIssues(issues: ReadonlyArray<IssueLike>): string {
  if (issues.length === 0) return 'Invalid input'
  const lines = issues.map(
    issue =>
      `${formatPath(issue.path ?? [])}: ${issue.message}${
        'input' in issue ? `, got ${inspect(issue.input)}` : ''
      }`,
  )
  if (lines.length === 1) return `Invalid input at ${lines[0]}`
  return [`Invalid input (${lines.length} issues):`, ...lines].join('\n  ')
}

/**
 * The `error` of a failed {@link parse} result, and what {@link parseOrThrow}
 * throws. `issues` holds every issue found and `message` is
 * {@link formatIssues} applied to them.
 */
export class ParseError extends Error {
  constructor(public issues: ParseIssue[]) {
    super(formatIssues(issues))
    this.name = 'ParseError'
  }
}

/**
 * Like {@link parse}, but returns the parsed value directly and throws a
 * {@link ParseError} when the input is invalid.
 *
 * @param schema - the schema to validate against
 * @param input - the value to validate
 * @param options - see {@link ParseOptions}
 */
export function parseOrThrow<T extends SanityType>(
  schema: T,
  input: unknown,
  options?: ParseOptions,
): Parsed<T> {
  const result = parse(schema, input, options)
  if (!result.ok) {
    throw result.error
  }
  return result.value
}
function parseString(
  schema: SanityString,
  input: unknown,
): InternalResult<string> {
  return typeof input === 'string'
    ? {ok: true, value: input}
    : {
        ok: false,
        issues: [
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
): InternalResult<number> {
  if (!constraints) {
    return {ok: true, value: input}
  }
  if (constraints.min !== undefined && input < constraints.min) {
    return {
      ok: false,
      issues: [
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
      ok: false,
      issues: [
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
      ok: false,
      issues: [
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
      ok: false,
      issues: [
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
      ok: false,
      issues: [
        {
          path: [],
          code: 'NUM_NOT_MULTIPLE_OF',
          input,
          message: `Expected a number that is a multiple of ${constraints.step}`,
        },
      ],
    }
  }
  return {ok: true, value: input}
}

function parseNumber(
  schema: SanityNumber,
  input: unknown,
): InternalResult<number> {
  return typeof input === 'number' && Number.isFinite(input)
    ? parseNumberConstraints(schema.constraints, input)
    : {
        ok: false,
        issues: [
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
): InternalResult<boolean> {
  return typeof input === 'boolean'
    ? {ok: true, value: input}
    : {
        ok: false,
        issues: [
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
): InternalResult<string> {
  if (typeof input !== 'string') {
    return {
      ok: false,
      issues: [
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
      ok: false,
      issues: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an ISO 8601 dateTime string on the format "${ISO_DATETIME_FORMAT}"`,
        },
      ],
    }
  }
  return {ok: true, value: input}
}

// date-fns format (note: `MM` is month, `mm` would be minutes)
const DATE_FNS_FORMAT = 'yyyy-MM-dd'

function parseDate(schema: SanityDate, input: unknown): InternalResult<string> {
  if (typeof input !== 'string') {
    return {
      ok: false,
      issues: [
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
      ok: false,
      issues: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected a date string on the format "${DATE_FNS_FORMAT.toUpperCase()}"`,
        },
      ],
    }
  }
  return {ok: true, value: input}
}
function parseOptional<T extends SanityType>(
  schema: SanityOptional<T>,
  input: unknown,
): InternalResult<T | undefined> {
  return input === undefined
    ? {ok: true, value: input}
    : parseInternal(schema.type, input)
}

function parseNever<T extends SanityType>(
  schema: SanityNever,
  input: unknown,
): InternalResult<T | undefined> {
  return {
    ok: false,
    issues: [
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
): InternalResult<OutputOf<S>> {
  return input === schema.value
    ? {ok: true, value: input}
    : {
        ok: false,
        issues: [
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
): InternalResult<OutputOf<S>> {
  // parse against the schema's own shape rather than the static reference
  // base, so that `_key` (added for array items) and extended shapes apply
  const parsed = parseObject(schema, input)
  if (!parsed.ok) {
    return parsed
  }
  return {
    ...parsed,
    value: defineNonEnumerableGetter(
      parsed.value,
      REF_SCHEMA,
      () => schema.referenceType,
    ),
  }
}

function parsePrimitiveUnion<S extends SanityPrimitiveUnion>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  const issues: ParseIssue[] = []
  for (const unionTypeDef of schema.union) {
    const result = parseInternal(unionTypeDef, input)
    if (result.ok) {
      return result
    }
    issues.push(...result.issues)
  }
  return {
    ok: false,
    issues: [
      {
        code: 'INVALID_PRIMITIVE_UNION',
        input,
        path: [],
        message: "Input doesn't match any of the valid union types",
      },
      ...issues,
    ],
  }
}

function parseEnum<S extends SanityEnum>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  for (const [, enumVal] of Object.entries(schema.enum)) {
    if (enumVal === input) {
      return {
        ok: true,
        value: enumVal,
      }
    }
  }
  return {
    ok: false,
    issues: [
      {
        code: 'INVALID_ENUM_VALUE',
        input,
        path: [],
        message: "Input doesn't match any of the valid enum values",
      },
    ],
  }
}

/**
 * The member of an object union whose `_type` literal is `typeName`, looked up
 * through nested unions so the result is never itself a union.
 */
function findUnionSchemaForType(
  unionSchema: SanityObjectUnion,
  typeName: string,
): SanityTypedObject | SanityReference | SanityBlock | SanityAsset | undefined {
  for (const member of unionSchema.union) {
    if (isNeverSchema(member)) continue
    if (isObjectUnionSchema(member)) {
      const found = findUnionSchemaForType(member, typeName)
      if (found) return found
      continue
    }
    const typeLiteral = member.shape._type
    if (isLiteralSchema(typeLiteral) && typeLiteral.value === typeName) {
      return member
    }
  }
  return undefined
}

function hasTypeField(input: any): input is {_type: string} {
  return '_type' in input
}
function parseObjectUnion<S extends SanityObjectUnion>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  if (!isPlainObject(input) || !hasTypeField(input)) {
    return {
      ok: false,
      issues: [
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
      ok: false,
      issues: [
        {
          code: 'INVALID_OBJECT_UNION',
          input,
          path: [],
          message: `Type ${inspect(input._type)} not found among valid union types`,
        },
      ],
    }
  }
  // `_type` picked the member, so its issues say what is wrong; a union-level
  // issue on top would only repeat the element's path and `_type`.
  return parseInternal(unionSchema, input) as any
}

type PlainObject = {[key: string]: unknown}
const isPlainObject = (value: unknown): value is {[key: string]: unknown} => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function parseObject<S extends SanityObjectLike>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  // This isn't strictly correct: there may be additional keys present, however,
  // other approaches break type inference for objects that have both known
  // and unknown keys (such as assets).
  //
  // https://github.com/microsoft/TypeScript/issues/52931
  const keys = Object.keys(schema.shape) as (keyof typeof schema.shape)[]

  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an object with keys {${keys.join(', ')}}`,
        },
      ],
    }
  }
  const issues: ParseIssue[] = []
  const value: PlainObject = {}

  keys.forEach(key => {
    const parsed = parseInternal(schema.shape[key]!, input[key])
    if (!parsed.ok) {
      issues.push(
        ...parsed.issues.map(err => ({
          ...err,
          path: [key, ...err.path],
        })),
      )
    } else if (parsed.value !== undefined) {
      value[key] = parsed.value
    }
  })
  if (issues.length > 0) {
    return {ok: false, issues}
  }
  return {ok: true, value}
}

function isKeyedObject(value: unknown): value is {_key: string} {
  return isPlainObject(value) && typeof value._key === 'string'
}

function parseObjectArray<S extends SanityObjectArray>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      issues: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an array`,
        },
      ],
    }
  }

  const issues: ParseIssue[] = []
  const value = (input as unknown[]).map((item, index) => {
    if (!isKeyedObject(item)) {
      issues.push({
        code: 'ARRAY_ELEMENT_NOT_KEYED_OBJECT',
        input: item,
        path: [index],
        message: 'Expected an object with a "_key" property',
      })
      return
    }
    const parsed = parseInternal(schema.element, item)
    if (!parsed.ok) {
      issues.push(
        ...parsed.issues.map(err => ({
          ...err,
          path: [{_key: item._key, index}, ...err.path],
        })),
      )
      return undefined
    }
    return parsed.value
  }) as {_key: string}[]

  if (issues.length > 0) {
    return {ok: false, issues}
  }
  return {ok: true, value}
}

function parsePrimitiveArray<S extends SanityPrimitiveArray>(
  schema: S,
  input: unknown,
): InternalResult<OutputOf<S>> {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      issues: [
        {
          path: [],
          code: 'INVALID_TYPE',
          input,
          message: `Expected an array`,
        },
      ],
    }
  }

  const issues: ParseIssue[] = []
  const value = (input as unknown[]).map((item, index) => {
    const parsed = parseInternal(schema.element, item)
    if (!parsed.ok) {
      issues.push(
        ...parsed.issues.map(err => ({
          ...err,
          path: [index, ...err.path],
        })),
      )
      return undefined
    }
    return parsed.value
  }) as any[]

  if (issues.length > 0) {
    return {ok: false, issues}
  }
  return {ok: true, value}
}
