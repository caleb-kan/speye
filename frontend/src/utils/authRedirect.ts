export const buildRedirectUrl = (): string => {
  return `${window.location.origin}${import.meta.env.BASE_URL}home`
}
