import {type SanityFile, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {type FieldErrors} from '../helpers/schemaErrors'
import {FileBase, type SanityFileShape} from '../shapeDefs'

export function file(): SanityFile<SanityFileShape>
export function file<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldErrors<Shape>>,
): SanityFile<Shape & SanityFileShape>
export function file(shape: SanityObjectShape = {}): SanityFile {
  return defineType({
    typeName: 'file',
    shape: {...FileBase.shape, ...deferGetters(shape)},
  })
}
