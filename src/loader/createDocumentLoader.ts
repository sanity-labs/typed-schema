import {
  type Parsed,
  type SanityDocumentType,
  type SanityLazy,
  type SanityType,
} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {type Committed, committed} from '../lifecycle'
import {ParseError, type ParseResult, safeParse} from '../parse'
import {type SanityDocumentValue} from '../shapeDefs'

export type MaybeLazy<T extends SanityType> = T | SanityLazy<T>

export function createSafeLoadDocument(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  return function safeFetchDocument<
    DocumentSchema extends SanityDocumentType<SanityDocumentValue>,
  >(schema: MaybeLazy<DocumentSchema>, id: string) {
    const nonlazySchema = getLazySchema(schema) as DocumentSchema
    const fields = Object.keys(nonlazySchema.shape)
    return fetch(id, fields).then(input =>
      safeParse(committed(nonlazySchema as any), input),
    ) as Promise<ParseResult<Parsed<Committed<DocumentSchema>>>>
  }
}

export function createDocumentLoader(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  const safeFetchDocument = createSafeLoadDocument(fetch)

  return function fetchDocument<
    DocumentSchema extends SanityDocumentType<SanityDocumentValue>,
  >(
    schema: MaybeLazy<DocumentSchema>,
    id: string,
  ): Promise<Parsed<Committed<DocumentSchema>>> {
    return safeFetchDocument(schema, id).then(result =>
      result.status === 'ok'
        ? result.value
        : Promise.reject(new ParseError(result.errors)),
    )
  }
}
