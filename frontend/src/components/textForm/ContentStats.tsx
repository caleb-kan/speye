import {
  MAX_CONTENT_CHARACTERS,
  CONTENT_CHARACTER_WARNING_THRESHOLD,
} from '../../constants/textUpload'
import { formatNumberWithCommas, countWords } from '../../utils/textUtils'

interface ContentStatsProps {
  content: string
  className?: string
}

export function ContentStats({ content, className = '' }: ContentStatsProps) {
  return (
    <div className={`w-full flex justify-between ${className}`}>
      <div className="text-xs text-text-secondary ml-1">
        {countWords(content)} words
      </div>
      <div
        className={`text-xs mr-1 text-right ${
          content.length / MAX_CONTENT_CHARACTERS >
          CONTENT_CHARACTER_WARNING_THRESHOLD
            ? 'text-error'
            : 'text-text-secondary'
        }`}
      >
        {content.length}/{formatNumberWithCommas(MAX_CONTENT_CHARACTERS)}{' '}
        characters
      </div>
    </div>
  )
}
