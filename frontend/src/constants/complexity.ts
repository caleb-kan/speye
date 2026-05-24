export const DEFAULT_MIN_COMPLEXITY = 8
export const DEFAULT_MAX_COMPLEXITY = 12
export const MIN_COMPLEXITY = 1
export const MAX_COMPLEXITY = 15

/**
 * Displayed form of a complexity value — the max bucket renders as
 * `${MAX_COMPLEXITY}+` to indicate "and above".
 */
export function formatComplexityDisplay(complexity: number): string {
  return complexity >= MAX_COMPLEXITY
    ? `${MAX_COMPLEXITY}+`
    : String(complexity)
}
