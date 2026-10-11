import {type SanityFile, type SanityObjectShape} from '../defs'
import {deferGetters} from '../helpers/deferGetters'
import {defineType} from '../helpers/defineType'
import {FileBase, type SanityFileShape} from '../shapeDefs'

// TODO: Make `shape` optional.
export function file<Shape extends SanityObjectShape = SanityObjectShape>(
  shape: Shape,
): SanityFile<Shape & SanityFileShape> {
  return defineType({
    typeName: 'file',
    shape: {...FileBase.shape, ...deferGetters(shape)},
  })
}
