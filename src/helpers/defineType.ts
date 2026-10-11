import {type SchemaAnnotations} from '../defs'
import {parse} from '../parse'
import {type StandardSchemaV1} from '../standardSchema'
import {defineNonEnumerableGetter} from './defineNonEnumerableGetter'

/**
 * @internal
 * Attaches the phantom `output` getter and the Standard Schema `~standard`
 * property to a schema definition, and the annotations when given. The
 * getters are non-enumerable, so the schema stays plain, serializable data.
 * @param target - the schema definition object
 * @param annotations - annotations to attach as `annotations`
 */
export function defineType<T>(
  target: T,
  annotations?: SchemaAnnotations<any>,
): T & {output: never; '~standard': never} {
  const schema = annotations ? {...target, annotations} : target
  let standard: StandardSchemaV1.Props<any, any> | undefined
  defineNonEnumerableGetter(schema, 'output', () => {
    return undefined
  })
  return defineNonEnumerableGetter(schema, '~standard', () => {
    standard ??= {
      version: 1,
      vendor: '@sanity-labs/typed-schema',
      validate: value => {
        const result = parse(schema as any, value)
        return result.ok
          ? {value: result.value}
          : {
              issues: result.error.issues.map(issue => ({
                message: issue.message,
                // A keyed array item is addressed by its index, which resolves
                // against the input, with the `_key` kept alongside.
                path: issue.path.map(segment =>
                  typeof segment === 'object'
                    ? {key: segment.index, _key: segment._key}
                    : segment,
                ),
              })),
            }
      },
    }
    return standard
  }) as any
}
