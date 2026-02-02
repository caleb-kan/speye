// Source - https://stackoverflow.com/a/2901298
// Posted by Elias Zamaria, modified by community. See post 'Timeline' for change history
// Retrieved 2026-02-02, License - CC BY-SA 4.0

// Format number with commas as thousands separators
export function formatNumberWithCommas(x: number): string {
  return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',')
}

// Word counter
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length
}
