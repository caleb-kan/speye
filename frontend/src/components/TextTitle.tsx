import { ExternalLink } from 'lucide-react'

type TextTitleProps = {
  /** Title of the text */
  title: string
  /** Source URL of the text (optional) */
  source?: string | null
  /** Whether the reader is showing a summary */
  isSummary?: boolean
}

/**
 * Shared text title component used by both standard Reader and AdaptiveReader
 *
 * Displays:
 * - Centered title in primary color if source provided (with external link icon)
 * - Plain text title if no source
 * - "Summary" badge next to title when reading a summary
 */
export function TextTitle({ title, source, isSummary }: TextTitleProps) {
  const titleContent = source ? (
    <a
      href={source}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline inline-flex items-center gap-2"
    >
      {title}
      <ExternalLink />
    </a>
  ) : (
    <span className="text-text">{title}</span>
  )

  return (
    <h2 className="text-2xl font-semibold text-center">
      {isSummary ? (
        <span className="inline-flex items-center justify-center gap-2">
          {titleContent}
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
            Summary
          </span>
        </span>
      ) : (
        titleContent
      )}
    </h2>
  )
}
