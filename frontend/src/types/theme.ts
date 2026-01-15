export type ThemeColors = {
  bg: string
  bgSecondary: string
  text: string
  textSecondary: string
  primary: string
  error: string
  success: string
}

export type Theme = {
  name: string
  id: string
  colors: ThemeColors
}
