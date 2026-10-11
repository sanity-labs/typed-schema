import {safeParse} from '../parse'
import {type StandardSchemaV1} from '../standardSchema'
import {defineNonEnumerableGetter} from './defineNonEnumerableGetter'

/**
 * @internal
 * Attaches the phantom `output` getter and the Standard Schema `~standard`
 * property to a schema definition. Both are non-enumerable, so the schema
 * stays plain, serializable data.
 * @param target - the schema definition object
 */
export function defineType<T>(
  target: T,
): T & {output: never; '~standard': never} {
  let standard: StandardSchemaV1.Props<any, any> | undefined
  defineNonEnumerableGetter(target, 'output', () => {
    return undefined
  })
  return defineNonEnumerableGetter(target, '~standard', () => {
    standard ??= {
      version: 1,
      vendor: '@sanity-labs/typed-schema',
      validate: value => {
        const result = safeParse(target as any, value)
        return result.status === 'ok'
          ? {value: result.value}
          : {
              issues: result.errors.map(error => ({
                message: error.message,
                path: error.path.map(segment =>
                  typeof segment === 'object' ? {key: segment._key} : segment,
                ),
              })),
            }
      },
    }
    return standard
  }) as any
}
