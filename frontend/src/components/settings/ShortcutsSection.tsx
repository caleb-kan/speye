type Shortcut = {
  label: string
  sublabel?: string
  keys: string[]
}

const shortcuts: Shortcut[] = [
  { label: 'Start / Pause reading', keys: ['Space'] },
  { label: 'Previous chunk', sublabel: '(Adaptive Mode)', keys: ['←', '↑'] },
  { label: 'Next chunk', sublabel: '(Adaptive Mode)', keys: ['→', '↓'] },
]

function KeyGroup({ keys }: { keys: string[] }) {
  return (
    <div className="flex gap-2">
      {keys.map((key) => (
        <kbd
          key={key}
          className={`${key.length > 1 ? 'w-14' : 'w-6'} h-6 flex items-center justify-center bg-bg rounded text-xs text-text-secondary font-mono`}
        >
          {key}
        </kbd>
      ))}
    </div>
  )
}

export function ShortcutsSection() {
  return (
    <section className="mb-5">
      <h2 className="text-sm text-text-secondary mb-2 text-center">
        keyboard shortcuts
      </h2>
      <div className="bg-bg-secondary rounded-lg p-3 space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            className="flex items-center justify-between"
          >
            <span className="text-sm text-text">
              {shortcut.label}
              {shortcut.sublabel && (
                <span className="text-text-secondary">
                  {' '}
                  {shortcut.sublabel}
                </span>
              )}
            </span>
            <KeyGroup keys={shortcut.keys} />
          </div>
        ))}
      </div>
    </section>
  )
}
