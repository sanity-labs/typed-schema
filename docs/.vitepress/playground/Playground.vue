<script setup lang="ts">
import {javascript} from '@codemirror/lang-javascript'
import {type Diagnostic, linter, lintGutter} from '@codemirror/lint'
import {
  Compartment,
  EditorState,
  type Extension,
  StateEffect,
} from '@codemirror/state'
import {oneDark} from '@codemirror/theme-one-dark'
import {EditorView} from '@codemirror/view'
import {formatPath} from '@sanity-labs/typed-schema'
import {jsonc} from '@shopify/lang-jsonc'
import {basicSetup} from 'codemirror'
import * as Comlink from 'comlink'
import {useData} from 'vitepress'
import {computed, onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue'

import {highlightTypeScript, typescriptExtensions} from './extensions'
import {formatDocument, formatKeymap} from './format'
import {locatePath, syntaxErrors} from './hujson'
import {
  clamp,
  type PanelLayout,
  RESULT_HEIGHT,
  SCHEMA_WIDTH,
  startDrag,
  usePanelLayout,
} from './layout'
import {
  COMPLETENESS,
  type Lifecycle,
  lifecycleCode,
  lifecycleDescription,
  PERSISTENCE,
} from './lifecycle'
import {presets} from './presets'
import {createRunner, type RunError, type RunResult} from './runResult'
import {readUrl, writeUrl} from './url'
import {type PlaygroundWorker} from './worker'

const PATH = '/index.ts'
const RUN_DELAY_MS = 400
const INFER_DELAY_MS = 300
const URL_DELAY_MS = 300

const {isDark} = useData()

const schemaContainer = ref<HTMLDivElement>()
const jsonContainer = ref<HTMLDivElement>()
const status = ref<'loading' | 'ready' | 'error'>('loading')
// The example, tab and any edits are kept in the URL, so the current
// playground can be shared as a link (see url.ts)
const initial = readUrl()
const selected = ref(
  Math.max(
    presets.findIndex(preset => preset.id === initial.example),
    0,
  ),
)
const tab = ref<'type' | 'input'>(initial.tab)
// Code from a link runs only after the visitor asks for it: validation runs
// it in a worker on this origin, where it could make requests or read
// storage
const awaitingConsent = ref(initial.code !== null)
// shown until the first edit, when the editors no longer hold the fallback
const unreadableLink = ref(initial.unreadable)
// partial() and committed() applied in both tabs; only offered for document
// schemas
const lifecycle = shallowRef<Lifecycle>(initial.lifecycle)
const isDocument = ref(false)
const lifecycleNote = computed(() => ({
  code: lifecycleCode(lifecycle.value, 'schema'),
  description: lifecycleDescription(lifecycle.value),
}))

function setLifecycle(change: Partial<Lifecycle>) {
  lifecycle.value = {...lifecycle.value, ...change}
}
// Inferred type tab: Parsed<> (with $refSchema) instead of Infer<>; only
// offered when the schema has references
const refSchema = ref(initial.refSchema)
const hasRefSchema = ref(false)
const shareLabel = ref('Share')
const result = shallowRef<RunResult | null>(null)
// Infer<typeof default export>, expanded
const inferredType = ref<string | null>(null)
const inferredContainer = ref<HTMLElement>()
const panes = ref<HTMLElement>()
const layout = usePanelLayout()

const theme = new Compartment()
// tells the JSON editor's parse error linter that new results arrived
const parseResultsChanged = StateEffect.define<null>()
const runner = createRunner()
let schemaView: EditorView | undefined
let jsonView: EditorView | undefined
let innerWorker: Worker | undefined
let worker: PlaygroundWorker | undefined
let runTimer: ReturnType<typeof setTimeout> | undefined
let runId = 0
let inferTimer: ReturnType<typeof setTimeout> | undefined
let inferId = 0

// Writes the current state to the URL. Code and input are only included
// when they differ from the selected example's.
function syncUrl() {
  const preset = presets[selected.value]
  const code = schemaView?.state.doc.toString() ?? preset.code
  const input = jsonView?.state.doc.toString() ?? preset.json
  writeUrl({
    example: preset.id,
    tab: tab.value,
    lifecycle: lifecycle.value,
    refSchema: refSchema.value,
    code: code === preset.code ? null : code,
    input: input === preset.json ? null : input,
  })
}

let urlTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSyncUrl() {
  clearTimeout(urlTimer)
  urlTimer = setTimeout(syncUrl, URL_DELAY_MS)
}

async function share() {
  clearTimeout(urlTimer)
  syncUrl()
  const ok = await copyText(window.location.href)
  // when copying is blocked, the link is still in the address bar
  shareLabel.value = ok ? 'Copied' : 'Copy failed'
  setTimeout(() => (shareLabel.value = 'Share'), 2000)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // older fallback for when the Clipboard API is unavailable or denied
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  }
}

