import {type OutputOf, type SchemaAnnotations} from '../defs'
import {defineType} from '../helpers/defineType'
import {GEOPOINT} from '../shapeDefs'

/** A `geopoint` object: `{_type: 'geopoint', lat, lng, alt?}` */
export function geopoint(
  annotations?: SchemaAnnotations<OutputOf<typeof GEOPOINT>>,
): typeof GEOPOINT {
  return annotations ? defineType({...GEOPOINT}, annotations) : GEOPOINT
}
