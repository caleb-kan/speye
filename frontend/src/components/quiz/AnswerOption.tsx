import { memo } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'

type AnswerOptionProps = {
  text: string
  selected?: boolean
  onSelect?: () => void
}

export const AnswerOption = memo(function AnswerOption({
  text,
  selected,
  onSelect,
}: AnswerOptionProps) {
  const isMobile = useIsMobile()

  return (
    <button
      onClick={onSelect}
      className={`
        group relative w-full text-left
        px-4 sm:px-8 py-2
        rounded-xl
        transition-all duration-200 ease-out

        ${
          selected
            ? 'bg-primary text-bg font-medium shadow-lg scale-[1.01]'
            : 'bg-bg-secondary/50 text-text-secondary hover:bg-bg-secondary hover:text-text'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <span className="block text-lg leading-relaxed">{text}</span>

        {/* Indicator dot for selected state */}
        {!isMobile && selected && (
          <div className="w-2 h-2 rounded-full bg-bg/60 animate-in fade-in zoom-in" />
        )}
      </div>
    </button>
  )
})
