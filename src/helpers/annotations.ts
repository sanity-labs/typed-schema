import {isLazySchema, isOptionalSchema} from '../asserters'
import {
  type AnnotationText,
  type OutputOf,
  type ResolvedSchemaAnnotations,
  type SanityType,
  type SchemaAnnotations,
} from '../defs'
import {defineType} from './defineType'
import {getLazySchema} from './getLazySchema'

const ANNOTATION_KEYS = [
  'title',
  'description',
  'guidelines',
  'examples',
  'deprecated',
  'readOnly',
] as const satisfies (keyof SchemaAnnotations)[]

/**
 * @internal
 * Splits an options object into the annotation keys and everything else, so a
 * creator can accept constraints and annotations in one argument
 * @param options - the combined options object
 */
export function splitAnnotations<T extends object>(
  options: T | undefined,
): [
  annotations: SchemaAnnotations | undefined,
  rest: Omit<T, keyof SchemaAnnotations>,
] {
  if (!options) {
    return [undefined, {} as Omit<T, keyof SchemaAnnotations>]
  }
  const annotations: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    if ((ANNOTATION_KEYS as readonly string[]).includes(key)) {
      annotations[key] = value
    } else {
      rest[key] = value
    }
  }
  return [
    Object.keys(annotations).length > 0
      ? (annotations as SchemaAnnotations)
      : undefined,
    rest as Omit<T, keyof SchemaAnnotations>,
  ]
}

export type GetAnnotationsOptions = {
  /** The locale to resolve `AnnotationText` values in */
  locale?: string
  /** The locale to fall back to when `locale` has no entry */
  fallback?: string
}

/**
 * Resolves an `AnnotationText` to a single string. A locale map resolves to the
 * requested locale, then the fallback locale, then its first entry
 * @param text - a plain string or a locale map
 * @param options - which locale to prefer
 */
export function resolveAnnotationText(
  text: AnnotationText | undefined,
  options: GetAnnotationsOptions = {},
): string | undefined {
  if (text === undefined || typeof text === 'string') {
    return text
  }
  const {locale, fallback} = options
  if (locale !== undefined && text[locale] !== undefined) {
    return text[locale]
  }
  if (fallback !== undefined && text[fallback] !== undefined) {
    return text[fallback]
  }
  return Object.values(text)[0]
}

/**
 * Returns the annotations attached to a schema with every text resolved to a
 * string, or `undefined` if the schema has none. Looks through `optional()`
 * and `lazy()` wrappers; annotations on an outer wrapper win over the inner
 * schema's
 * @param schema - the schema to read annotations from
 * @param options - which locale to resolve `AnnotationText` values in
 */
export function getAnnotations<S extends SanityType>(
  schema: S,
  options: GetAnnotationsOptions = {},
): ResolvedSchemaAnnotations<OutputOf<S>> | undefined {
  const layers: SchemaAnnotations[] = []
  let current: SanityType = schema
  for (;;) {
    if (current.annotations) {
      layers.push(current.annotations)
    }
    if (isOptionalSchema(current)) {
      current = current.type
    } else if (isLazySchema(current)) {
      // resolved through the cache, and nested lazies in one step
      current = getLazySchema(current)
    } else {
      break
    }
  }
  if (layers.length === 0) {
    return undefined
  }
  // innermost first, so outer layers override
  const merged: SchemaAnnotations = Object.assign({}, ...layers.reverse())
  const resolved: ResolvedSchemaAnnotations = {}
  for (const key of [
    'title',
    'description',
    'guidelines',
    'deprecated',
  ] as const) {
    const text = resolveAnnotationText(merged[key], options)
    if (text !== undefined) {
      resolved[key] = text
    }
  }
  if (merged.examples !== undefined) {
    resolved.examples = merged.examples
  }
  if (merged.readOnly !== undefined) {
    resolved.readOnly = merged.readOnly
  }
  return resolved as ResolvedSchemaAnnotations<OutputOf<S>>
}

/**
 * @internal
 * The annotations without `examples`, or `undefined` if nothing is left
 * @param annotations - the annotations to copy
 */
export function withoutExamples(
  annotations: SchemaAnnotations | undefined,
): SchemaAnnotations | undefined {
  if (!annotations) {
    return undefined
  }
  const {examples: _examples, ...rest} = annotations
  return Object.keys(rest).length > 0 ? rest : undefined
}

/**
 * @internal
 * Returns `target` with `source`'s annotations, for transforms that rebuild a
 * schema node through a creator. A transform that changes the value type
 * (`extend`, `rename`, the required variants) passes `examples: false`: the
 * source's examples are values of the source, not of the result
 * @param target - the rebuilt schema
 * @param source - the schema it was built from
 * @param options - whether to keep `examples`
 */
export function inheritAnnotations<T extends SanityType>(
  target: T,
  source: SanityType,
  options: {examples?: boolean} = {},
): T {
  const annotations =
    options.examples === false
      ? withoutExamples(source.annotations)
      : source.annotations
  return annotations ? defineType({...target, annotations}) : target
}
