import {type SanityFile, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {FileBase, type SanityFileShape} from '../shapeDefs'
import {type FieldSchemas} from './object'

export function file(): SanityFile<SanityFileShape>
export function file<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldSchemas<Shape>>,
): SanityFile<Shape & SanityFileShape>
export function file(shape: SanityObjectShape = {}): SanityFile {
  return defineType({
    typeName: 'file',
    shape: {...FileBase.shape, ...deferGetters(shape)},
  })
}
