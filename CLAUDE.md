# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@sanity/sanitype` is an experimental, TypeScript-first way to declare Sanity schemas: schema creators (`object()`, `string()`, `document()`, ...) that give static type inference via `Infer<>`/`OutputOf<>` plus optional runtime validation via `parse()`/`safeParse()`. Single published package, pnpm workspace with `examples/compat-studio` as a second (private) workspace package.

## Commands

```sh
pnpm install              # also installs lefthook git hooks
pnpm dev                  # pkg watch + tsc --watch + vitest --typecheck (watch)
pnpm test                 # vitest run --typecheck (runtime tests + *.test-d.ts type tests)
pnpm vitest run src/__tests__/union.parse.test.ts   # single test file
pnpm vitest run -t "name"                           # single test by name
pnpm typecheck            # tsc on src (TypeScript 7)
pnpm typecheck:examples   # tsc on examples/{ts,forms,content-migration}
pnpm lint / lint:fix      # oxlint (config: oxlint.config.ts)
pnpm format / format:check # oxfmt (config: oxfmt.config.ts)
pnpm knip                 # unused files/deps/exports (config: knip.ts)
pnpm build                # pkg build + pkg check + publint + arethetypeswrong -> dist/
pnpm check                # clean, build, then typecheck+lint+format:check+knip+test+package checks
pnpm changeset            # add a release note for a user-facing change
```

Tests live in `src/**/__tests__/` and next to code (`src/form/creator.test.ts`). Files ending in `.test-d.ts` are type-level tests run by vitest's typecheck mode; a change that breaks inference shows up there, not at runtime.

Config files are TypeScript where the tool supports it (`oxlint.config.ts`, `oxfmt.config.ts`, `knip.ts`, `vitest.config.ts`, `package.config.ts`, `taze.config.ts`).

## Releasing

Changesets, not conventional commits. `.github/workflows/release.yml` opens a "chore: release" PR on push to `main` when `.changeset/*.md` files exist; merging it publishes to npm with provenance. Every user-facing change needs a changeset file. `CHANGELOG.md` is generated, do not edit by hand.

## Architecture

The central idea: every schema type is a plain object carrying `typeName` plus a phantom `output` property whose _type_ is the inferred TypeScript output. Runtime behavior (`parse`) is a separate switch over `typeName`, so schema objects stay serializable and runtime-agnostic.

- `src/defs.ts` is the type vocabulary. `SanityType<Output>` is the base; `SanityObject`, `SanityDocument`, `SanityArray`, `SanityReference`, `SanityObjectUnion`, `SanityPrimitiveUnion`, `SanityLiteral`, `SanityOptional`, `SanityLazy`, `SanityBlock`, etc. extend it. `OutputOf<T>`/`Infer<T>` read the phantom `output` type. `OutputFromShape` computes object output types and is where `_type` literals and optional fields are resolved.
- `src/helpers/utilTypes.ts` holds the compile-time constraints (`ValidateFieldName`/`ValidFieldName` for field names, underscore handling, format helpers); array and union restrictions live in the respective creators' type signatures. Constraint violations surface as type errors at the call site, so "invalid schema" tests are `.test-d.ts` files asserting `@ts-expect-error`.
- `src/shapeDefs.ts` defines the shared built-in shapes (document system fields, reference/asset shapes) and their value types, e.g. `SanityDocumentShape`/`SanityDocumentValue`.
- `src/creators/*` are the public factory functions, one per type. `defineType` in `src/helpers/defineType.ts` is the shared constructor; it attaches `output` as a non-enumerable getter so schema objects remain plain, serializable data. `src/creators/union.ts` enforces that object unions are _typed_ objects (have a `_type` literal), a hard Sanity constraint needed for real-time collaborative editing.
- `src/parse.ts` is the runtime validator: `parse`, `safeParse`, and per-type parsers dispatched on `typeName`. Failures are `ParseErrorDetails` (path + message) wrapped in `ParseError` by `parse`.
- `src/helpers/strictMode.ts` (`strictMode`/`safeStrictMode`) walks a schema with `collectTypeNames` and rejects duplicate type names, a requirement for GraphQL deployment ("GraphQL strict mode" in the README).
- `src/lifecycle.ts` models document lifecycle shapes as type transforms over document schemas: `StoredDocument` (system fields required), drafts via `deepPartial`, etc.
- `src/utils/*` are schema transformers (`extend`, `pick`, `omit`, `rename`, `deepPartial`, `deepRequired`, `shallowPartial`, `shallowRequired`): each returns a _new_ schema object and its types mirror the runtime change, so adding a utility means writing both a type and a function.
- `src/creators/lazy.ts` + `src/helpers/getLazySchema.ts` enable recursive/circular types via thunks resolved at parse time.
- `src/compat/typed-to-classic/` converts a sanitype schema to classic Sanity Studio `defineType` schema objects. `examples/compat-studio` consumes this to run a real Studio.
- `src/loader/*`: `createLoader(fetchImpl)` is client-agnostic; given a `(id, fieldSelection) => Promise<unknown>` it returns typed `loadDocument`/`loadReference` helpers that parse what comes back against the schema.
- `src/form/*` is an experimental form-definition layer on top of schemas.

`examples/ts`, `examples/forms`, `examples/content-migration` and `exploration/` are loose scratch folders without their own `package.json`; they are typechecked (`typecheck:examples`) but not built or tested.

## Conventions

- Type-only imports must be inline: `import {type Foo} from './x'` (enforced by oxlint).
- Sanity system fields (`_type`, `_id`, `_ref`, `_key`) are the only identifiers allowed to start with `_`; user-defined schema fields starting with `_` are a compile-time error by design.
- When changing inference, add or update a `.test-d.ts` test and run `pnpm test`; `tsc` alone will not catch regressions in `expectTypeOf` assertions.
- `pkg build --strict` runs api-extractor TSDoc checks; exported symbols need valid TSDoc (`@param name -` hyphen form).
