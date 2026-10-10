type InspectOpts = {
  maxDepth?: number
  maxLength?: number
  maxFuncLength?: number
}

function cap<T>(
  arr: T[],
  length: number,
  buffer: number = 0,
): [included: T[], capLength: number] {
  return length + buffer < arr.length
    ? [arr.slice(0, length), arr.length - length]
    : [arr, 0]
}

function inspectArray(
  iterable: Iterable<unknown>,
  opts: InspectOpts = {},
): string {
  const {maxDepth = 3, maxLength = 2} = opts

  const array = Array.from(iterable)
  const [included, capped] = cap(array, maxLength, 1)

  const prefix = Array.isArray(iterable) ? '' : iterable.constructor.name
  return `${prefix}[${included
    .map(s => inspect(s, {maxDepth: maxDepth - 1, maxLength}))
    .join(', ')}${capped > 0 ? `, …(+${capped})` : ''}]`
}

function getEntries(val: any): [string, unknown][] {
  if (typeof val?.entries === 'function') return Array.from(val.entries())
  return Object.keys(val).map(k => [k, val[k]])
}

function inspectEnumerable(value: unknown, opts: InspectOpts = {}): string {
  const {maxDepth = 3, maxLength = 2} = opts

  const entries = getEntries(value).sort(([n1], [n2]) => n1.localeCompare(n2))

  const slice = entries.slice(
    0,
    Math.max(maxLength, maxLength - entries.length + 1),
  )
  const remaining = entries.length - slice.length

  const name = (value as any).constructor.name

  return `${name === 'Object' ? '' : name}{${slice
    .map(
      ([prop, propValue]) =>
        `${prop}: ${inspect(propValue, {maxDepth: maxDepth - 1, maxLength})}`,
    )
    .join(', ')}${remaining > 0 ? `, …(+${remaining})` : ''}}`
}

const truncate = (str: string, length: number) => {
  const ellipsis = '…'
  return str.length > length
    ? str.slice(0, length - ellipsis.length) + ellipsis
    : str
}

export function inspect(value: unknown, opts: InspectOpts = {}) {
  const {maxDepth = 3, maxLength = 2, maxFuncLength = 20} = opts
  const type = typeof value

  if (type === 'bigint') {
    return `BigInt("${value}")`
  }
  if (type === 'symbol') {
    return (value as any).toString()
  }
  if (
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    value === null ||
    value === undefined
  ) {
    return JSON.stringify(value)
  }
  if (typeof value === 'function') {
    return `${truncate(value.toString().replace(/\n+/g, ''), maxFuncLength)}`
  }
  // only nested containers count towards depth; primitives always print
  if (maxDepth <= 0) {
    return '…'
  }
  if (Array.isArray(value) || value instanceof Set) {
    return inspectArray(value, {maxDepth, maxLength})
  }
  return inspectEnumerable(value, {maxDepth, maxLength})
}
