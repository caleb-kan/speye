export type LeaderboardEntry = {
  userId: string
  username: string | null
  avatarUrl: string | null
  wpm: number
  quizScore: number
  overallScore: number
  rank: number
}
