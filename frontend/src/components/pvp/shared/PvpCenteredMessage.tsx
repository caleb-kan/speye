type PvpCenteredMessageProps = {
  children: React.ReactNode
}

export function PvpCenteredMessage({ children }: PvpCenteredMessageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      {children}
    </div>
  )
}

export function PvpLoadingSpinner() {
  return (
    <PvpCenteredMessage>
      <div
        className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading"
      />
    </PvpCenteredMessage>
  )
}

export function PvpLoginRequired() {
  return (
    <PvpCenteredMessage>
      <p className="text-text-secondary">Please log in to play PvP.</p>
    </PvpCenteredMessage>
  )
}
