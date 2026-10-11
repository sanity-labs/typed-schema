import type ts from 'typescript'

// TypeScript elides hover types longer than 500 characters as `{ ...; }`,
// counting the unexpanded type text, so even small inferred schema types get
// cut. Neither Twoslash nor codemirror-ts lets us pass a longer limit.
const MAX_HOVER_LENGTH = 100_000

/**
 * Wraps a language service so hover types (quick info) are shown in full.
 */
export function withFullQuickInfo(
  service: ts.LanguageService,
): ts.LanguageService {
  return {
    ...service,
    getQuickInfoAtPosition: (
      fileName,
      position,
      maximumLength = MAX_HOVER_LENGTH,
    ) => service.getQuickInfoAtPosition(fileName, position, maximumLength),
  }
}
