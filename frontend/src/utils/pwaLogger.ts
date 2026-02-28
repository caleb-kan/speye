type PwaLogLevel = 'debug' | 'info' | 'warn' | 'error'

interface PwaLogInfo {
  tag: string
  message: string
  data?: unknown
  error?: unknown
}

const LOG_PREFIX = '[PWA]'

function formatLog(info: PwaLogInfo): [string, ...unknown[]] {
  const timestamp = new Date().toISOString()
  const prefix = `${LOG_PREFIX} [${info.tag}] ${timestamp}`
  const parts: unknown[] = [prefix, info.message]
  if (info.data !== undefined) parts.push(info.data)
  if (info.error !== undefined) parts.push(info.error)
  return parts as [string, ...unknown[]]
}

function shouldLog(): boolean {
  return import.meta.env.MODE === 'development'
}

function log(level: PwaLogLevel, info: PwaLogInfo): void {
  // Errors always log regardless of environment — permanent sync failures
  // (e.g. data loss after max retries) must be visible to operators.
  if (level !== 'error' && !shouldLog()) return

  const args = formatLog(info)
  switch (level) {
    case 'debug':
      console.debug(...args)
      break
    case 'info':
      console.info(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    case 'error':
      console.error(...args)
      break
  }
}

export const pwaLogger = {
  debug: (tag: string, message: string, data?: unknown) =>
    log('debug', { tag, message, data }),
  info: (tag: string, message: string, data?: unknown) =>
    log('info', { tag, message, data }),
  warn: (tag: string, message: string, data?: unknown) =>
    log('warn', { tag, message, data }),
  error: (tag: string, message: string, error?: unknown) =>
    log('error', { tag, message, error }),
}
