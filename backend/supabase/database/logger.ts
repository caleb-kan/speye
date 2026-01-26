interface DbQueryInfo {
  table: string
  action: string
  errors?: string
  timestamp?: string
}

/*
    Logs database query information. Only in development.
*/
export function logDbQuery(info: DbQueryInfo) {
  if (import.meta.env.MODE === 'development') {
    // add timestamp
    const timestamp = new Date().toISOString()
    info = { ...info, timestamp }

    console.debug('[DB LOG]', info)
  }
}
