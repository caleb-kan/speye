import { getRuntimeBase } from './getRuntimeBase'
import { getDefaultReadingRoute } from './routes'

export const buildRedirectUrl = (path?: string): string => {
  const resolvedPath = path ?? getDefaultReadingRoute().slice(1)
  return `${window.location.origin}${getRuntimeBase()}${resolvedPath}`
}
