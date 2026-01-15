import { Header } from '../components/Header'
import { useTheme } from '../hooks/useTheme'

export function Settings() {
  const { theme, setTheme, themes } = useTheme()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center px-8 pt-44 pb-16">
        <div className="w-full max-w-xl">
          {/* Page Title */}
          <h1 className="text-2xl font-semibold text-text mb-10 text-center">
            settings
          </h1>

          {/* Theme Section */}
          <section className="mb-10">
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              theme
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`group relative p-4 rounded-lg border-2 transition-all ${
                    theme.id === t.id
                      ? 'border-primary'
                      : 'border-transparent hover:border-text-secondary/30'
                  }`}
                  style={{ backgroundColor: t.colors.bgSecondary }}
                  aria-label={`Select ${t.name} theme${theme.id === t.id ? ' (currently selected)' : ''}`}
                >
                  {/* Theme Preview */}
                  <div className="flex gap-1.5 mb-3 justify-center">
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
                    className="text-sm font-medium block text-center"
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
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="mb-10">
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              keyboard shortcuts
            </h2>
            <div className="bg-bg-secondary rounded-lg p-5">
              <div className="flex items-center justify-between">
                <span className="text-text">Start / Pause reading</span>
                <kbd className="px-3 py-1.5 bg-bg rounded text-sm text-text-secondary font-mono">
                  Space
                </kbd>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h2 className="text-sm text-text-secondary mb-3 text-center">
              about
            </h2>
            <div className="bg-bg-secondary rounded-lg p-5">
              <p className="text-text mb-5 text-center">
                sp(eye) is an adaptive speed reading platform that helps you
                read faster while maintaining comprehension.
              </p>
              <div className="text-sm text-text-secondary space-y-3">
                <div className="flex gap-3">
                  <span className="text-primary font-medium shrink-0">
                    standard
                  </span>
                  <span>Fixed WPM speed reading with word highlighting</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-text-secondary/50 font-medium shrink-0">
                    adaptive
                  </span>
                  <span className="text-text-secondary/50">
                    Eye-tracking based adaptive speed (coming soon)
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="text-text-secondary/50 font-medium shrink-0">
                    summarized
                  </span>
                  <span className="text-text-secondary/50">
                    AI-powered summarization for non-fiction (coming soon)
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
