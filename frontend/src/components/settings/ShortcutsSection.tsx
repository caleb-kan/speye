export function ShortcutsSection() {
  return (
    <section className="mb-5">
      <h2 className="text-sm text-text-secondary mb-2 text-center">
        keyboard shortcuts
      </h2>
      <div className="bg-bg-secondary rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text">Start / Pause reading</span>
          <kbd className="px-2 py-1 bg-bg rounded text-xs text-text-secondary font-mono">
            Space
          </kbd>
        </div>
      </div>
    </section>
  )
}
