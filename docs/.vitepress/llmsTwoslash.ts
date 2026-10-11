import {readdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {type Plugin} from 'vite'
import {type SiteConfig} from 'vitepress'

const TWOSLASH_BLOCK = /^```(\w+) twoslash[^\n]*\n([\s\S]*?)^```/gm
const CUT = /^\/\/ ---cut---\s*$/m
const CUT_RANGE = /^\/\/ ---cut-start---\s*$[\s\S]*?^\/\/ ---cut-end---\s*\n?/gm
// `//   ^?` queries and `// @errors: 2322`-style compiler directives
const MARKUP_LINE = /^\s*\/\/\s*(?:\^[?|]|@\w+).*$/

/**
 * Removes Twoslash markup from Markdown, so code blocks read the way they
 * render on the site: the `twoslash` fence attribute, query and directive
 * comments, code above a `// ---cut---` marker and code between
 * `// ---cut-start---` and `// ---cut-end---` (both hidden on the page) are
 * dropped.
 */
export function stripTwoslash(markdown: string): string {
  return markdown.replace(TWOSLASH_BLOCK, (_, lang: string, body: string) => {
    const cut = CUT.exec(body)
    const visible = (
      cut ? body.slice(cut.index + cut[0].length) : body
    ).replace(CUT_RANGE, '')
    const code = visible
      .split('\n')
      .filter(line => !MARKUP_LINE.test(line))
      .join('\n')
      .replace(/^\n+/, '')
    return `\`\`\`${lang}\n${code}\`\`\``
  })
}

/**
 * Strips Twoslash markup from the Markdown files that vitepress-plugin-llms
 * writes (`llms-full.txt` and a `.md` copy of each page). Runs after that
 * plugin has written them, at the end of the build.
 */
export function llmsTwoslash(): Plugin {
  let outDir: string | undefined
  return {
    name: 'llms-twoslash',
    apply: 'build',
    configResolved(config) {
      outDir = (config as {vitepress?: SiteConfig}).vitepress?.outDir
    },
    async closeBundle() {
      if (!outDir) return
      const files = await readdir(outDir, {recursive: true})
      for (const file of files) {
        if (!file.endsWith('.md') && file !== 'llms-full.txt') continue
        const filePath = path.join(outDir, file)
        const content = await readFile(filePath, 'utf8')
        const stripped = stripTwoslash(content)
        if (stripped !== content) await writeFile(filePath, stripped)
      }
    },
  }
}
