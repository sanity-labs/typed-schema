// Schema creators
export * from './creators/array'
export * from './creators/block'
export * from './creators/boolean'
export * from './creators/date'
export * from './creators/dateTime'
export * from './creators/document'
export * from './creators/enums'
export * from './creators/file'
export * from './creators/fileAsset'
export * from './creators/geopoint'
export * from './creators/image'
export * from './creators/imageAsset'
export * from './creators/lazy'
export * from './creators/literal'
export * from './creators/never'
export * from './creators/number'
export * from './creators/object'
export * from './creators/optional'
export * from './creators/portableText'
export * from './creators/reference'
export * from './creators/string'
export * from './creators/union'

// Schema type definitions and type guards
export * from './asserters'
export * from './defs'
export type {
  ArrayValue,
  AssetBaseShape,
  AssetSourceSpecShape,
  DocumentShape,
  DocumentValue,
  FileAssetShape,
  FileShape,
  GeopointShape,
  ImageAssetShape,
  ImageDimensionsShape,
  ImageMetadataShape,
  ImagePaletteName,
  ImagePaletteShape,
  ImageShape,
  ImageSwatchShape,
  ReferenceBase,
  ReferenceShape,
  ReferenceValue,
} from './shapeDefs'
export type {
  Combine,
  ElementType,
  ExtendsNever,
  Format,
  OutputFormatFix,
  RequireSome,
  ValidFieldName,
} from './helpers/utilTypes'

// Parsing
export {
  type ErrorCode,
  formatIssues,
  formatPath,
  type IssueLike,
  parse,
  ParseError,
  type ParseFail,
  type ParseIssue,
  type ParseOk,
  type ParseOptions,
  parseOrThrow,
  type ParseResult,
  type Path,
  type PathSegmentLike,
} from './parse'

// Standard Schema (https://standardschema.dev)
export type {StandardSchemaV1} from './standardSchema'

// Schema transforms
export * from './utils/deepPartial'
export * from './utils/deepRequired'
export * from './utils/extend'
export * from './utils/omit'
export * from './utils/pick'
export * from './utils/rename'
export * from './utils/required'
export * from './utils/shallowPartial'
export * from './utils/shallowRequired'
export * from './lifecycle'

// Unique type names (required for GraphQL deployment)
export {
  DuplicateTypeNameError,
  verifyUniqueTypeNames,
} from './helpers/verifyUniqueTypeNames'

// Annotations (title, description, examples, ...)
export {
  ExampleError,
  type ExampleFailure,
  validateExamples,
  validateExamplesOrThrow,
  type ValidateExamplesResult,
} from './helpers/validateExamples'
export {
  getAnnotations,
  type GetAnnotationsOptions,
  resolveAnnotationText,
} from './helpers/annotations'

// Loading documents and references
export * from './loader/createDocumentLoader'
export * from './loader/createLoader'
export * from './loader/createReferenceLoader'

// Content helpers
export * from './content-utils/getInstanceName'

// Classic (Studio) schema interop
export * from './compat/typed-to-classic'
