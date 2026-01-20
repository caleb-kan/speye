type AnswerOptionProps = {
  text: string
}

export function AnswerOption({ text }: AnswerOptionProps) {
  return (
    <button
      type="button"
      className="
        w-full text-left
        px-4 py-3 rounded-lg
        bg-bg-secondary hover:bg-bg-secondary/80
        border border-text-secondary/20
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-primary
      "
    >
      <span className="text-sm leading-relaxed">{text}</span>
    </button>
  )
}
