import { Header } from '../components/Header'
import { useTheme } from '../hooks/useTheme'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Header />

      <main className="pt-28 pb-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-8">
            settings
          </h1>

          {/* Theme Section */}
          <section className="mb-12">
            <h2 className="text-lg text-[var(--color-text-secondary)] mb-4">
              theme
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    theme.id === t.id
                      ? 'border-[var(--color-primary)]'
                      : 'border-transparent hover:border-[var(--color-bg-secondary)]'
                  }`}
                  style={{ backgroundColor: t.colors.bgSecondary }}
                >
                  {/* Theme Preview */}
                  <div className="flex gap-1 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.text }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.colors.textSecondary }}
                    />
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{ color: t.colors.text }}
                  >
                    {t.name}
                  </span>

                  {/* Active Indicator */}
                  {theme.id === t.id && (
                    <div className="absolute top-2 right-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={t.colors.primary}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* About Section */}
          <section className="mb-12">
            <h2 className="text-lg text-[var(--color-text-secondary)] mb-4">
              about
            </h2>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6">
              <p className="text-[var(--color-text)] mb-4">
                sp(eye) is an adaptive speed reading platform that helps you
                read faster while maintaining comprehension.
              </p>
              <div className="text-sm text-[var(--color-text-secondary)]">
                <p className="mb-2">
                  <strong className="text-[var(--color-text)]">
                    Mode 1 - Standard:
                  </strong>{' '}
                  Fixed WPM speed reading with word highlighting
                </p>
                <p className="mb-2">
                  <strong className="text-[var(--color-text)]">
                    Mode 2 - Adaptive:
                  </strong>{' '}
                  Eye-tracking based adaptive speed (coming soon)
                </p>
                <p>
                  <strong className="text-[var(--color-text)]">
                    Mode 3 - Summarized:
                  </strong>{' '}
                  AI-powered summarization for non-fiction (coming soon)
                </p>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h2 className="text-lg text-[var(--color-text-secondary)] mb-4">
              keyboard shortcuts
            </h2>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6">
              <div className="flex items-center justify-between py-2">
                <span className="text-[var(--color-text)]">
                  Start / Pause reading
                </span>
                <kbd className="px-2 py-1 bg-[var(--color-bg)] rounded text-sm text-[var(--color-text-secondary)]">
                  Space
                </kbd>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