function sharedExtensions(): Extension[] {
  return [basicSetup, theme.of(isDark.value ? oneDark : []), lintGutter()]
}

function scheduleRun(delay = RUN_DELAY_MS) {
  clearTimeout(runTimer)
  // validation only runs while the Validate tab is open
  if (tab.value === 'input' && !awaitingConsent.value) {
    runTimer = setTimeout(runParse, delay)
  }
}

function runSharedCode() {
  awaitingConsent.value = false
  scheduleRun(0)
}

function scheduleInfer(delay = INFER_DELAY_MS) {
  clearTimeout(inferTimer)
  inferTimer = setTimeout(async () => {
    if (!worker) return
    const id = ++inferId
    const next = await worker.inferredType(
      PATH,
      lifecycle.value,
      refSchema.value,
    )
    if (id !== inferId) return
    inferredType.value = next.type
    isDocument.value = next.isDocument
    hasRefSchema.value = next.hasRefSchema
  }, delay)
}

async function runParse() {
  if (!worker || !schemaView || !jsonView) return
  const id = ++runId
  const js = await worker.transpile(schemaView.state.doc.toString())
  const next = await runner.run(
    js,
    jsonView.state.doc.toString(),
    lifecycle.value,
  )
  if (id !== runId || next === null) return
  result.value = next
  jsonView.dispatch({effects: parseResultsChanged.of(null)})
}

// Underlines the value at each parse error path in the JSON editor
function parseErrorDiagnostics(view: EditorView): Diagnostic[] {
  const current = result.value
  if (current?.status !== 'fail') return []
  return current.errors.flatMap(error => {
    const range = locatePath(view.state.doc.toString(), error.path)
    return range
      ? [
          {
            ...range,
            severity: 'error' as const,
            message: `${formatPath(error.path)}: ${error.message}`,
          },
        ]
      : []
  })
}

function revealError(error: RunError) {
  if (!jsonView) return
  const range = locatePath(jsonView.state.doc.toString(), error.path)
  if (!range) return
  jsonView.dispatch({
    selection: {anchor: range.from, head: range.to},
    scrollIntoView: true,
  })
  jsonView.focus()
}

function resizeColumns(event: PointerEvent) {
  const start = layout.value.schemaWidth
  const width = panes.value?.clientWidth ?? 1
  startDrag(event, 'col-resize', dx => {
    layout.value.schemaWidth = clamp(
      start + (dx / width) * 100,
      SCHEMA_WIDTH.min,
      SCHEMA_WIDTH.max,
    )
  })
}

// The handle sits above the result panel, so dragging up grows it
function resizeResult(event: PointerEvent) {
  const start = layout.value.resultHeight
  const panel = (event.currentTarget as HTMLElement).parentElement
  const max = (panel?.clientHeight ?? 600) - 120
  startDrag(event, 'row-resize', (_dx, dy) => {
    layout.value.resultHeight = clamp(start - dy, RESULT_HEIGHT.min, max)
  })
}

// Arrow keys move a focused handle
function nudge(key: keyof PanelLayout, event: KeyboardEvent) {
  const steps: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    ArrowDown: -1,
  }
  const step = steps[event.key]
  if (step === undefined) return
  event.preventDefault()
  layout.value[key] =
    key === 'schemaWidth'
      ? clamp(layout.value[key] + step * 2, SCHEMA_WIDTH.min, SCHEMA_WIDTH.max)
      : clamp(
          layout.value[key] + step * 16,
          RESULT_HEIGHT.min,
          RESULT_HEIGHT.max,
        )
}

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const formatShortcut = isMac ? '⌘S or ⇧⌥F' : 'Ctrl+S or Shift+Alt+F'

// Formats the schema, and the input when the Validate tab is open
async function formatAll() {
  const jobs = []
  if (schemaView) jobs.push(formatDocument(schemaView, 'typescript'))
  if (jsonView && tab.value === 'input') {
    jobs.push(formatDocument(jsonView, 'jsonc'))
  }
  await Promise.all(jobs)
}

