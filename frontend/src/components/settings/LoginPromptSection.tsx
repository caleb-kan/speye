export type LoginPromptSectionProps = {
  onLogin: () => void
}

export function LoginPromptSection({ onLogin }: LoginPromptSectionProps) {
  return (
    <section>
      <h2 className="text-sm text-text-secondary mb-2 text-center">account</h2>
      <div className="bg-bg-secondary rounded-lg p-3 text-center">
        <p className="text-sm text-text-secondary mb-3">
          Log in to save your preferences, track your reading progress and use
          sp(eye) offline.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="px-4 py-1.5 text-sm bg-primary text-bg rounded-lg hover:opacity-90 transition-opacity"
        >
          Log in
        </button>
      </div>
    </section>
  )
}
