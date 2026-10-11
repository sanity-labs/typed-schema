import {type Path} from '@sanity-labs/typed-schema'
import {
  findNodeAtLocation,
  getNodeValue,
  type Node,
  parseTree,
  type ParseError,
  printParseErrorCode,
} from 'jsonc-parser'

type Range = {from: number; to: number}

// HuJSON: JSON plus comments and trailing commas
const PARSE_OPTIONS = {allowTrailingComma: true, disallowComments: false}

/**
 * Parses HuJSON input. Returns the value, or the first syntax error with
 * its position.
 */
export function parseInput(
  text: string,
): {ok: true; value: unknown} | {ok: false; message: string; range: Range} {
  const errors: ParseError[] = []
  const root = parseTree(text, errors, PARSE_OPTIONS)
  const [error] = errors
  if (error || !root) {
    const offset = error?.offset ?? 0
    return {
      ok: false,
      message: error ? printParseErrorCode(error.error) : 'Empty input',
      range: {from: offset, to: offset + (error?.length ?? 0)},
    }
  }
  return {ok: true, value: getNodeValue(root)}
}

/** All syntax errors in HuJSON input, for the editor's linter. */
export function syntaxErrors(text: string): {message: string; range: Range}[] {
  const errors: ParseError[] = []
  parseTree(text, errors, PARSE_OPTIONS)
  return errors.map(error => ({
    message: printParseErrorCode(error.error),
    range: {from: error.offset, to: error.offset + error.length},
  }))
}

/**
 * Finds the range to underline for a parse error path. Array items are
 * addressed by index or, for keyed arrays, by their `_key`.
 *
 * Objects and arrays are not underlined whole: an object points at its
 * `_type` value when it has one, otherwise at its opening brace. When a field
 * or item is missing, the error points at the opening brace of the object or
 * array that should contain it.
 */
export function locatePath(text: string, path: Path): Range | null {
  let node = parseTree(text, [], PARSE_OPTIONS)
  if (!node) return null

  for (const segment of path) {
    let next: Node | undefined
    if (node.type === 'object' && typeof segment === 'string') {
      next = findNodeAtLocation(node, [segment])
    } else if (node.type === 'array') {
      next =
        typeof segment === 'number'
          ? node.children?.[segment]
          : typeof segment === 'object'
            ? node.children?.[segment.index]
            : node.children?.find(
                item =>
                  item.type === 'object' &&
                  findNodeAtLocation(item, ['_key'])?.value === segment,
              )
    }
    if (!next) {
      return node.type === 'object' || node.type === 'array'
        ? openingBracket(node)
        : anchor(node)
    }
    node = next
  }
  return anchor(node)
}

function openingBracket(node: Node): Range {
  return {from: node.offset, to: node.offset + 1}
}

function anchor(node: Node): Range {
  if (node.type === 'object') {
    const type = findNodeAtLocation(node, ['_type'])
    if (type) return {from: type.offset, to: type.offset + type.length}
  }
  if (node.type === 'object' || node.type === 'array') {
    return openingBracket(node)
  }
  return {from: node.offset, to: node.offset + node.length}
}
