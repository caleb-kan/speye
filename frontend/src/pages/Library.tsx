import { Header } from '../components/Header'

export function Library() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-4">
            Library
          </h1>
          <p className="text-[var(--color-text-secondary)] mb-2">
            Your personal text library is coming soon.
          </p>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Save and organize your favorite texts for speed reading practice.
          </p>
        </div>
      </main>
    </div>
  )
}
