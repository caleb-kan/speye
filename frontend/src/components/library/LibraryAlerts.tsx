export type LibraryAlertsProps = {
  successMessage: string | null
  errorMessage: string | null
}

export function LibraryAlerts({
  successMessage,
  errorMessage,
}: LibraryAlertsProps) {
  return (
    <>
      {successMessage && (
        <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          {errorMessage}
        </div>
      )}
    </>
  )
}
