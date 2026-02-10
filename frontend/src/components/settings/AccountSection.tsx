import { LogOut } from 'lucide-react'

export type AccountSectionProps = {
  onSignOut: () => Promise<void>
}

export function AccountSection({ onSignOut }: AccountSectionProps) {
  return (
    <section>
      <h2 className="text-sm text-text-secondary mb-2 text-center">account</h2>
      <div className="bg-bg-secondary rounded-lg p-3">
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-error hover:bg-error/10 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          <span className="text-sm">Log out</span>
        </button>
      </div>
    </section>
  )
}
