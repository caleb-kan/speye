import {
  PAGE_LINKS,
  NOTIFICATION_INPUT_CLASS,
  NOTIFICATION_LABEL_CLASS,
} from '../../../constants/admin.ts'

interface LinkSelectProps {
  value: string
  disabled: boolean
  availableLinks: typeof PAGE_LINKS
  onChange: (link: string) => void
}

export function LinkSelect({
  value,
  disabled,
  availableLinks,
  onChange,
}: LinkSelectProps) {
  return (
    <div>
      <div className="flex items-baseline">
        <label htmlFor="notif-link" className={NOTIFICATION_LABEL_CLASS}>
          Link
        </label>
        <span className="text-sm font-normal text-text-secondary ml-1">
          (optional)
        </span>
      </div>
      <select
        id="notif-link"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={NOTIFICATION_INPUT_CLASS}
        disabled={disabled}
      >
        {availableLinks.map((page) => (
          <option key={page.value} value={page.value}>
            {page.label}
          </option>
        ))}
      </select>
    </div>
  )
}
