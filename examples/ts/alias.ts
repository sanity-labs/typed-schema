import {
  document,
  literal,
  object,
  parse,
  string,
} from '@sanity-labs/typed-schema'

const MuxPluginVideo = document({
  _type: literal('mux.video'),
  name: object({first: string(), last: string()}),
})
//
// const myMuxPluginVideo = MuxPluginVideo.extend({
//   _type: literal("video"),
// })

const vid = parse(MuxPluginVideo, {})
