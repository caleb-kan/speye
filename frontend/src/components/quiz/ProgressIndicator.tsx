type ProgressIndicatorProps = {
  current: number
  total: number
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-8 rounded-full transition-colors duration-300
            ${i < current ? 'bg-primary' : 'bg-text-secondary/20'}
          `}
        />
      ))}
    </div>
  )
}
