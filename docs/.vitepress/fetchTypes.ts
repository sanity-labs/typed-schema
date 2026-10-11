/**
 * Makes `response.json()` return `Promise<unknown>` instead of
 * `Promise<any>` in the docs' examples and the playground, the way
 * `@total-typescript/ts-reset` does: a later declaration of an interface
 * method comes first in overload resolution. Data from outside should go
 * through `parse` before it is used, and `any` would let it skip that.
 */
export const fetchTypes = `interface Body {
  json(): Promise<unknown>
}
`
