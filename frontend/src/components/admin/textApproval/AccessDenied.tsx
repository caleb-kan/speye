export function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-full" role="alert">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text mb-2">Access Denied</h1>
        <p className="text-text-secondary">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  )
}
