/**
 * Detects the runtime deployment base path by checking against known deployment paths.
 * Supports two deployment styles:
 * - /project/2025/60021/g256002102/web/ (specification defined url)
 * - / (our url)
 */
export function getRuntimeBase(): string {
  const pathname = window.location.pathname

  if (pathname.startsWith('/project/2025/60021/g256002102/web/')) {
    return '/project/2025/60021/g256002102/web/'
  }

  return '/'
}
