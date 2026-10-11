import {
  type Conceal,
  type OutputFromShape,
  type OutputOf,
  type SanityBoolean,
  type SanityDocument,
  type SanityLiteral,
  type SanityNumber,
  type SanityObject,
  type SanityOptional,
  type SanityReference,
  type SanityString,
  type SanityType,
} from './defs'
import {defineType as dt} from './helpers/defineType'
import {type Combine, type OutputFormatFix} from './helpers/utilTypes'

// Built-in shapes are declared with `defineType` directly rather than the
// creators in ./creators, since the creators depend on this module.

const STRING: SanityString = dt({typeName: 'string'})
const OPTIONAL_STRING: SanityOptional<SanityString> = dt({
  typeName: 'optional',
  type: STRING,
})
const NUMBER: SanityNumber = dt({typeName: 'number'})
const OPTIONAL_NUMBER: SanityOptional<SanityNumber> = dt({
  typeName: 'optional',
  type: NUMBER,
})
const BOOLEAN: SanityBoolean = dt({typeName: 'boolean'})

function lit<const V extends string>(value: V): SanityLiteral<V> {
  return dt({typeName: 'literal', value})
}

function opt<T extends SanityType>(type: T): SanityOptional<T> {
  return dt({typeName: 'optional', type})
}

export type SanityDocumentShape = {
  _type: SanityString | SanityLiteral<string>
  _id: SanityOptional<SanityString>
  _createdAt: SanityOptional<SanityString>
  _updatedAt: SanityOptional<SanityString>
  _rev: SanityOptional<SanityString>
}

/** @internal */
export const DocumentBase: SanityObject<SanityDocumentShape> = dt({
  typeName: 'object',
  shape: {
    _type: STRING,
    _id: OPTIONAL_STRING,
    _createdAt: OPTIONAL_STRING,
    _updatedAt: OPTIONAL_STRING,
    _rev: OPTIONAL_STRING,
  },
})

export type SanityReferenceShape = {
  _type: SanityLiteral<'reference'>
  _ref: SanityString
  _weak: SanityOptional<SanityBoolean>
}

/** @internal */
export const ReferenceBase: SanityObject<SanityReferenceShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('reference'),
    _ref: STRING,
    _weak: opt(BOOLEAN),
  },
})

export type ReferenceBase = OutputOf<typeof ReferenceBase>

export type GeopointShape = {
  _type: SanityLiteral<'geopoint'>
  lat: SanityNumber
  lng: SanityNumber
  alt: SanityOptional<SanityNumber>
}

/** @internal */
export const GEOPOINT: SanityObject<GeopointShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('geopoint'),
    lat: NUMBER,
    lng: NUMBER,
    alt: OPTIONAL_NUMBER,
  },
})

export type AssetSourceSpecShape = {
  _type: SanityLiteral<'sanity.assetSourceData'>
  id: SanityString
  name: SanityString
  url: SanityOptional<SanityString>
}

const ASSET_SOURCE_SPEC: SanityObject<AssetSourceSpecShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.assetSourceData'),
    id: STRING,
    name: STRING,
    url: OPTIONAL_STRING,
  },
})

/** Fields shared by `sanity.imageAsset` and `sanity.fileAsset` documents */
export type AssetBaseShape = SanityDocumentShape & {
  url: SanityString
  path: SanityString
  assetId: SanityString
  extension: SanityString
  mimeType: SanityString
  sha1hash: SanityString
  size: SanityNumber
  originalFilename: SanityOptional<SanityString>
  uploadId: SanityOptional<SanityString>
  // Extensions
  label: SanityOptional<SanityString>
  title: SanityOptional<SanityString>
  description: SanityOptional<SanityString>
  altText: SanityOptional<SanityString>
  // External asset source extensions
  creditLine: SanityOptional<SanityString>
  source: SanityOptional<SanityObject<AssetSourceSpecShape>>
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
  _type: SanityLiteral<'sanity.imageDimensions'>
  height: SanityNumber
  width: SanityNumber
  aspectRatio: SanityNumber
}

const IMAGE_DIMENSIONS: SanityObject<ImageDimensionsShape> = dt({
  typeName: 'object',
  shape: {
    _type: lit('sanity.imageDimensions'),
    height: NUMBER,
    width: NUMBER,
    aspectRatio: NUMBER,
  },
})

export type ImageSwatchShape = {
  _type: SanityLiteral<'sanity.imagePaletteSwatch'>
  background: SanityString
  foreground: SanityString
  population: SanityNumber
  title: SanityOptional<SanityString>
}

const IMAGE_SWATCH: SanityObject<ImageSwatchShape> = dt({
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
  _type: SanityLiteral<'sanity.imagePalette'>
} & Record<ImagePaletteName, SanityOptional<SanityObject<ImageSwatchShape>>>

const IMAGE_PALETTE: SanityObject<ImagePaletteShape> = dt({
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
  _type: SanityLiteral<'sanity.imageMetadata'>
  dimensions: SanityObject<ImageDimensionsShape>
  location: SanityOptional<SanityObject<GeopointShape>>
  palette: SanityOptional<SanityObject<ImagePaletteShape>>
  lqip: SanityOptional<SanityString>
  blurHash: SanityOptional<SanityString>
  hasAlpha: SanityBoolean
  isOpaque: SanityBoolean
}

const IMAGE_METADATA: SanityObject<ImageMetadataShape> = dt({
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
  _type: SanityLiteral<'sanity.imageAsset'>
  metadata: SanityObject<ImageMetadataShape>
}

/** @internal */
export const IMAGE_ASSET: SanityDocument<ImageAssetShape> = dt({
  typeName: 'document',
  shape: {
    ...assetBase,
    _type: lit('sanity.imageAsset'),
    metadata: IMAGE_METADATA,
  },
})

export type FileAssetShape = AssetBaseShape & {
  _type: SanityLiteral<'sanity.fileAsset'>
}

/** @internal */
export const FILE_ASSET: SanityDocument<FileAssetShape> = dt({
  typeName: 'document',
  shape: {
    ...assetBase,
    _type: lit('sanity.fileAsset'),
  },
})

export type SanityImageShape = {
  _type: SanityLiteral<'image'>
  asset: SanityReference<SanityDocument<ImageAssetShape>>
}

/** @internal */
export const ImageBase: SanityObject<SanityImageShape> = dt({
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

export type SanityFileShape = {
  _type: SanityLiteral<'file'>
  asset: SanityReference<SanityDocument<FileAssetShape>>
}

/** @internal */
export const FileBase: SanityObject<SanityFileShape> = dt({
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

export type SanityArrayValue<ElementType> = Array<
  ElementType extends object
    ? Combine<ElementType, {_key: string}>
    : ElementType
> &
  OutputFormatFix

export type SanityDocumentValue = OutputFromShape<SanityDocumentShape>

/**
 * The value of a `reference()` to a document of type `RefType`, for annotating
 * recursive schemas by hand. `$refSchema` is optional here so that
 * hand-written values typecheck; `parse` still attaches it.
 */
export type SanityReferenceValue<RefType> = Combine<
  ReferenceBase,
  Partial<Conceal<SanityType<RefType>>>
>
