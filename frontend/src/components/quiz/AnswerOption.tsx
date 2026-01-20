type Props = {
  text: string
}

export function AnswerOption({ text }: Props) {
  return (
    <button
      className="
        w-full text-left
        p-6 rounded-2xl
        bg-white/4 hover:bg-white/8
        border border-white/10
        backdrop-blur
        transition-all duration-200
        hover:translate-x-1
      "
    >
      <span className="text-base leading-relaxed">{text}</span>
    </button>
  )
}
