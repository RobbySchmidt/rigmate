// navigateTo() throws on a target carrying a protocol or a leading double
// slash (an open redirect) unless external:true is passed - correct, but
// uncaught that throw would surface as an unhandled rejection right after a
// successful login. Validate up front instead of letting navigateTo decide.
export function safeRedirect(value: unknown): string {
  if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/'
}
