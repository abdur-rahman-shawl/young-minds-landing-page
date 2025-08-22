import useSWR from 'swr'

interface MenteeSessionData {
  menteeId: string
  mentee: {
    id: string
    email: string
    name: string | null
    image: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    bio: string | null
    timezone: string | null
  }
  totalSessions: number
  completedSessions: number
  upcomingSessions: number
  cancelledSessions: number
  lastSessionDate: Date | null
  nextSessionDate: Date | null
  firstSessionDate: Date | null
}

interface MentorSessionStats {
  totalMentees: number
  totalSessions: number
  completedSessions: number
  upcomingSessions: number
  cancelledSessions: number
  activeMentees: number
}

interface MenteesSessionsResponse {
  mentees: MenteeSessionData[]
  stats: MentorSessionStats
  count: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch mentees')
  }
  return response.json()
}

export function useMentorMenteeSessions() {
  const { data, error, isLoading, mutate } = useSWR<MenteesSessionsResponse>(
    '/api/mentor/mentees-sessions',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    mentees: data?.mentees || [],
    stats: data?.stats,
    isLoading,
    error,
    mutate,
  }
}