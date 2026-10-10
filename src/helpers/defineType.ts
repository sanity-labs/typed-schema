import {defineNonEnumerableGetter} from './defineNonEnumerableGetter'

/**
 * @internal
 * Attaches the phantom `output` getter to a schema definition
 * @param target - the schema definition object
 */
export function defineType<T>(target: T): T & {output: never} {
  return defineNonEnumerableGetter(target, 'output', () => {
    return undefined
  }) as T & {output: never}
}
