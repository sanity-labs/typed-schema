import {
  type BooleanSchema,
  type Conceal,
  type DocumentSchema,
  type LiteralSchema,
  type NumberSchema,
  type ObjectSchema,
  type OptionalSchema,
  type OutputFromShape,
  type OutputOf,
  type ReferenceSchema,
  type Schema,
  type StringSchema,
} from './defs'
import {defineType as dt} from './helpers/defineType'
import {type Combine, type OutputFormatFix} from './helpers/utilTypes'

// Built-in shapes are declared with `defineType` directly rather than the
// creators in ./creators, since the creators depend on this module.

const STRING: StringSchema = dt({typeName: 'string'})
const OPTIONAL_STRING: OptionalSchema<StringSchema> = dt({
  typeName: 'optional',
  type: STRING,
})
const NUMBER: NumberSchema = dt({typeName: 'number'})
const OPTIONAL_NUMBER: OptionalSchema<NumberSchema> = dt({
  typeName: 'optional',
  type: NUMBER,
})
const BOOLEAN: BooleanSchema = dt({typeName: 'boolean'})

function lit<const V extends string>(value: V): LiteralSchema<V> {
  return dt({typeName: 'literal', value})
}

function opt<T extends Schema>(type: T): OptionalSchema<T> {
  return dt({typeName: 'optional', type})
}

export type DocumentShape = {
  _type: StringSchema | LiteralSchema<string>
  _id: OptionalSchema<StringSchema>
  _createdAt: OptionalSchema<StringSchema>
  _updatedAt: OptionalSchema<StringSchema>
  _rev: OptionalSchema<StringSchema>
}

/** @internal */
export const DocumentBase: ObjectSchema<DocumentShape> = dt({
  typeName: 'object',
  shape: {
    _type: STRING,
    _id: OPTIONAL_STRING,
    _createdAt: OPTIONAL_STRING,
    _updatedAt: OPTIONAL_STRING,
    _rev: OPTIONAL_STRING,
  },
})

export type ReferenceShape = {
  _type: LiteralSchema<'reference'>
  _ref: StringSchema
  _weak: OptionalSchema<BooleanSchema>
}

/** @internal */
export const ReferenceBase: ObjectSchema<ReferenceShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('reference'),
    _ref: STRING,
    _weak: opt(BOOLEAN),
  },
})

export type ReferenceBase = OutputOf<typeof ReferenceBase>

export type GeopointShape = {
  _type: LiteralSchema<'geopoint'>
  lat: NumberSchema
  lng: NumberSchema
  alt: OptionalSchema<NumberSchema>
}

/** @internal */
export const GEOPOINT: ObjectSchema<GeopointShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('geopoint'),
    lat: NUMBER,
    lng: NUMBER,
    alt: OPTIONAL_NUMBER,
  },
})

export type AssetSourceSpecShape = {
  _type: LiteralSchema<'sanity.assetSourceData'>
  id: StringSchema
  name: StringSchema
  url: OptionalSchema<StringSchema>
}

const ASSET_SOURCE_SPEC: ObjectSchema<AssetSourceSpecShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.assetSourceData'),
    id: STRING,
    name: STRING,
    url: OPTIONAL_STRING,
  },
})

/** Fields shared by `sanity.imageAsset` and `sanity.fileAsset` documents */
export type AssetBaseShape = DocumentShape & {
  url: StringSchema
  path: StringSchema
  assetId: StringSchema
  extension: StringSchema
  mimeType: StringSchema
  sha1hash: StringSchema
  size: NumberSchema
  originalFilename: OptionalSchema<StringSchema>
  uploadId: OptionalSchema<StringSchema>
  // Extensions
  label: OptionalSchema<StringSchema>
  title: OptionalSchema<StringSchema>
  description: OptionalSchema<StringSchema>
  altText: OptionalSchema<StringSchema>
  // External asset source extensions
  creditLine: OptionalSchema<StringSchema>
  source: OptionalSchema<ObjectSchema<AssetSourceSpecShape>>
}

const assetBase: AssetBaseShape = {
  ...DocumentBase.shape,
  url: STRING,
  path: STRING,
  assetId: STRING,
  extension: STRING,
  mimeType: STRING,
  sha1hash: STRING,
  size: NUMBER,
  originalFilename: OPTIONAL_STRING,
  uploadId: OPTIONAL_STRING,
  label: OPTIONAL_STRING,
  title: OPTIONAL_STRING,
  description: OPTIONAL_STRING,
  altText: OPTIONAL_STRING,
  creditLine: OPTIONAL_STRING,
  source: opt(ASSET_SOURCE_SPEC),
}

export type ImageDimensionsShape = {
  _type: LiteralSchema<'sanity.imageDimensions'>
  height: NumberSchema
  width: NumberSchema
  aspectRatio: NumberSchema
}

const IMAGE_DIMENSIONS: ObjectSchema<ImageDimensionsShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.imageDimensions'),
    height: NUMBER,
    width: NUMBER,
    aspectRatio: NUMBER,
  },
})

