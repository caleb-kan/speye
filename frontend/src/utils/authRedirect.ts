import { getRuntimeBase } from './getRuntimeBase'

export const buildRedirectUrl = (path = 'home'): string => {
  return `${window.location.origin}${getRuntimeBase()}${path}`
}