function replaceDoc(view: EditorView | undefined, text: string) {
  view?.dispatch({changes: {from: 0, to: view.state.doc.length, insert: text}})
}

onMounted(async () => {
  innerWorker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
  })
  worker = Comlink.wrap<PlaygroundWorker>(innerWorker)
  try {
    await worker.initialize()
  } catch (err) {
    status.value = 'error'
    throw err
  }

  const preset = presets[selected.value]
  const code = initial.code ?? preset.code
  await worker.updateFile({path: PATH, code})

  const runOnChange = EditorView.updateListener.of(update => {
    if (update.docChanged) {
      unreadableLink.value = false
      scheduleRun()
      scheduleSyncUrl()
    }
  })

  schemaView = new EditorView({
    parent: schemaContainer.value,
    state: EditorState.create({
      doc: code,
      extensions: [
        sharedExtensions(),
        javascript({typescript: true}),
        typescriptExtensions(worker, PATH),
        formatKeymap('typescript'),
        runOnChange,
        EditorView.updateListener.of(update => {
          if (update.docChanged) scheduleInfer()
        }),
      ],
    }),
  })
  jsonView = new EditorView({
    parent: jsonContainer.value,
    state: EditorState.create({
      doc: initial.input ?? preset.json,
      extensions: [
        sharedExtensions(),
        jsonc(),
        formatKeymap('jsonc'),
        linter(view =>
          syntaxErrors(view.state.doc.toString()).map(({message, range}) => ({
            ...range,
            severity: 'error' as const,
            message,
          })),
        ),
        linter(parseErrorDiagnostics, {
          delay: 0,
          needsRefresh: update =>
            update.transactions.some(tr =>
              tr.effects.some(effect => effect.is(parseResultsChanged)),
            ),
        }),
        runOnChange,
      ],
    }),
  })
  status.value = 'ready'
  scheduleRun(0)
  scheduleInfer(0)
})

watch(isDark, dark => {
  for (const view of [schemaView, jsonView]) {
    view?.dispatch({effects: theme.reconfigure(dark ? oneDark : [])})
  }
})

// Highlighted with the schema editor's current highlight style, so it is
// re-rendered when the theme changes
watch(
  [inferredType, inferredContainer, isDark],
  ([type, container]) => {
    if (type && container && schemaView) {
      container.replaceChildren(highlightTypeScript(schemaView.state, type))
    }
  },
  {flush: 'post'},
)

watch(selected, index => {
  awaitingConsent.value = false
  unreadableLink.value = false
  const preset = presets[index]
  replaceDoc(schemaView, preset.code)
  replaceDoc(jsonView, preset.json)
})

watch(tab, current => {
  if (current === 'input') scheduleRun(0)
})

watch([selected, tab], syncUrl)

watch(lifecycle, () => {
  scheduleInfer(0)
  scheduleRun(0)
  syncUrl()
})

watch(refSchema, () => {
  scheduleInfer(0)
  syncUrl()
})

onBeforeUnmount(() => {
  clearTimeout(runTimer)
  clearTimeout(inferTimer)
  clearTimeout(urlTimer)
  schemaView?.destroy()
  jsonView?.destroy()
  innerWorker?.terminate()
  runner.dispose()
})
</script>

