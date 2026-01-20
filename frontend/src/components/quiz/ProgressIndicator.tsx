type Props = {
  current: number
  total: number
}

export function ProgressIndicator({ current, total }: Props) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-8 rounded-full transition-all duration-300
            ${i < current ? 'bg-primary' : 'bg-white/10'}
          `}
        />
      ))}
    </div>
  )
}
