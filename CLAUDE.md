# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@sanity-labs/typed-schema` is an experimental, TypeScript-first way to declare Sanity schemas: schema creators (`object()`, `string()`, `document()`, ...) that give static type inference via `Infer<>`/`OutputOf<>` plus optional runtime validation via `parse()`/`parseOrThrow()`. Single published package, pnpm workspace with `examples/compat-studio` as a second (private) workspace package.

## Commands

```sh
pnpm install              # also installs lefthook git hooks
pnpm dev                  # pkg watch + tsc --watch + vitest --typecheck (watch)
pnpm test                 # vitest run --typecheck (runtime tests + *.test-d.ts type tests)
pnpm vitest run src/__tests__/union.parse.test.ts   # single test file
pnpm vitest run -t "name"                           # single test by name
pnpm typecheck            # tsc on src (TypeScript 7)
pnpm typecheck:ts6        # tsc on src with TypeScript 6, the oldest supported version
pnpm typecheck:examples   # tsc on examples/{ts,content-migration} and experiments/
pnpm lint / lint:fix      # oxlint (config: oxlint.config.ts)
pnpm format / format:check # oxfmt (config: oxfmt.config.ts)
pnpm knip                 # unused files/deps/exports (config: knip.ts)
pnpm build                # pkg build + pkg check + publint + arethetypeswrong -> dist/
pnpm check                # clean, build, then typecheck+lint+format:check+knip+test+package checks
pnpm changeset            # add a release note for a user-facing change
pnpm docs:dev             # pkg build + docs site dev server (docs/, VitePress)
pnpm docs:build           # pkg build + docs site build; fails on Twoslash type errors
```

Library tests live in `src/**/__tests__/`; tests for the docs site's build plugins and playground sit next to their files in `docs/.vitepress/`. Files ending in `.test-d.ts` are type-level tests run by vitest's typecheck mode; a change that breaks inference shows up there, not at runtime. Every runtime behaviour needs a `.test.ts` next to its `.test-d.ts`: several past bugs lived in paths covered only by type tests.

`src/index.ts` is a curated export list, not a mirror of the file tree. Internal helpers (sub-parsers, built-in shape constants, helper types) are deliberately not exported; add to the index only what the docs site documents.

Config files are TypeScript where the tool supports it (`oxlint.config.ts`, `oxfmt.config.ts`, `knip.ts`, `vitest.config.ts`, `package.config.ts`, `taze.config.ts`).

## Releasing

Changesets, not conventional commits. `.github/workflows/release.yml` opens a "chore: version packages" PR on push to `main` when `.changeset/*.md` files exist; merging it publishes to npm with trusted publishing (OIDC, `npm-publish` environment) and provenance. Every user-facing change needs a changeset file. Changeset notes are short and written for package users: what changed for them and anything they must do. No implementation notes, internal file or helper names, refactor rationale, branch names, PR process or test changes. `CHANGELOG.md` is generated, do not edit by hand.

Pending changesets together describe the difference between the last published version (`git describe --tags --abbrev=0`; `git show <tag>:<path>` shows what it shipped) and the next one, not the history of PRs in between. Before adding a changeset, read the pending ones in `.changeset/`. If the change fixes, renames, reworks or removes something that is not yet released, edit or delete the existing changeset instead of adding a new one; a fix to an unreleased feature needs no changeset of its own. If the change makes a pending note wrong (it names a removed API, or a behaviour that changed again), rewrite that note so the set reads as one release. In prerelease mode (`.changeset/pre.json` exists), changesets listed in its `changesets` array are already published; leave them as they are and add a new changeset instead.

This repo lives in the `sanity-labs` GitHub org.

## Architecture

The central idea: every schema type is a plain object carrying `typeName` plus a phantom `output` property whose _type_ is the inferred TypeScript output. Runtime behavior (`parse`) is a separate switch over `typeName`, so schema objects stay serializable and runtime-agnostic.

