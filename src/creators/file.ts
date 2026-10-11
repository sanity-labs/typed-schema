import {type SanityFile, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {FileBase, type SanityFileShape} from '../shapeDefs'
import {type FieldSchemas} from './object'

// TODO: Make `shape` optional.
export function file<Shape extends {[key: string]: any} = SanityObjectShape>(
  shape: Shape & NoInfer<FieldSchemas<Shape>>,
): SanityFile<Shape & SanityFileShape> {
  return defineType({
    typeName: 'file',
    shape: {...FileBase.shape, ...deferGetters(shape)},
  })
}
