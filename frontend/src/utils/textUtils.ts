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

/**
 * Compute cumulative word offsets for an array of section contents.
 * Returns an array of length `sections.length + 1` where `offsets[i]` is the
 * global word index at the start of section `i`, and the last entry is the
 * total word count across all sections.
 */
export function computeSectionWordOffsets(
  sections: { content: string }[]
): number[] {
  const offsets = [0]
  sections.forEach((section) => {
    const words = section.content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
    offsets.push(offsets[offsets.length - 1] + words.length)
  })
  return offsets
}
