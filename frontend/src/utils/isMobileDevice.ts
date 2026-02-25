export function isMobileDevice(): boolean {
  const hasTouchScreen =
    'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) < 768
  return hasTouchScreen && isSmallScreen
}