<template>
  <div class="playground">
    <div class="toolbar">
      <label>
        Example
        <select v-model="selected">
          <option v-for="(preset, i) in presets" :key="preset.id" :value="i">
            {{ preset.name }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="toolbar-button"
        :disabled="status !== 'ready'"
        :title="`Format with Prettier (${formatShortcut})`"
        @click="formatAll"
      >
        <!-- json, from @sanity/icons (MIT license) -->
        <svg
          aria-hidden="true"
          viewBox="0 0 25 25"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        >
          <path
            d="M11 5.5H9.5C8.39543 5.5 7.5 6.39543 7.5 7.5V12.5M7.5 12.5H4M7.5 12.5V17.5C7.5 18.6046 8.39543 19.5 9.5 19.5H11M14 5.5H15.5C16.6046 5.5 17.5 6.39543 17.5 7.5V12.5M17.5 12.5H21M17.5 12.5V17.5C17.5 18.6046 16.6046 19.5 15.5 19.5H14"
          />
        </svg>
        Format
      </button>
      <button
        type="button"
        class="toolbar-button"
        :disabled="status !== 'ready'"
        title="Copy a link to this playground, including your edits"
        @click="share"
      >
        <!-- share, from @sanity/icons (MIT license) -->
        <svg
          aria-hidden="true"
          viewBox="0 0 25 25"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        >
          <path
            d="M15 10.5H18.5V19.5H6.5L6.5 10.5H10M12.5 16V3.5M9 7L12.5 3.5L16 7"
          />
        </svg>
        <span aria-live="polite">{{ shareLabel }}</span>
      </button>
      <span v-if="unreadableLink" class="status error">
        Part of this link could not be read, so the example is shown instead.
      </span>
      <span v-if="status === 'loading'" class="status">
        Loading TypeScript…
      </span>
      <span v-else-if="status === 'error'" class="status error">
        TypeScript failed to load. See the browser console.
      </span>

      <details class="help">
        <summary aria-label="About the playground">
          <!-- help-circle, from @sanity/icons (MIT license) -->
          <svg
            aria-hidden="true"
            viewBox="0 0 25 25"
            width="25"
            height="25"
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          >
            <path
              d="M12.5 13C12.5 11 14 11.5 14 10C14 9.34375 13.5 8.5 12.5 8.5C11.5 8.5 11 9 10.5 9.5M12.5 16V14.5M20.5 12.5C20.5 16.9183 16.9183 20.5 12.5 20.5C8.08172 20.5 4.5 16.9183 4.5 12.5C4.5 8.08172 8.08172 4.5 12.5 4.5C16.9183 4.5 20.5 8.08172 20.5 12.5Z"
            />
          </svg>
        </summary>
        <div class="help-panel">
          <p>
            Write a schema and see what TypeScript infers. Hover a name to see
            its type; type errors show up as you type. TypeScript 6 checks the
            code in your browser against the package declarations built with
            this site.
          </p>
          <p>
            <strong>Inferred type</strong> shows
            <code>Infer&lt;typeof schema&gt;</code> for the schema you export as
            the default export. <strong>Validate</strong> runs that schema
            against JSON input with <code>parse</code> and lists any problems.
            The input may contain comments and trailing commas.
          </p>
          <p>
            For a document schema, both tabs can apply the two lifecycle
            transforms: <strong>Partial</strong> (<code>partial()</code>, every
            field optional) and <strong>Committed</strong>
            (<code>committed()</code>, system fields required).
          </p>
          <p>
            For a schema with references, <strong>Show $refSchema</strong>
            switches the inferred type to
            <code>Parsed&lt;typeof schema&gt;</code>, the type
            <code>parse</code> returns. Its reference values have a
            <code>$refSchema</code> key with the schema of the referenced
            document, which <code>Infer</code> leaves out.
          </p>
          <p>
            <strong>Share</strong> copies a link to the playground. Your code
            and input are saved in the link, so whoever opens it sees what you
            see.
          </p>
          <p>
            <strong>Format</strong> formats the code with Prettier, using this
            repo's formatting options. In an editor, <kbd>Ctrl</kbd>+<kbd
              >S</kbd
            >
            or <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd> formats it too
            (<kbd>⌘</kbd>+<kbd>S</kbd> or <kbd>⇧</kbd>+<kbd>⌥</kbd>+<kbd>F</kbd>
            on macOS).
          </p>
        </div>
      </details>
    </div>

    <div
      ref="panes"
      class="panes"
      :style="{'--schema-width': `${layout.schemaWidth}%`}"
    >
      <div class="pane">
        <div class="pane-label">Schema</div>
        <div ref="schemaContainer" class="editor" />
      </div>

      <div
        class="gutter gutter-col"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the schema panel"
        tabindex="0"
        @pointerdown="resizeColumns"
        @keydown="nudge('schemaWidth', $event)"
      />

      <div class="pane side-pane">
        <div class="tabs" role="tablist" aria-label="Output">
          <button
            id="playground-tab-type"
            type="button"
            role="tab"
            aria-controls="playground-panel-type"
            :aria-selected="tab === 'type'"
            :class="{active: tab === 'type'}"
            @click="tab = 'type'"
          >
            Inferred type
          </button>
          <button
            id="playground-tab-input"
            type="button"
            role="tab"
            aria-controls="playground-panel-input"
            :aria-selected="tab === 'input'"
            :class="{active: tab === 'input'}"
            @click="tab = 'input'"
          >
            Validate
          </button>
        </div>

        <div v-if="isDocument" class="lifecycle-bar">
          <div
            class="lifecycle-options"
            role="radiogroup"
            aria-label="Completeness"
          >
            <button
              v-for="option in COMPLETENESS"
              :key="option.label"
              type="button"
              role="radio"
              :aria-checked="lifecycle.partial === option.partial"
              :class="{active: lifecycle.partial === option.partial}"
              @click="setLifecycle({partial: option.partial})"
            >
              {{ option.label }}
            </button>
          </div>
          <div
            class="lifecycle-options"
            role="radiogroup"
            aria-label="Persistence"
          >
            <button
              v-for="option in PERSISTENCE"
              :key="option.label"
              type="button"
              role="radio"
              :aria-checked="lifecycle.committed === option.committed"
              :class="{active: lifecycle.committed === option.committed}"
              @click="setLifecycle({committed: option.committed})"
            >
              {{ option.label }}
            </button>
          </div>
          <p class="lifecycle-note">
            <code class="code-badge">{{ lifecycleNote.code }}</code>
            {{ lifecycleNote.description }}
          </p>
        </div>

        <div
          v-show="tab === 'type'"
          id="playground-panel-type"
          class="tab-panel"
          role="tabpanel"
          aria-labelledby="playground-tab-type"
        >
          <label v-if="hasRefSchema" class="ref-schema-toggle">
            <input v-model="refSchema" type="checkbox" />
            Show <code>$refSchema</code>
            <code class="code-badge ref-schema-type"
              >{{ refSchema ? 'Parsed' : 'Infer' }}&lt;typeof schema&gt;</code
            >
          </label>
          <pre
            v-if="inferredType"
            ref="inferredContainer"
            class="inferred-code"
          />
          <p v-else-if="status === 'ready'" class="empty">
            Export a schema as the default export to see its inferred type, for
            example <code>export default Pet</code>.
          </p>
        </div>

        <div
          v-show="tab === 'input'"
          id="playground-panel-input"
          class="tab-panel"
          role="tabpanel"
          aria-labelledby="playground-tab-input"
        >
          <div ref="jsonContainer" class="editor json-editor" />
          <div
            class="gutter gutter-row"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize the result panel"
            tabindex="0"
            @pointerdown="resizeResult"
            @keydown="nudge('resultHeight', $event)"
          />
          <div
            class="result"
            aria-live="polite"
            :style="{height: `${layout.resultHeight}px`}"
          >
            <div v-if="awaitingConsent" class="consent">
              <p>
                This link includes schema code. Validating the input runs that
                code in your browser, so it waits until you choose to run it.
              </p>
              <button
                type="button"
                class="toolbar-button"
                :disabled="status !== 'ready'"
                @click="runSharedCode"
              >
                Run the code
              </button>
            </div>
            <p v-else-if="!result" class="muted">Checking…</p>
            <template v-else-if="result.status === 'ok'">
              <p class="ok">The input matches the schema.</p>
              <details>
                <summary>Parsed value</summary>
                <pre>{{ result.value }}</pre>
              </details>
            </template>
            <template v-else-if="result.status === 'fail'">
              <p class="fail">
                {{ result.errors.length }}
                {{ result.errors.length === 1 ? 'problem' : 'problems' }}
              </p>
              <ul class="errors">
                <li v-for="(error, i) in result.errors" :key="i">
                  <button type="button" @click="revealError(error)">
                    <code>{{ formatPath(error.path) }}</code>
                    <span>{{ error.message }}</span>
                    <span class="muted">{{ error.code }}</span>
                  </button>
                </li>
              </ul>
            </template>
            <p v-else-if="result.status === 'invalid-json'" class="fail">
              The input is not valid JSON: {{ result.message }}
            </p>
            <p v-else-if="result.status === 'no-schema'" class="muted">
              Export the schema to validate against as the default export, for
              example <code>export default Pet</code>.
            </p>
            <p v-else-if="result.status === 'error'" class="fail">
              The schema code threw an error: {{ result.message }}
            </p>
            <p v-else-if="result.status === 'timeout'" class="fail">
              Stopped after 2 seconds. Check the schema code for an infinite
              loop.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 14px;
}

