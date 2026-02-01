import { ExternalLink } from 'lucide-react'

type TextTitleProps = {
  /** Title of the text */
  title: string
  /** Source URL of the text (optional) */
  source?: string | null
}

/**
 * Shared text title component used by both standard Reader and AdaptiveReader
 *
 * Displays:
 * - Centered title in primary color if source provided (with external link icon)
 * - Plain text title if no source
 */
export function TextTitle({ title, source }: TextTitleProps) {
  return (
    <h2 className="text-2xl font-semibold text-center">
      {source ? (
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
      )}
    </h2>
  )
}
