import type { FixedTextInfo } from '../../types'

export type GenreSelectorProps = {
  fiction: boolean
  fixedText?: FixedTextInfo
  onFictionChange: (fiction: boolean) => void
}

export function GenreSelector({
  fiction,
  fixedText,
  onFictionChange,
}: GenreSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-secondary mr-1">genre:</span>
      {fixedText ? (
        <span className="px-3 py-1.5 text-primary">
          {fixedText.fiction ? 'fiction' : 'non-fiction'}
        </span>
      ) : (
        <>
          <button
            onClick={() => onFictionChange(false)}
            className={`px-3 py-1.5 transition-colors ${
              !fiction ? 'text-primary' : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Non-fiction texts"
            aria-pressed={!fiction}
          >
            non-fiction
          </button>
          <button
            onClick={() => onFictionChange(true)}
            className={`px-3 py-1.5 transition-colors ${
              fiction ? 'text-primary' : 'text-text-secondary hover:text-text'
            }`}
            aria-label="Fiction texts"
            aria-pressed={fiction}
          >
            fiction
          </button>
        </>
      )}
    </div>
  )
}
