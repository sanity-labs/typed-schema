import {format, isValid, parse, parseISO} from 'date-fns'

// Fixed reference date so that fields missing from the format (e.g. the day
// of month when parsing a year-month) never depend on "now"
const REFERENCE_DATE = new Date(2000, 0, 1)

// ISO 8601 date and time with a mandatory time zone designator: either `Z` or
// an `±HH:mm` offset. Seconds and fractional seconds are optional. This is the
// set of values Sanity's `datetime` type accepts.
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/

export function isStrictlyDateTime(input: string) {
  return ISO_DATETIME_RE.test(input) && isValid(parseISO(input))
}

export function isStrictlyFormatted(input: string, formatStr: string) {
  const parsed = parse(input, formatStr, REFERENCE_DATE)
  return isValid(parsed) && format(parsed, formatStr) === input
}
