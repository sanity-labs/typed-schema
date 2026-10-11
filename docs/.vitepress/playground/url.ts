import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string'

import {formatLifecycle, type Lifecycle, parseLifecycle} from './lifecycle'

/**
 * What a playground link holds:
 * `/playground?example=event&tab=validate&lifecycle=committed-partial#code=…&input=…`
 *
 * The example, tab and lifecycle are query parameters; a complete,
 * uncommitted document is the default and is left out. Edited code and input go in the
 * hash, compressed with lz-string like the TypeScript playground does, so
 * they are never sent to the server. Unedited code and input are left out,
 * which keeps links to plain examples short.
 */
export interface PlaygroundState {
  example: string | null
  tab: 'type' | 'input'
  lifecycle: Lifecycle
  code: string | null
  input: string | null
}

/**
 * Reads the playground state from the current URL. `unreadable` is set when
 * the hash has code or input that does not decode, for example a link cut
 * short when it was copied.
 */
export function readUrl(
  location: {search: string; hash: string} = window.location,
): PlaygroundState & {unreadable: boolean} {
  const params = new URLSearchParams(location.search)
  const hash = readHash(location.hash)
  const code = decode(hash.get('code'))
  const input = decode(hash.get('input'))
  return {
    example: params.get('example'),
    tab: params.get('tab') === 'validate' ? 'input' : 'type',
    lifecycle: parseLifecycle(params.get('lifecycle')),
    code,
    input,
    unreadable:
      (hash.has('code') && code === null) ||
      (hash.has('input') && input === null),
  }
}

export function writeUrl(state: PlaygroundState) {
  const url = buildUrl(state, window.location.href)
  // keep VitePress's router state, and replace so edits don't fill history
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', url)
  }
}

/** The link for `state`, keeping other parts of `current` */
export function buildUrl(state: PlaygroundState, current: string): URL {
  const url = new URL(current)
  if (state.example) url.searchParams.set('example', state.example)
  else url.searchParams.delete('example')
  if (state.tab === 'input') url.searchParams.set('tab', 'validate')
  else url.searchParams.delete('tab')
  const lifecycle = formatLifecycle(state.lifecycle)
  if (lifecycle) url.searchParams.set('lifecycle', lifecycle)
  else url.searchParams.delete('lifecycle')

  const hash = [
    state.code === null
      ? ''
      : `code=${compressToEncodedURIComponent(state.code)}`,
    state.input === null
      ? ''
      : `input=${compressToEncodedURIComponent(state.input)}`,
  ].filter(Boolean)
  url.hash = hash.join('&')
  return url
}

// Not URLSearchParams: it decodes "+" as a space, and "+" is part of
// lz-string's URI-safe alphabet
function readHash(hash: string): Map<string, string> {
  const entries = hash
    .replace(/^#/, '')
    .split('&')
    .map(part => {
      const index = part.indexOf('=')
      return index === -1
        ? undefined
        : ([part.slice(0, index), part.slice(index + 1)] as const)
    })
    .filter(entry => entry !== undefined)
  return new Map(entries)
}

function decode(value: string | undefined): string | null {
  if (!value) return null
  // returns null or '' for input that is not valid lz-string data
  return decompressFromEncodedURIComponent(value) || null
}
