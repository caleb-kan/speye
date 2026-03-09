import { MAX_CONTENT_CHARACTERS } from '../../constants/textUpload'
import { ContentStats } from './ContentStats'

interface SimpleContentEditorProps {
  content: string
  onContentChange: (content: string) => void
  mode: 'upload' | 'edit'
  isSubmitting: boolean
}

/**
 * Simple textarea editor for non-sectional text
 */
export function SimpleContentEditor({
  content,
  onContentChange,
  mode,
  isSubmitting,
}: SimpleContentEditorProps) {
  return (
    <div>
      <label
        htmlFor={`${mode}-text-content`}
        className="block text-sm font-medium text-text mb-2 ml-1"
      >
        Text Content
      </label>
      <textarea
        id={`${mode}-text-content`}
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Paste or type your text here..."
        className="w-full text-sm h-64 p-3 bg-bg border border-text-secondary/20 rounded-lg text-text placeholder-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        maxLength={MAX_CONTENT_CHARACTERS}
        disabled={isSubmitting}
        required={true}
      />
      <ContentStats content={content} />
    </div>
  )
}
