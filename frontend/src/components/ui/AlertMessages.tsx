export type AlertMessagesProps = {
  successMessage: string | null
  errorMessage: string | null
}

export function AlertMessages({
  successMessage,
  errorMessage,
}: AlertMessagesProps) {
  return (
    <>
      {successMessage && (
        <div
          role="status"
          className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm"
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm"
        >
          {errorMessage}
        </div>
      )}
    </>
  )
}
