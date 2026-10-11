import {
  isDocumentUnionSchema,
  isLazySchema,
  isObjectArraySchema,
  isObjectLikeSchema,
  isObjectUnionSchema,
  isOptionalSchema,
  isPrimitiveArraySchema,
  isPrimitiveUnionSchema,
} from '../asserters'
import {getUnkeyedSchema} from '../creators/array'
import {
  type SanityObjectUnion,
  type SanityPrimitiveUnion,
  type SanityType,
} from '../defs'
import {formatPath, type ParseIssue, parse} from '../parse'
import {getLazySchema} from './getLazySchema'

// A `lazy()` that builds a new schema each time it resolves never repeats a
// node, so past this depth the walk stops: every annotation such a schema
// can have has been checked by then
const MAX_DEPTH = 100

export type ExampleFailure = {
  /** Where in the schema tree the example sits: field names, `[]` for array elements, `_type` names for union members */
  schemaPath: string[]
  /** Index into the node's `annotations.examples` */
  index: number
  example: unknown
  issues: ParseIssue[]
}

/**
 * The `error` of a failed {@link validateExamples} result, and what
 * {@link validateExamplesOrThrow} throws. `failures` holds every example that
 * did not parse and `message` lists them, one per line.
 */
export class ExampleError extends Error {
  constructor(public failures: ExampleFailure[]) {
    super(formatFailures(failures))
    this.name = 'ExampleError'
  }
}

function formatFailures(failures: ExampleFailure[]): string {
  return `Invalid schema examples:\n${failures
    .map(
      failure =>
        `${failure.schemaPath.length === 0 ? '(root)' : failure.schemaPath.join('.')} examples[${failure.index}]: ${failure.issues
          .map(
            issue =>
              `${issue.path.length === 0 ? '' : `${formatPath(issue.path)}: `}${issue.message}`,
          )
          .join('; ')}`,
    )
    .join('\n')}`
}

/** What {@link validateExamples} returns: the schema, or an {@link ExampleError} listing every failing example. */
export type ValidateExamplesResult<S extends SanityType> =
  | {ok: true; value: S}
  | {ok: false; error: ExampleError}

/**
 * Parses every `annotations.examples` entry in the schema tree against the
 * node it is attached to. The type of `examples` already rejects wrong shapes
 * at compile time; this catches what types cannot see, such as number
 * constraints, date formats and schemas behind `lazy()`. Never throws; use
 * {@link validateExamplesOrThrow} for that.
 * @param schema - the schema to check
 */
export function validateExamples<S extends SanityType>(
  schema: S,
): ValidateExamplesResult<S> {
  const failures: ExampleFailure[] = []
  collectExampleFailures(schema, [], failures, new Set())
  return failures.length === 0
    ? {ok: true, value: schema}
    : {ok: false, error: new ExampleError(failures)}
}

/**
 * Like {@link validateExamples}, but returns the schema directly and throws
 * the {@link ExampleError} when an example does not parse
 * @param schema - the schema to check
 */
export function validateExamplesOrThrow<S extends SanityType>(schema: S): S {
  const result = validateExamples(schema)
  if (!result.ok) {
    throw result.error
  }
  return result.value
}

function collectExampleFailures(
  schema: SanityType,
  schemaPath: string[],
  failures: ExampleFailure[],
  seen: Set<SanityType>,
  depth = 0,
): void {
  // lazy schemas may be circular; each node is checked once
  if (seen.has(schema) || depth > MAX_DEPTH) {
    return
  }
  seen.add(schema)
  const next = depth + 1

  schema.annotations?.examples?.forEach((example, index) => {
    const result = parse(schema, example)
    if (!result.ok) {
      failures.push({schemaPath, index, example, issues: result.error.issues})
    }
  })

  if (isOptionalSchema(schema)) {
    collectExampleFailures(schema.type, schemaPath, failures, seen, next)
  } else if (isLazySchema(schema)) {
    collectExampleFailures(
      getLazySchema(schema),
      schemaPath,
      failures,
      seen,
      next,
    )
  } else if (isObjectLikeSchema(schema)) {
    for (const [key, field] of Object.entries(schema.shape)) {
      collectExampleFailures(field, [...schemaPath, key], failures, seen, next)
    }
  } else if (isObjectArraySchema(schema) || isPrimitiveArraySchema(schema)) {
    // The element of an object array is a copy with `_key` added. Its
    // examples belong to the schema it was copied from, which has no `_key`
    collectExampleFailures(
      getUnkeyedSchema(schema.element),
      [...schemaPath, '[]'],
      failures,
      seen,
      next,
    )
  } else if (
    isObjectUnionSchema(schema) ||
    isDocumentUnionSchema(schema) ||
    isPrimitiveUnionSchema(schema)
  ) {
    // like an object union, a union of documents has a `union` list of members with shapes
    const {union} = schema as SanityObjectUnion | SanityPrimitiveUnion
    union.forEach((member, index) => {
      const name =
        'shape' in member && member.shape._type && 'value' in member.shape._type
          ? String(member.shape._type.value)
          : String(index)
      collectExampleFailures(
        member,
        [...schemaPath, name],
        failures,
        seen,
        next,
      )
    })
  }
}
