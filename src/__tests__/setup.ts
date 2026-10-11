import {expect} from 'vitest'

import {ParseError} from '../parse'

// Show a ParseError's issues in snapshots; the default serializer prints only
// `[ParseError: message]`.
expect.addSnapshotSerializer({
  test: value => value instanceof ParseError,
  serialize: (value, config, indentation, depth, refs, printer) =>
    `ParseError ${printer(
      {
        message: (value as ParseError).message,
        issues: (value as ParseError).issues,
      },
      config,
      indentation,
      depth,
      refs,
    )}`,
})
