import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {join, relative, resolve} from 'node:path'
import {promisify} from 'node:util'

import {afterAll, beforeAll, describe, expect, test} from 'vitest'

// `expectTypeOf` compares types structurally, so it can't tell whether a type
// shows up in editor hovers and declaration files as a plain object or as a
// reference to an internal helper alias. Declaration emit uses the same type
// printer as quick info, so this compiles a fixture with the repo's `tsc` and
// inspects the emitted `.d.ts`.

const ROOT = resolve(import.meta.dirname, '../..')
const TSC = join(ROOT, 'node_modules/.bin/tsc')
const SRC_INDEX = join(ROOT, 'src/index')

const FIXTURE = `
import {
  array,
  document,
  literal,
  number,
  object,
  optional,
  parse,
  reference,
  string,
  type Infer,
} from ${JSON.stringify(SRC_INDEX)}

export const Person = document({_type: literal('person'), name: string()})

export const Pet = document({
  _type: literal('pet'),
  name: string(),
  birthYear: optional(number()),
})

export const Address = object({
  street: string(),
  zip: optional(string()),
})

export const Tags = array(object({_type: literal('tag'), label: string()}))

export const PersonRef = reference(Person)

export const fido = parse(Pet, {_type: 'pet', name: 'Fido'})
export const address = parse(Address, {street: 'Main St'})
export const tags = parse(Tags, [])
export const personRef = parse(PersonRef, {_type: 'reference', _ref: 'p1'})

// A type alias is emitted as written, so read the inferred types back
// through a value whose type the compiler has to print
declare function infer<T>(): T
export const inferredPet = infer<Infer<typeof Pet>>()
export const inferredAddress = infer<Infer<typeof Address>>()
export const inferredTags = infer<Infer<typeof Tags>>()
export const inferredPersonRef = infer<Infer<typeof PersonRef>>()
`

const TSCONFIG = {
  extends: join(ROOT, 'tsconfig.settings.json'),
  compilerOptions: {
    rootDir: ROOT,
    outDir: 'out',
    emitDeclarationOnly: true,
    declarationMap: false,
    sourceMap: false,
    types: ['node'],
  },
  files: ['fixture.ts'],
}

/**
 * Returns the type text of `export declare const name: ...;` in the emitted
 * declaration file.
 */
function declaredType(dts: string, name: string): string {
  const pattern = new RegExp(
    `^export declare const ${name}: ([\\s\\S]*?);\\n(?=export|$)`,
    'm',
  )
  const match = dts.match(pattern)
  if (!match?.[1]) throw new Error(`No declaration for ${name} in:\n${dts}`)
  return match[1].trim()
}

describe('type display', () => {
  let dir: string
  let dts: string

  beforeAll(async () => {
    // Inside the repo (in the gitignored .tmp/) so the fixture and src/ share a root
    await mkdir(join(ROOT, '.tmp'), {recursive: true})
    dir = await mkdtemp(join(ROOT, '.tmp', 'type-display-'))
    await writeFile(join(dir, 'fixture.ts'), FIXTURE)
    await writeFile(join(dir, 'tsconfig.json'), JSON.stringify(TSCONFIG))
    try {
      await promisify(execFile)(TSC, ['-p', join(dir, 'tsconfig.json')], {
        cwd: dir,
      })
    } catch (error) {
      const {stdout, stderr} = error as {stdout?: string; stderr?: string}
      throw new Error(`tsc failed:\n${stdout}${stderr}`, {cause: error})
    }
    dts = await readFile(
      join(dir, 'out', relative(ROOT, dir), 'fixture.d.ts'),
      'utf8',
    )
  }, 60_000)

  afterAll(async () => {
    if (dir) await rm(dir, {recursive: true, force: true})
  })

  // Each schema is checked both as a parsed value and through `Infer`
  const cases: [names: string[], fields: string[]][] = [
    [
      ['fido', 'inferredPet'],
      ['_type: "pet";', 'name: string;', 'birthYear?: number', '_id?: string'],
    ],
    [
      ['address', 'inferredAddress'],
      ['street: string;', 'zip?: string'],
    ],
    [
      ['tags', 'inferredTags'],
      ['_type: "tag";', 'label: string;', '_key: string;'],
    ],
    [
      ['personRef', 'inferredPersonRef'],
      ['_type: "reference";', '_ref: string;', '_weak?: boolean'],
    ],
  ]

  test.each(
    cases.flatMap(([names, fields]) =>
      names.map(name => [name, fields] as const),
    ),
  )('%s is spelled out as a plain object type', (name, fields) => {
    const type = declaredType(dts, name)
    // An object literal at the top level, not an alias from any module such
    // as `import("../../src/defs").OutputFromShape<...>`
    expect(type).toMatch(/^\{/)
    expect(type).not.toContain(' & ')
    // Catches helpers nested inside fields, e.g. `import(".../utilTypes").Flatten<...>`
    expect(type).not.toContain('utilTypes')
    for (const field of fields) {
      expect(type).toContain(field)
    }
  })
})
