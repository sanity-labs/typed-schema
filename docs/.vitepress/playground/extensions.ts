import {autocompletion} from '@codemirror/autocomplete'
import {typescriptLanguage} from '@codemirror/lang-javascript'
import {highlightingFor} from '@codemirror/language'
import {linter} from '@codemirror/lint'
import {type EditorState, type Extension} from '@codemirror/state'
import {EditorView, hoverTooltip} from '@codemirror/view'
import {highlightCode} from '@lezer/highlight'
import {type WorkerShape} from '@valtown/codemirror-ts/worker'

import {sortSystemFields} from '../sortSystemFields'

/**
 * CodeMirror extensions that talk to the TypeScript worker.
 *
 * `@valtown/codemirror-ts` ships equivalents, but its main entry imports
 * `typescript`, which would pull the compiler into the page bundle. These
 * only use the worker's API, so TypeScript stays in the worker.
 */
export function typescriptExtensions(
  worker: WorkerShape,
  path: string,
): Extension[] {
  return [
    // the caller writes the initial contents before creating the view
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        worker.updateFile({path, code: update.state.doc.toString()})
      }
    }),
    linter(() => worker.getLints({path, diagnosticCodesToIgnore: []}), {
      delay: 300,
    }),
    autocompletion({
      override: [
        context =>
          worker.getAutocompletion({
            path,
            context: {pos: context.pos, explicit: context.explicit},
          }),
      ],
    }),
    hoverTooltip(async (view, pos) => {
      const info = await worker.getHover({path, pos})
      const displayed = info?.quickInfo?.displayParts
        ?.map((part: {text: string}) => part.text)
        .join('')
      const signature = displayed && sortSystemFields(displayed)
      if (!info || !signature) return null
      // show `{@link Name}` tags as just the name
      const docs = info.quickInfo?.documentation
        ?.map((part: {text: string}) => part.text)
        .join('')
        .replace(/\{@link\s+([^}]*?)\s*\}/g, '$1')
      return {
        pos: info.start,
        end: info.end,
        create: () => {
          const dom = document.createElement('div')
          dom.className = 'cm-ts-hover'
          dom.appendChild(highlightSignature(view.state, signature))
          if (docs) {
            const docsEl = dom.appendChild(document.createElement('div'))
            docsEl.className = 'cm-ts-hover-docs'
            docsEl.textContent = docs
          }
          return {dom}
        },
      }
    }),
  ]
}

/**
 * Renders a quick info signature with the editor's own syntax highlighting.
 * A leading kind label such as `(property)` is not valid TypeScript, so it is
 * kept as plain text.
 */
function highlightSignature(
  state: EditorState,
  signature: string,
): HTMLElement {
  const label = /^\([\w ]+\) /.exec(signature)?.[0] ?? ''
  const code = highlightTypeScript(state, signature.slice(label.length))
  if (label) code.prepend(label)
  return code
}

/**
 * Renders TypeScript source as a `<code>` element, highlighted with the
 * highlight style active in `state`.
 */
export function highlightTypeScript(
  state: EditorState,
  source: string,
): HTMLElement {
  const code = document.createElement('code')
  highlightCode(
    source,
    typescriptLanguage.parser.parse(source),
    {style: tags => highlightingFor(state, tags)},
    (text, classes) => {
      if (!classes) return code.append(text)
      const span = code.appendChild(document.createElement('span'))
      span.className = classes
      span.textContent = text
    },
    () => code.append('\n'),
  )
  return code
}
