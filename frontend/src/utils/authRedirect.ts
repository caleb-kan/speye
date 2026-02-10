import { getRuntimeBase } from './getRuntimeBase'

export const buildRedirectUrl = (): string => {
  return `${window.location.origin}${getRuntimeBase()}home`
}
