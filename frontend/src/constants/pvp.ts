export const PVP_STARTING_ELO = 1000

export const PVP_HEARTBEAT_INTERVAL_MS = 5000
export const PVP_QUEUE_HEARTBEAT_INTERVAL_MS = 10000
export const PVP_PROGRESS_BROADCAST_INTERVAL_MS = 500
export const PVP_MATCH_NOTIFICATION_POLL_MS = 2000

export const PVP_AFK_WARNING_S = 15
export const PVP_AFK_FORFEIT_S = 30
export const PVP_DISCONNECT_WARNING_S = 15
export const PVP_HEARTBEAT_STALENESS_MS = PVP_HEARTBEAT_INTERVAL_MS * 3

export const PVP_POLL_INTERVAL_MS = 2000
export const PVP_SLOW_POLL_INTERVAL_MS = 10000
export const PVP_CLOCK_SYNC_MAX_RETRIES = 2
export const PVP_CLOCK_SYNC_RETRY_DELAY_MS = 1000

export const PVP_MAX_POLL_FAILURES = 3
export const PVP_SUBMIT_STORAGE_PREFIX = 'pvp-submit-'
export const PVP_SUBMIT_MAX_ATTEMPTS = 3
export const PVP_SUBMIT_RETRY_DELAY_MS = 2000

export const PVP_TICK_INTERVAL_MS = 1000

// Game rule constants
export const PVP_QUIZ_QUESTION_TIMER_S = 20
export const PVP_VS_SCREEN_MIN_DURATION_MS = 3000
export const PVP_COUNTDOWN_S = 5
export const PVP_LONG_WAIT_THRESHOLD_S = 60
export const PVP_MILESTONE_TOAST_DISPLAY_MS = 3000
export const PVP_ANSWER_STAGGER_MS = 100

export const PVP_MAX_FORFEIT_ATTEMPTS = 3

export const PVP_COUNTDOWN_TICK_MS = 100
export const PVP_COUNTDOWN_GO_DISPLAY_MS = 600
export const PVP_QUIZ_TIMER_TICK_MS = 50

// Channel retry/reconnection: exponential backoff from 1s to 15s (2x multiplier),
// gives up after 5 attempts, then attempts recovery every 30s.
// Connection is considered lost after 5 consecutive heartbeat send failures.
export const PVP_CHANNEL_INITIAL_RETRY_DELAY_MS = 1000
export const PVP_CHANNEL_MAX_RETRY_DELAY_MS = 15000
export const PVP_CHANNEL_RETRY_BACKOFF_MULTIPLIER = 2
export const PVP_CHANNEL_MAX_RETRY_ATTEMPTS = 5
export const PVP_CHANNEL_SEND_FAIL_THRESHOLD = 5
export const PVP_CHANNEL_RECOVERY_INTERVAL_MS = 30000

// Elo animation
export const PVP_ELO_ANIMATION_DURATION_MS = 1500
export const PVP_ELO_ANIMATION_FRAME_MS = 16
export const PVP_ELO_REFETCH_DELAY_MS = 1000
export const PVP_ELO_MAX_REFETCH_ATTEMPTS = 5

export const MILESTONE_TYPES = ['halfway', 'started_quiz', 'finished'] as const
export type MilestoneType = (typeof MILESTONE_TYPES)[number]

export type PvpPhase =
  | 'loading'
  | 'pregame'
  | 'countdown'
  | 'reading'
  | 'quiz'
  | 'waiting'
  | 'results'
  | 'error'

export const SLOW_POLL_PHASES: Set<PvpPhase> = new Set(['reading', 'quiz'])
export const POLLABLE_PHASES: Set<PvpPhase> = new Set([
  'pregame',
  'waiting',
  'countdown',
  'reading',
  'quiz',
])

export const RANK_TIERS = [
  { tier: 'Bronze', color: '#CD7F32', minElo: 0, maxElo: 1049 },
  { tier: 'Silver', color: '#A8B4C0', minElo: 1050, maxElo: 1199 },
  { tier: 'Gold', color: '#FFD700', minElo: 1200, maxElo: 1349 },
  { tier: 'Platinum', color: '#00CED1', minElo: 1350, maxElo: 1499 },
  { tier: 'Diamond', color: '#B388FF', minElo: 1500, maxElo: 1649 },
  { tier: 'Master', color: '#FF1744', minElo: 1650, maxElo: null },
] as const

export type RankTier = (typeof RANK_TIERS)[number]['tier']

export type RankInfo = (typeof RANK_TIERS)[number]