.toolbar select {
  margin-left: 8px;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 10px 1px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.toolbar-button:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: default;
}

.status {
  color: var(--vp-c-text-2);
}

.help {
  position: relative;
  margin-left: auto;
}

.help summary {
  display: flex;
  color: var(--vp-c-text-2);
  cursor: pointer;
  list-style: none;
}

.help summary::-webkit-details-marker {
  display: none;
}

.help summary:hover,
.help[open] summary {
  color: var(--vp-c-text-1);
}

.help-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10;
  width: min(420px, calc(100vw - 48px));
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
  font-size: 14px;
  line-height: 1.5;
}

.help-panel p + p {
  margin-top: 8px;
}

.status.error {
  color: var(--vp-c-danger-1);
}

.panes {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, var(--schema-width)) 1px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  min-height: 0;
}

@media (max-width: 960px) {
  .panes {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }
}

.pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

@media (max-width: 960px) {
  .side-pane {
    border-top: 1px solid var(--vp-c-divider);
  }

  .gutter-col {
    display: none !important;
  }
}

.gutter {
  position: relative;
  z-index: 1;
  flex: none;
  background: var(--vp-c-divider);
  touch-action: none;
}

/* a wider, invisible hit area around the 1px line */
.gutter::before {
  content: '';
  position: absolute;
}

