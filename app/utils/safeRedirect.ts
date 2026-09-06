// navigateTo() calls ufo's hasProtocol(path, { acceptRelative: true }) and
// throws (NUXT_E2001) unless options.external is set - correct behaviour for
// an open-redirect target, but uncaught it becomes an unhandled rejection
// right after a successful login. So this must match, not approximate,
// what hasProtocol treats as protocol-relative: ufo's own
// PROTOCOL_RELATIVE_REGEX (node_modules/ufo/dist/index.mjs) is
// `/^([/\\]\s*){2,}[^/\\]/` - two or more leading slashes/backslashes, any
// mix, optionally separated by whitespace. The trailing [^/\\] is dropped
// here on purpose: rejecting a run of two-or-more leading slashes/backslashes
// even with nothing (or another such run) after it is strictly safer, never
// less safe, than ufo's own rule. If ufo's regex changes, this must follow.
const PROTOCOL_RELATIVE_PREFIX = /^([/\\]\s*){2,}/

export function safeRedirect(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !PROTOCOL_RELATIVE_PREFIX.test(value)) {
    return value
  }
  return '/'
}
