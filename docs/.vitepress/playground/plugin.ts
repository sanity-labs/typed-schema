import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'

import {type Plugin} from 'vite'

const VIRTUAL_ID = 'virtual:playground-types'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

const require = createRequire(import.meta.url)

/**
 * Serves `virtual:playground-types`: a map of file paths to contents for the
 * playground's in-browser TypeScript environment. It holds the TypeScript
 * standard library and the package's bundled declarations, so the
 * playground needs no CDN.
 */
export function playgroundTypes(): Plugin {
  const tsLibDir = dirname(require.resolve('typescript/lib/lib.d.ts'))
  const pkgDir = dirname(
    require.resolve('@sanity-labs/typed-schema/package.json'),
  )
  const dtsPath = join(pkgDir, 'dist', 'index.d.ts')

  return {
    name: 'playground-types',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined
      if (!existsSync(dtsPath)) {
        throw new Error(
          `${dtsPath} is missing. Run \`pnpm pkg:build\` in the repository root before starting the docs.`,
        )
      }
      this.addWatchFile(dtsPath)

      const files: Record<string, string> = {}
      for (const name of readdirSync(tsLibDir)) {
        if (/^lib\.(es\d+|es5|decorators).*\.d\.ts$/.test(name)) {
          files[`/${name}`] = readFileSync(join(tsLibDir, name), 'utf8')
        }
      }
      files['/node_modules/@sanity-labs/typed-schema/package.json'] =
        JSON.stringify({
          name: '@sanity-labs/typed-schema',
          type: 'module',
          types: './index.d.ts',
        })
      files['/node_modules/@sanity-labs/typed-schema/index.d.ts'] =
        readFileSync(dtsPath, 'utf8')
      // The declarations import one type from @sanity/types (used by
      // toClassicSchema). A stub avoids shipping that package's types.
      files['/node_modules/@sanity/types/package.json'] = JSON.stringify({
        name: '@sanity/types',
        types: './index.d.ts',
      })
      files['/node_modules/@sanity/types/index.d.ts'] =
        'export type SchemaTypeDefinition = {name: string; type: string; [key: string]: unknown}\n'
      // es20xx libs leave out `console`, which lives in lib.dom.
      files['/globals.d.ts'] =
        'declare var console: {log(...data: unknown[]): void; error(...data: unknown[]): void; warn(...data: unknown[]): void}\n'

      return `export default ${JSON.stringify(files)}`
    },
  }
}
