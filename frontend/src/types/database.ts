// Shared types re-exported from backend canonical definitions
export type {
  QuizQuestion,
  QuestionSet,
  Quiz,
  ProcessingStatus,
  LlmDecision,
  AdminDecision,
  FailureStage,
  SectionData,
  TextInput,
  TextPreview,
} from '../../../backend/supabase/database/texts/types'

export type { TextRecord as Text } from '../../../backend/supabase/database/texts/types'

export type {
  PvpGame,
  PvpGameStatus,
  PvpRating,
  PvpLeaderboardEntry,
  PvpLeaderboardEntryWithRank,
  PvpMatchHistoryEntry,
  MatchmakeResult,
  EloHistoryPoint,
} from '../../../backend/supabase/database/pvp/types'
export { PVP_GAME_STATUSES } from '../../../backend/supabase/database/pvp/types'

export type { PvpTextData } from '../../../backend/supabase/database/texts/types'
export type { UsernameRecord } from '../../../backend/supabase/database/users/getUsersUsernames'

export type {
  NotificationType,
  Notification,
} from '../../../backend/supabase/database/notifications/types'