- `src/defs.ts` is the type vocabulary. `SanityType<Output>` is the base; `SanityObject`, `SanityDocument`, `SanityArray`, `SanityReference`, `SanityObjectUnion`, `SanityPrimitiveUnion`, `SanityLiteral`, `SanityOptional`, `SanityLazy`, `SanityBlock`, etc. extend it. `OutputOf<T>`/`Infer<T>` read the phantom `output` type. `OutputFromShape` computes object output types and is where `_type` literals and optional fields are resolved.
- `src/helpers/utilTypes.ts` holds the compile-time constraints (`ValidFieldName` for field names, format helpers); array and union restrictions live in the respective creators' type signatures. Constraint violations surface as type errors at the call site, so "invalid schema" tests are `.test-d.ts` files asserting `@ts-expect-error`.
- `src/shapeDefs.ts` is the single source of truth for built-in shapes (document system fields, reference, geopoint, image/file asset documents) and their value types, e.g. `SanityDocumentShape`/`SanityDocumentValue`. It uses `defineType` directly because the creators import it; `imageAsset()`, `fileAsset()` and `geopoint()` just return its constants.
- `src/creators/*` are the public factory functions, one per type. `defineType` in `src/helpers/defineType.ts` is the shared constructor; it attaches `output` as a non-enumerable getter so schema objects remain plain, serializable data. `src/creators/union.ts` enforces that object unions are _typed_ objects (have a `_type` literal), a hard Sanity constraint needed for real-time collaborative editing.
- `src/parse.ts` is the runtime validator: `parse` returns `{ok: true, value}` or `{ok: false, error: ParseError}`, `parseOrThrow` throws that error, and per-type parsers dispatched on `typeName` (all object-like types, including blocks and assets, go through `parseObject`) pass plain `ParseIssue` arrays (path + message) around; the public `parse` builds the single `ParseError` at the end.
- `src/helpers/verifyUniqueTypeNames.ts` (`verifyUniqueTypeNames`) walks a schema with `collectTypeNames` and throws `DuplicateTypeNameError` on duplicate type names, a requirement for GraphQL deployment.
- `src/lifecycle.ts` models document lifecycle shapes as type transforms over document schemas: `committed()`/`Committed<T>` make the fields the Content Lake assigns on commit (`_id`, `_rev`, `_createdAt`, `_updatedAt`) required; `partial()` is `deepPartial` restricted to documents (deep, because a half-edited document is partial at every level); published/draft/version are perspectives, not shapes.
- `src/utils/*` are schema transformers (`extend`, `pick`, `omit`, `rename`, `deepPartial`, `deepRequired`, `shallowPartial`, `shallowRequired`): each returns a _new_ schema object and its types mirror the runtime change, so adding a utility means writing both a type and a function.
- `src/creators/lazy.ts` + `src/helpers/getLazySchema.ts` enable recursive/circular types via thunks resolved at parse time; resolutions are cached in a `WeakMap` keyed by the lazy node so schema objects stay serializable.
- `src/compat/typed-to-classic/` converts a typed schema to classic Sanity Studio `defineType` schema objects. `examples/compat-studio` consumes this to run a real Studio.
- `src/loader/*`: `createLoader(fetchImpl)` is client-agnostic; given a `(id, fieldSelection) => Promise<unknown>` it returns typed `loadDocument`/`loadReference` helpers that parse what comes back against the schema.
- `src/compat/typed-to-classic/` is a proof of concept (drops referenced types, required-ness and block metadata); treat its output as a starting point.

`docs/` is the documentation site: a private workspace package built with VitePress and deployed to GitHub Pages by `.github/workflows/docs.yml`. Code blocks marked `ts twoslash` are type-checked against `src/` at build time (TypeScript 6, since Twoslash needs the JS compiler API that TypeScript 7 lacks), so an example that stops compiling fails `pnpm docs:build`. `docs/.vitepress/playground/` is the in-browser playground: CodeMirror plus a TypeScript worker fed the package's `dist/index.d.ts`, examples in `presets.ts` (each default-exports a schema), and validation run in a separate worker.

`examples/ts`, `examples/content-migration` and `experiments/` are loose folders without their own `package.json`; they are typechecked (`typecheck:examples`) but not built, and vitest excludes `experiments/`. `experiments/form/` is the experimental form-definition sketch that used to ship from the package.

## Conventions

- Schema constants are PascalCase and share their name with the inferred type: `const Pet = document({...})`, `type Pet = Infer<typeof Pet>`. Creator and transform functions stay camelCase, `_type` literals stay camelCase (`literal('pet')`), and instances stay camelCase (`const pet = parse(Pet, data)`). This applies to README snippets, docs pages, playground examples, examples and tests alike; throwaway test locals like `schema` or `doc` are the only exception.
- Type-only imports must be inline: `import {type Foo} from './x'` (enforced by oxlint).
- Sanity system fields (`_type`, `_id`, `_ref`, `_key`) are the only identifiers allowed to start with `_`; user-defined schema fields starting with `_` are a compile-time error by design.
- A type-level check that rejects a schema resolves to `SchemaError<'what is wrong'>` (from `src/helpers/utilTypes.ts`) at the offending spot, not to `never`, so the type error says what to fix. Test the message with `expectTypeOf`, next to the `@ts-expect-error` cases.
- When changing inference, add or update a `.test-d.ts` test and run `pnpm test`; `tsc` alone will not catch regressions in `expectTypeOf` assertions.
- `pkg build --strict` runs TSDoc checks; TSDoc, where present, must parse (`@param name -` hyphen form, balanced backticks).
- Commit messages are a single subject line with no body. Context belongs in the PR description or the changeset. Never mention branch names, base branches, stacking, worktrees or how the work was assembled.
