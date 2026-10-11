import {Prec} from '@codemirror/state'
import {EditorView, keymap} from '@codemirror/view'

// The repo's oxfmt options (oxfmt.config.ts), injected at build time. oxfmt
// is native-only, so the playground formats with Prettier, whose output
// oxfmt matches; import sorting is the main thing Prettier leaves out.
declare const __FORMAT_OPTIONS__: Record<string, unknown>

export type Parser = 'typescript' | 'jsonc'

/**
 * Formats the editor's document with Prettier. Prettier is loaded the first
 * time this runs. Code that does not parse is left as it is; the editor's
 * linter already points at the syntax error.
 */
export async function formatDocument(view: EditorView, parser: Parser) {
  const [prettier, estree, language] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/estree'),
    parser === 'typescript'
      ? import('prettier/plugins/typescript')
      : import('prettier/plugins/babel'),
  ])
  const source = view.state.doc.toString()
  let result: {formatted: string; cursorOffset: number}
  try {
    result = await prettier.formatWithCursor(source, {
      ...__FORMAT_OPTIONS__,
      // trailing commas are allowed in the input, but keep it plain JSON
      ...(parser === 'jsonc' ? {trailingComma: 'none'} : {}),
      parser,
      plugins: [estree, language],
      cursorOffset: view.state.selection.main.head,
    })
  } catch {
    return
  }
  // skip if nothing changed, or if the user kept typing meanwhile
  if (result.formatted === source || view.state.doc.toString() !== source) {
    return
  }
  view.dispatch({
    changes: {from: 0, to: source.length, insert: result.formatted},
    selection: {
      anchor: Math.min(
        Math.max(result.cursorOffset, 0),
        result.formatted.length,
      ),
    },
    scrollIntoView: true,
  })
}

/**
 * Formats the document with the shortcuts people already use for it:
 * Ctrl+S (Cmd+S on macOS), and VS Code's Format Document, Shift+Alt+F
 * (Shift+Option+F on macOS).
 */
export function formatKeymap(parser: Parser) {
  const run = (view: EditorView) => {
    void formatDocument(view, parser)
    return true
  }
  return [
    Prec.high(keymap.of([{key: 'Mod-s', preventDefault: true, run}])),
    // Not a keymap binding: CodeMirror leaves Option combinations on macOS
    // to type characters (Shift+Option+F types "Ï" or "∫", depending on the
    // layout), so match the physical key instead
    Prec.high(
      EditorView.domEventHandlers({
        keydown(event, view) {
          const isFormatKey =
            event.code === 'KeyF' &&
            event.shiftKey &&
            event.altKey &&
            !event.ctrlKey &&
            !event.metaKey
          if (!isFormatKey) return false
          event.preventDefault()
          return run(view)
        },
      }),
    ),
  ]
}
