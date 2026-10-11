/**
 * Fields Sanity manages, in the order they are shown first. Other fields
 * starting with `_` follow them, then the rest. TypeScript prints object
 * members in an order it does not guarantee (and that differs between
 * TypeScript 6 and 7), so the docs and playground reorder them for display.
 */
const SYSTEM_FIELDS = [
  '_type',
  '_key',
  '_id',
  '_ref',
  '_weak',
  '_createdAt',
  '_updatedAt',
  '_rev',
]

const MEMBER_KEY = /^\s*(?:readonly\s+)?["']?([\w$]+)["']?\??:/
const CLOSING = /^\s*[}\])>]/

/**
 * Moves Sanity's system fields, and then any other field starting with `_`,
 * to the top of every multi-line object type in a printed type, nested ones
 * included. Every other member keeps its original order. Text without a
 * multi-line object is returned unchanged.
 */
export function sortSystemFields(text: string): string {
  return sortLines(text.split('\n')).join('\n')
}

function sortLines(lines: string[]): string[] {
  const open = lines.findIndex(line => line.trimEnd().endsWith('{'))
  if (open === -1) return lines
  const baseIndent = indentOf(lines[open])
  const close = lines.findIndex(
    (line, index) =>
      index > open &&
      indentOf(line) === baseIndent &&
      line.trimStart().startsWith('}'),
  )
  const body = lines.slice(open + 1, close)
  if (close === -1 || body.length === 0) return lines

  // a member is a line at the body's indentation plus any deeper or closing
  // lines that follow it (the rest of a nested object or a multi-line type)
  const memberIndent = indentOf(body[0])
  const members: string[][] = []
  for (const line of body) {
    if (indentOf(line) === memberIndent && !CLOSING.test(line)) {
      members.push([line])
    } else {
      members.at(-1)?.push(line)
    }
  }

  // Array.prototype.sort is stable, so members of equal rank keep their order
  const sorted = members.map(sortLines).sort((a, b) => rank(a) - rank(b))

  return [
    ...lines.slice(0, open + 1),
    ...sorted.flat(),
    // the closing line may open the next object, as in `} | {`
    ...sortLines(lines.slice(close)),
  ]
}

function rank(member: string[]): number {
  const key = MEMBER_KEY.exec(member[0])?.[1]
  if (key === undefined || !key.startsWith('_')) return SYSTEM_FIELDS.length + 1
  const index = SYSTEM_FIELDS.indexOf(key)
  return index === -1 ? SYSTEM_FIELDS.length : index
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length
}
