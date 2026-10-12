import {
  type DocumentSchemaOf,
  type LazySchema,
  type Parsed,
  type Schema,
} from '../defs'
import {getLazySchema} from '../helpers/getLazySchema'
import {type Committed, committed} from '../lifecycle'
import {type ParseResult, parse} from '../parse'
import {type DocumentValue} from '../shapeDefs'

export type MaybeLazy<T extends Schema> = T | LazySchema<T>

export function createLoadDocumentResult(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  return function loadDocumentResult<
    DocumentSchema extends DocumentSchemaOf<DocumentValue>,
  >(schema: MaybeLazy<DocumentSchema>, id: string) {
    const nonlazySchema = getLazySchema(schema) as DocumentSchema
    const fields = Object.keys(nonlazySchema.shape)
    return fetch(id, fields).then(input =>
      parse(committed(nonlazySchema as any), input),
    ) as Promise<ParseResult<Parsed<Committed<DocumentSchema>>>>
  }
}

export function createDocumentLoader(
  fetch: (id: string, fieldSelection: string[]) => Promise<unknown>,
) {
  const loadDocumentResult = createLoadDocumentResult(fetch)

  return function fetchDocument<
    DocumentSchema extends DocumentSchemaOf<DocumentValue>,
  >(
    schema: MaybeLazy<DocumentSchema>,
    id: string,
  ): Promise<Parsed<Committed<DocumentSchema>>> {
    return loadDocumentResult(schema, id).then(result =>
      result.ok ? result.value : Promise.reject(result.error),
    )
  }
}
