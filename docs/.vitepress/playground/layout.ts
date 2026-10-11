import {ref, watch} from 'vue'

export interface PanelLayout {
  /** Width of the schema column, in percent */
  schemaWidth: number
  /** Height of the parse result panel, in pixels */
  resultHeight: number
}

const STORAGE_KEY = 'typed-schema-playground-layout'
const DEFAULTS: PanelLayout = {
  schemaWidth: 50,
  resultHeight: 200,
}

/** Panel sizes, remembered in this browser */
export function usePanelLayout() {
  const layout = ref<PanelLayout>({...DEFAULTS, ...load()})
  watch(layout, save, {deep: true})
  return layout
}

/**
 * Tracks a pointer drag that starts on a resize handle and reports how far
 * it has moved from where it started.
 */
export function startDrag(
  event: PointerEvent,
  cursor: 'col-resize' | 'row-resize',
  onMove: (dx: number, dy: number) => void,
) {
  if (event.button !== 0) return
  event.preventDefault()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const {clientX: startX, clientY: startY} = event
  // keep the resize cursor and stop text selection while dragging, even
  // when the pointer moves faster than the handle
  const {style} = document.body
  const previous = {cursor: style.cursor, userSelect: style.userSelect}
  style.cursor = cursor
  style.userSelect = 'none'

  const move = (e: PointerEvent) =>
    onMove(e.clientX - startX, e.clientY - startY)
  const end = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', end)
    handle.removeEventListener('pointercancel', end)
    style.cursor = previous.cursor
    style.userSelect = previous.userSelect
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', end)
  handle.addEventListener('pointercancel', end)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export const SCHEMA_WIDTH = {min: 20, max: 80}
export const RESULT_HEIGHT = {min: 48, max: 2000}

function load(): Partial<PanelLayout> {
  let stored: unknown
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
  if (typeof stored !== 'object' || stored === null) return {}
  const {schemaWidth, resultHeight} = stored as Record<string, unknown>
  // stored values may be from an older version, or edited by hand
  return {
    ...(isFiniteNumber(schemaWidth) && {
      schemaWidth: clamp(schemaWidth, SCHEMA_WIDTH.min, SCHEMA_WIDTH.max),
    }),
    ...(isFiniteNumber(resultHeight) && {
      resultHeight: clamp(resultHeight, RESULT_HEIGHT.min, RESULT_HEIGHT.max),
    }),
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function save(layout: PanelLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // storage can be unavailable, for example in private windows
  }
}
