import type { Theme } from '../../types/theme'

export type ThemeSectionProps = {
  theme: Theme
  themes: Theme[]
  onThemeChange: (themeId: string) => void
}

export function ThemeSection({
  theme,
  themes,
  onThemeChange,
}: ThemeSectionProps) {
  return (
    <section className="mb-5">
      <h2
        id="theme-heading"
        className="text-sm text-text-secondary mb-2 text-center"
      >
        theme
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="theme-heading"
        className="grid grid-cols-4 gap-2"
      >
        {themes.map((t) => (
          <button
            type="button"
            key={t.id}
            role="radio"
            aria-checked={theme.id === t.id}
            onClick={() => onThemeChange(t.id)}
            className={`group relative p-2 rounded-lg border-2 transition-all ${
              theme.id === t.id
                ? 'border-primary'
                : 'border-transparent hover:border-text-secondary/30'
            }`}
            style={{ backgroundColor: t.colors.bgSecondary }}
          >
            <div className="flex gap-1 mb-1.5 justify-center">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: t.colors.primary }}
              />
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: t.colors.text }}
              />
            </div>
            <span
              className="text-xs font-medium block text-center"
              style={{ color: t.colors.text }}
            >
              {t.name}
            </span>

            {theme.id === t.id && (
              <div className="absolute top-1 right-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
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
  )
}
