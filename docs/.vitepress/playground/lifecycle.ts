/**
 * A document's lifecycle as two independent axes, matching the library's
 * `partial()` (completeness) and `committed()` (persistence).
 */
export interface Lifecycle {
  partial: boolean
  committed: boolean
}

export const COMPLETENESS = [
  {partial: false, label: 'Complete'},
  {partial: true, label: 'Partial'},
] as const

export const PERSISTENCE = [
  {committed: false, label: 'Not committed'},
  {committed: true, label: 'Committed'},
] as const

/** How the combination is written in code, for a schema named `name` */
export function lifecycleCode(lifecycle: Lifecycle, name: string): string {
  const inner = lifecycle.partial ? `partial(${name})` : name
  // committed() goes last: partial() would make the system fields optional
  return lifecycle.committed ? `committed(${inner})` : inner
}

export function lifecycleDescription(lifecycle: Lifecycle): string {
  if (lifecycle.partial && lifecycle.committed) {
    return 'An incomplete document as the API returns it, for example from the drafts perspective'
  }
  if (lifecycle.partial) {
    return 'Every field except _type optional, recursively: a document being edited'
  }
  if (lifecycle.committed) {
    return '_id, _rev, _createdAt and _updatedAt required: a document as the API returns it'
  }
  return 'A complete document as you construct it locally'
}

/** The URL form: `partial`, `committed` or `committed-partial` */
export function formatLifecycle(lifecycle: Lifecycle): string | null {
  const parts = [
    lifecycle.committed ? 'committed' : '',
    lifecycle.partial ? 'partial' : '',
  ].filter(Boolean)
  return parts.length ? parts.join('-') : null
}

export function parseLifecycle(value: string | null): Lifecycle {
  const parts = value?.split('-') ?? []
  return {
    partial: parts.includes('partial'),
    committed: parts.includes('committed'),
  }
}

/** Applies the combination to a schema, given the library's helpers */
export function applyLifecycle<T>(
  schema: T,
  lifecycle: Lifecycle,
  helpers: {partial: (schema: T) => T; committed: (schema: T) => T},
): T {
  const complete = lifecycle.partial ? helpers.partial(schema) : schema
  return lifecycle.committed ? helpers.committed(complete) : complete
}
