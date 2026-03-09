/** TTLs for cached data (milliseconds). */
export const CACHE_TTL = {
  TEXT_CONTENT: 7 * 24 * 60 * 60 * 1000, // 7 days
  LIBRARY_LISTING: 1 * 60 * 60 * 1000, // 1 hour
  ACTIVITY: 30 * 60 * 1000, // 30 min
  BEST_SCORES: 1 * 60 * 60 * 1000, // 1 hour
  LAST_READ_DATES: 1 * 60 * 60 * 1000, // 1 hour
  RECENTLY_QUIZZED: 30 * 60 * 1000, // 30 min
  LAST_POSITION: Infinity, // never expires
  NOTIFICATIONS: 15 * 60 * 1000, // 15 min
} as const

export const SYNC = {
  MAX_RETRY_COUNT: 5,
  UNLOAD_QUEUE_KEY: 'speye-unload-queue',
} as const

export const PREFETCH = {
  ENABLED: true,
  DELAY_MS: 3000,
  COOLDOWN_KEY: 'speye-last-prefetch',
  COOLDOWN_MS: 60 * 60 * 1000, // 1 hour
} as const

export const OFFLINE_WRITE_ERROR = 'This action requires an internet connection'