.gutter-col {
  width: 1px;
  cursor: col-resize;
}

.gutter-col::before {
  inset: 0 -4px;
}

.gutter-row {
  height: 1px;
  cursor: row-resize;
}

.gutter-row::before {
  inset: -4px 0;
}

.gutter:hover,
.gutter:focus-visible {
  outline: none;
  background: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.pane-label {
  padding: 4px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tabs {
  display: flex;
  flex: none;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tabs button {
  margin-bottom: -1px;
  padding: 4px 12px;
  border-bottom: 2px solid transparent;
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tabs button:hover {
  color: var(--vp-c-text-1);
}

.tabs button.active {
  border-bottom-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
}

.lifecycle-bar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.lifecycle-options {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.lifecycle-options button {
  padding: 2px 10px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.lifecycle-options button + button {
  border-left: 1px solid var(--vp-c-divider);
}

.lifecycle-options button:hover {
  color: var(--vp-c-text-1);
}

.lifecycle-options button.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.lifecycle-note {
  flex-basis: 100%;
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.tab-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.ref-schema-toggle {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  cursor: pointer;
}

.ref-schema-type {
  margin-left: auto;
}

/* a schema expression shown next to a description */
.code-badge {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 1.5;
}

.empty {
  margin: 0;
  padding: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.editor {
  flex: 1;
  min-height: 0;
}

@media (max-width: 960px) {
  .editor {
    flex: none;
    height: 480px;
  }

  .json-editor {
    height: 320px;
  }

  .inferred-code {
    flex: none;
    max-height: 480px;
  }
}

.editor :deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
}

.editor :deep(.cm-scroller) {
  font-family: var(--vp-font-family-mono);
}

.editor :deep(.cm-tooltip) {
  max-width: 640px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-elv);
  color: var(--vp-c-text-1);
  box-shadow: var(--vp-shadow-3);
}

.editor :deep(.cm-ts-hover) {
  max-height: 320px;
  overflow: auto;
  padding: 6px 10px;
  font-size: 13px;
}

.editor :deep(.cm-ts-hover code) {
  display: block;
  font-family: var(--vp-font-family-mono);
  white-space: pre-wrap;
}

.editor :deep(.cm-ts-hover-docs) {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
}

.inferred-code {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 8px 12px;
  overflow: auto;
  overscroll-behavior: contain;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre;
}

.result {
  flex: none;
  overflow: auto;
  padding: 12px;
  font-size: 14px;
}

.result p {
  margin: 0;
}

.result .muted,
.errors .muted {
  color: var(--vp-c-text-2);
}

.consent {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.result .ok {
  color: var(--vp-c-success-1);
  font-weight: 600;
}

.result .fail {
  color: var(--vp-c-danger-1);
  font-weight: 600;
}

.result details {
  margin-top: 8px;
}

.result summary {
  cursor: pointer;
  color: var(--vp-c-text-2);
}

.result pre {
  margin: 8px 0 0;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  white-space: pre-wrap;
}

.errors {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.errors button {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  text-align: left;
}

.errors button:hover {
  background: var(--vp-c-bg-soft);
}

.errors .muted {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
</style>
