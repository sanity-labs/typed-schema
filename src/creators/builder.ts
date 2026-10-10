import {
  type OutputOf,
  type SanityOptional,
  type SanityType,
  type UndefinedOptional,
} from '../defs'
import {parse, type ParseResult, safeParse} from '../parse'

export abstract class Builder<Output> implements SanityType {
  abstract typeName: string
  get output(): Output {
    throw new Error('This method is not defined runtime')
  }
  parse(input: unknown): Output {
    return parse(this, input)
  }

  safeParse(input: unknown): ParseResult<Output> {
    return safeParse(this, input)
  }

  optional() {
    return new OptionalBuilder(this)
  }
}

export class OptionalBuilder<
  Type extends SanityType,
  Output = UndefinedOptional<OutputOf<Type>> | undefined,
>
  extends Builder<Output>
  implements SanityOptional<Type>
{
  typeName = 'optional' as const
  constructor(public type: Type) {
    super()
  }
}
