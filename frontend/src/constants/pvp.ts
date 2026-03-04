export type MatchResult = 'win' | 'draw' | 'loss'

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

const RANK_ANIMALS = [
  { name: 'Snail', emoji: '\u{1F40C}', color: '#CD7F32' },
  { name: 'Turtle', emoji: '\u{1F422}', color: '#A8B4C0' },
  { name: 'Rabbit', emoji: '\u{1F407}', color: '#FFD700' },
  { name: 'Sparrow', emoji: '\u{1F426}', color: '#00CED1' },
  { name: 'Chimp', emoji: '\u{1F435}', color: '#B388FF' },
  { name: 'Cheetah', emoji: '\u{1F406}', color: '#FF1744' },
] as const

const RANK_LEVELS = ['Baby', 'Young', 'Prime'] as const

const ELO_TIER_START = 0
const ELO_TIER_WIDTH = 100
const ELO_FIRST_TIER_WIDTH = 1100

export type RankLevel = (typeof RANK_LEVELS)[number]

function buildRankTiers() {
  const tiers: {
    tier: string
    level: RankLevel
    emoji: string
    color: string
    minElo: number
    maxElo: number | null
  }[] = []

  let elo = ELO_TIER_START
  for (let a = 0; a < RANK_ANIMALS.length; a++) {
    const animal = RANK_ANIMALS[a]
    for (let l = 0; l < RANK_LEVELS.length; l++) {
      const level = RANK_LEVELS[l]
      const isFirst = a === 0 && l === 0
      const isLast =
        a === RANK_ANIMALS.length - 1 && l === RANK_LEVELS.length - 1
      const width = isFirst ? ELO_FIRST_TIER_WIDTH : ELO_TIER_WIDTH

      tiers.push({
        tier: `${level} ${animal.name}`,
        level,
        emoji: animal.emoji,
        color: animal.color,
        minElo: elo,
        maxElo: isLast ? null : elo + width - 1,
      })

      elo += width
    }
  }

  return tiers
}

export const RANK_TIERS = buildRankTiers()

export type RankTier = string

export type RankInfo = (typeof RANK_TIERS)[number]

// Glow effect constants for rank badges
export const GLOW_SPREAD = 14
export const GLOW_LAYERS = 2

export const GLOW_COLOR: Record<RankLevel, string | null> = {
  Baby: null,
  Young: '#C0C0C0',
  Prime: '#FFD700',
}

// Banner style classes
export const WARNING_BANNER =
  'bg-warning/90 text-bg px-4 py-2 rounded-xl text-sm font-medium'
export const ERROR_BANNER =
  'bg-error/90 text-bg px-4 py-2 rounded-xl text-sm font-medium'

// Milestone labels
export const MILESTONE_LABELS: Record<MilestoneType, string> = {
  halfway: 'Opponent passed halfway!',
  started_quiz: 'Opponent started the quiz!',
  finished: 'Opponent finished!',
}

// Quiz timer visual constants
export const PVP_QUIZ_TIMER_CIRCLE_RADIUS = 42
export const PVP_QUIZ_TIMER_WARNING_FRACTION = 0.5
export const PVP_QUIZ_TIMER_DANGER_FRACTION = 0.25

// Results animation timing
export const PVP_RANK_FILL_DURATION_MS = 1200
export const PVP_RANK_SWAP_DELAY_MS = 1700
export const PVP_EVOLUTION_BANNER_DELAY_MS = 2200

// Result display mappings
export const RESULT_DISPLAY: Record<
  MatchResult,
  { text: string; color: string }
> = {
  win: { text: 'VICTORY', color: 'text-success' },
  draw: { text: 'DRAW', color: 'text-warning' },
  loss: { text: 'DEFEAT', color: 'text-error' },
}

export const RESULT_BADGE: Record<
  MatchResult,
  { label: string; color: string }
> = {
  win: { label: 'W', color: 'text-success bg-success/10' },
  draw: { label: 'D', color: 'text-warning bg-warning/10' },
  loss: { label: 'L', color: 'text-error bg-error/10' },
}

// Leaderboard layout
export const PVP_LEADERBOARD_GRID_COLS =
  'grid-cols-[24px_24px_1fr_60px_60px_52px]'
