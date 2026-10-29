/** Return a local application path suitable for either router.push or a callback redirect. */
export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return '/'
  }

  // Inspect decoded input too: encoded slashes and backslashes can change how a
  // destination is interpreted by downstream routers or redirect handlers.
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(decoded)) return '/'
    const base = new URL('https://local.invalid')
    const target = new URL(value, base)
    if (target.origin !== base.origin || target.pathname.startsWith('//')) return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}
