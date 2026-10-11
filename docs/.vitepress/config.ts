import {createRequire} from 'node:module'

import {
  defaultHoverInfoProcessor,
  rendererFloatingVue,
  transformerTwoslash,
} from '@shikijs/vitepress-twoslash'
import ts from 'typescript'
import {defineConfig} from 'vitepress'
import llmstxt from 'vitepress-plugin-llms'

import oxfmtConfig from '../../oxfmt.config.ts'
import {fetchTypes} from './fetchTypes.ts'
import {llmsTwoslash} from './llmsTwoslash.ts'
import {playgroundTypes} from './playground/plugin.ts'
import {withFullQuickInfo} from './quickInfo.ts'
import {sortSystemFields} from './sortSystemFields.ts'

const require = createRequire(import.meta.url)

// Show `^?` query results as a line inside the code block, so they push the
// following content down instead of covering it. The integration's renderer
// still wraps the queried token in a forced-open tooltip, which is empty in
// line mode; leave the token as plain text instead, since its type is
// already shown in the line below.
const twoslashRenderer = rendererFloatingVue({
  queryRendering: 'line',
  // show compiler errors as squiggles with the message on hover, as an
  // editor does, instead of long error blocks under the line
  errorRendering: 'hover',
  // show type names as users import them, and list _type, _id, _rev and the
  // other system fields first
  processHoverInfo: info =>
    sortSystemFields(stripBundlerSuffixes(defaultHoverInfoProcessor(info))),
  processHoverDocs: joinDocLinks,
})
/**
 * Declaration bundlers rename a type that clashes with another in the same
 * file (`declare class SanityClient$1`) and export it under its real name, and
 * TypeScript prints the renamed one. Drop the suffix so hovers show the name
 * users import.
 */
function stripBundlerSuffixes(info: string): string {
  return info.replace(/\b([A-Z][\w]*)\$\d+\b/g, '$1')
}

/**
 * TypeScript returns a doc comment's `{@link Name}` as separate parts
 * (`{@link `, `Name`, `}`), and Twoslash joins all parts with newlines, which
 * splits each link into its own paragraph. Put the links back together so
 * they render inline.
 */
function joinDocLinks(docs: string): string {
  return docs.replace(/\n?\{@link\s*\n?([^}\n]*?)\n?\}\n?/g, '{@link $1}')
}

const renderer: typeof twoslashRenderer = {
  ...twoslashRenderer,
  nodeQuery: () => ({}),
}

// The oxfmt options that Prettier also understands, for formatting in the
// playground
const {
  printWidth,
  semi,
  singleQuote,
  bracketSpacing,
  arrowParens,
  trailingComma,
} = oxfmtConfig
const formatOptions = {
  printWidth,
  semi,
  singleQuote,
  bracketSpacing,
  arrowParens,
  trailingComma,
}

// VitePress adds the base to page links but not to links to other files
const base = '/typed-schema/'

export default defineConfig({
  title: 'typed-schema',
  description: 'TypeScript-first Sanity schemas with static type inference',
  // served from https://sanity-labs.github.io/typed-schema/
  base,
  cleanUrls: true,
  lastUpdated: true,

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    codeTransformers: [
      transformerTwoslash({
        queryRendering: 'line',
        renderer,
        twoslashOptions: {
          extraFiles: {'fetch.d.ts': fetchTypes},
          tsModule: {
            ...ts,
            createLanguageService: (...args) =>
              withFullQuickInfo(ts.createLanguageService(...args)),
          },
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            strict: true,
            // Resolve @sanity-labs/typed-schema via the "source" export
            // condition so Twoslash reads src/ instead of dist/.
            customConditions: ['source'],
          },
        },
      }),
    ],
  },

  vite: {
    plugins: [
      playgroundTypes(),
      llmstxt({
        ignoreFiles: ['playground.md'],
        // the table of contents lists pages, not the llms files themselves
        sidebar: sidebar =>
          Array.isArray(sidebar)
            ? sidebar.filter(group => group.text !== 'AI assistants')
            : sidebar,
      }),
      llmsTwoslash(),
    ],
    define: {
      __FORMAT_OPTIONS__: JSON.stringify(formatOptions),
    },
    resolve: {
      alias: {
        // The repo root uses TypeScript 7, which has no JavaScript compiler
        // API. Make every browser import of `typescript` (including those in
        // @valtown/codemirror-ts and @typescript/vfs) use the docs' TypeScript 6.
        typescript: require.resolve('typescript'),
      },
    },
    // the playground's TypeScript worker is an ES module
    worker: {format: 'es', plugins: () => [playgroundTypes()]},
    // the dev server does not crawl worker imports, so pre-bundle the
    // CommonJS ones (typescript) up front
    optimizeDeps: {
      include: [
        'typescript',
        '@typescript/vfs',
        '@valtown/codemirror-ts/worker',
      ],
    },
  },

  themeConfig: {
    nav: [
      {text: 'Guide', link: '/guide/getting-started'},
      {text: 'API', link: '/api/schema-types'},
      {text: 'Playground', link: '/playground'},
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          {text: 'Why typed schemas', link: '/guide/why'},
          {text: 'Getting started', link: '/guide/getting-started'},
        ],
      },
      {
        text: 'Guide',
        items: [
          {text: 'Declaring a document', link: '/guide/declaring-a-document'},
          {text: 'Parsing and errors', link: '/guide/parsing'},
          {text: 'Arrays and _key', link: '/guide/arrays'},
          {text: 'Portable Text', link: '/guide/portable-text'},
          {text: 'Composing schemas', link: '/guide/composing'},
          {text: 'Custom creators', link: '/guide/custom-creators'},
          {
            text: 'Partial and required variants',
            link: '/guide/partial-and-required',
          },
          {text: 'Document lifecycles', link: '/guide/lifecycles'},
          {text: 'Recursive schemas', link: '/guide/recursive-schemas'},
          {text: 'Schema annotations', link: '/guide/annotations'},
          {text: 'Loading documents', link: '/guide/loaders'},
          {text: 'GraphQL compatibility', link: '/guide/graphql'},
          {text: 'Sanity Studio', link: '/guide/studio'},
          {text: 'Limitations', link: '/guide/limitations'},
        ],
      },
      {
        text: 'API reference',
        items: [
          {text: 'Schema types', link: '/api/schema-types'},
          {text: 'Modifiers and transforms', link: '/api/transforms'},
          {text: 'Parsing', link: '/api/parsing'},
          {text: 'Annotations', link: '/api/annotations'},
          {text: 'Lifecycle helpers', link: '/api/lifecycle'},
          {text: 'Loaders', link: '/api/loaders'},
          {text: 'Utility types', link: '/api/utility-types'},
        ],
      },
      {
        text: 'AI assistants',
        items: [
          {text: 'llms.txt', link: `${base}llms.txt`},
          {text: 'llms-full.txt', link: `${base}llms-full.txt`},
        ],
      },
    ],

    socialLinks: [
      {icon: 'github', link: 'https://github.com/sanity-labs/typed-schema'},
      {
        icon: 'npm',
        link: 'https://www.npmjs.com/package/@sanity-labs/typed-schema',
      },
    ],

    editLink: {
      pattern:
        'https://github.com/sanity-labs/typed-schema/edit/main/docs/:path',
    },

    search: {provider: 'local'},

    outline: 'deep',
  },
})
