import {
  type FileSchema,
  type ObjectShape,
  type OutputOf,
  type SchemaAnnotations,
} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'
import {FileBase, type FileShape} from '../shapeDefs'

export function file(): FileSchema<FileShape>
export function file<Shape extends {[key: string]: any} = ObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape>>,
  annotations?: NoInfer<
    SchemaAnnotations<OutputOf<FileSchema<Shape & FileShape>>>
  >,
): FileSchema<Shape & FileShape>
export function file(
  shape: ObjectShape = {},
  annotations?: SchemaAnnotations<any>,
): FileSchema {
  return defineType(
    {
      typeName: 'file',
      shape: {...FileBase.shape, ...deferGetters(shape)},
    },
    annotations,
  )
}
