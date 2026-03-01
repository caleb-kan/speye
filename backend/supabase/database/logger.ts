interface DbQueryInfo {
  table: string
  action: string
  errors?: string
  timestamp?: string
}

/** Logs database query information. Debug logs are dev-only; errors are always logged. */
export function logDbQuery(info: DbQueryInfo) {
  if (info.errors) {
    console.error('[DB ERROR]', {
      ...info,
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (import.meta.env.MODE === 'development') {
    const timestamp = new Date().toISOString()
    console.debug('[DB LOG]', { ...info, timestamp })
  }
}
