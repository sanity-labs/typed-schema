import {
  type OutputOf,
  type SanityFile,
  type SanityObjectShape,
  type SchemaAnnotations,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'
import {FileBase, type SanityFileShape} from '../shapeDefs'

export function file(): SanityFile<SanityFileShape>
export function file<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape>>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<SanityFile<Shape & SanityFileShape>>>
  >,
): SanityFile<Shape & SanityFileShape>
export function file(
  shape: SanityObjectShape = {},
  annotations?: SchemaAnnotations<any>,
): SanityFile {
  return defineType(
    {
      typeName: 'file',
      shape: {...FileBase.shape, ...deferGetters(shape)},
    },
    annotations,
  )
}
