import { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../hooks/useTheme'
import { useEscapeKey } from '../hooks/useEscapeKey'

export function ThemePicker() {
  const { theme, themes, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEscapeKey(close, open)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative flex items-center" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded hover:opacity-80 transition-opacity"
        aria-label="Change theme"
        aria-expanded={open}
      >
        <img src={`/favicons/alt/${theme.id}.png`} alt="" className="h-6" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 p-2.5 rounded-2xl bg-bg-secondary/80 backdrop-blur-md shadow-md w-max"
          role="radiogroup"
          aria-label="Theme selector"
        >
          <div className="grid grid-cols-4 gap-1.5">
            {themes.map((t) => (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={theme.id === t.id}
                aria-label={t.name}
                onClick={() => {
                  setTheme(t.id)
                  setOpen(false)
                }}
                className={`relative px-1 py-1.5 rounded-lg border-2 transition-all ${
                  theme.id === t.id
                    ? 'border-primary'
                    : 'border-transparent hover:border-text-secondary/30'
                }`}
                style={{ backgroundColor: t.colors.bgSecondary }}
              >
                <img
                  src={`/favicons/alt/${t.id}.png`}
                  alt=""
                  className="h-4 mx-auto"
                />
                <span
                  className="text-[10px] font-medium block text-center mt-1 whitespace-nowrap"
                  style={{ color: t.colors.text }}
                >
                  {t.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