export type ImageSwatchShape = {
  _type: LiteralSchema<'sanity.imagePaletteSwatch'>
  background: StringSchema
  foreground: StringSchema
  population: NumberSchema
  title: OptionalSchema<StringSchema>
}

const IMAGE_SWATCH: ObjectSchema<ImageSwatchShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.imagePaletteSwatch'),
    background: STRING,
    foreground: STRING,
    population: NUMBER,
    title: OPTIONAL_STRING,
  },
})

const OPTIONAL_IMAGE_SWATCH = opt(IMAGE_SWATCH)

export type ImagePaletteName =
  | 'darkMuted'
  | 'darkVibrant'
  | 'dominant'
  | 'lightMuted'
  | 'lightVibrant'
  | 'muted'
  | 'vibrant'

export type ImagePaletteShape = {
  _type: LiteralSchema<'sanity.imagePalette'>
} & Record<ImagePaletteName, OptionalSchema<ObjectSchema<ImageSwatchShape>>>

const IMAGE_PALETTE: ObjectSchema<ImagePaletteShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.imagePalette'),
    darkMuted: OPTIONAL_IMAGE_SWATCH,
    darkVibrant: OPTIONAL_IMAGE_SWATCH,
    dominant: OPTIONAL_IMAGE_SWATCH,
    lightMuted: OPTIONAL_IMAGE_SWATCH,
    lightVibrant: OPTIONAL_IMAGE_SWATCH,
    muted: OPTIONAL_IMAGE_SWATCH,
    vibrant: OPTIONAL_IMAGE_SWATCH,
  },
})

/**
 * Image metadata as extracted by Sanity. `palette`, `lqip` and `blurHash` are
 * absent for images Sanity cannot analyse (e.g. SVGs).
 */
export type ImageMetadataShape = {
  _type: LiteralSchema<'sanity.imageMetadata'>
  dimensions: ObjectSchema<ImageDimensionsShape>
  location: OptionalSchema<ObjectSchema<GeopointShape>>
  palette: OptionalSchema<ObjectSchema<ImagePaletteShape>>
  lqip: OptionalSchema<StringSchema>
  blurHash: OptionalSchema<StringSchema>
  hasAlpha: BooleanSchema
  isOpaque: BooleanSchema
}

const IMAGE_METADATA: ObjectSchema<ImageMetadataShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.imageMetadata'),
    dimensions: IMAGE_DIMENSIONS,
    location: opt(GEOPOINT),
    palette: opt(IMAGE_PALETTE),
    lqip: OPTIONAL_STRING,
    blurHash: OPTIONAL_STRING,
    hasAlpha: BOOLEAN,
    isOpaque: BOOLEAN,
  },
})

export type ImageAssetShape = AssetBaseShape & {
  _type: LiteralSchema<'sanity.imageAsset'>
  metadata: ObjectSchema<ImageMetadataShape>
}

/** @internal */
export const IMAGE_ASSET: DocumentSchema<ImageAssetShape> = dt({
  typeName: 'document',
  shape: {
    ...assetBase,
    _type: lit('sanity.imageAsset'),
    metadata: IMAGE_METADATA,
  },
})

export type FileAssetShape = AssetBaseShape & {
  _type: LiteralSchema<'sanity.fileAsset'>
}

/** @internal */
export const FILE_ASSET: DocumentSchema<FileAssetShape> = dt({
  typeName: 'document',
  shape: {
    ...assetBase,
    _type: lit('sanity.fileAsset'),
  },
})

export type ImageShape = {
  _type: LiteralSchema<'image'>
  asset: ReferenceSchema<DocumentSchema<ImageAssetShape>>
}

/** @internal */
export const ImageBase: ObjectSchema<ImageShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('image'),
    asset: dt({
      typeName: 'reference',
      referenceType: IMAGE_ASSET,
      shape: ReferenceBase.shape,
    }),
  },
})

export type FileShape = {
  _type: LiteralSchema<'file'>
  asset: ReferenceSchema<DocumentSchema<FileAssetShape>>
}

/** @internal */
export const FileBase: ObjectSchema<FileShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('file'),
    asset: dt({
      typeName: 'reference',
      referenceType: FILE_ASSET,
      shape: ReferenceBase.shape,
    }),
  },
})

export type ArrayValue<ElementType> = Array<
  ElementType extends object
    ? Combine<ElementType, {_key: string}>
    : ElementType
> &
  OutputFormatFix

export type DocumentValue = OutputFromShape<DocumentShape>

/**
 * The value of a `reference()` to a document of type `RefType`, for annotating
 * recursive schemas by hand. `$refSchema` is optional here so that
 * hand-written values typecheck; `parse` still attaches it.
 */
export type ReferenceValue<RefType> = Combine<
  ReferenceBase,
  Partial<Conceal<Schema<RefType>>>
>
