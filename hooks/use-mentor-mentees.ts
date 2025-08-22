import useSWR from 'swr'

interface MenteeData {
  id: string
  menteeId: string
  mentorId: string
  status: string
  goals: string | null
  duration: string | null
  frequency: string | null
  rate: string | null
  currency: string | null
  billingType: string | null
  progress: string | null
  milestones: string | null
  startedAt: Date | null
  endedAt: Date | null
  pausedAt: Date | null
  approvedByMentor: boolean | null
  approvedByMentee: boolean | null
  approvedAt: Date | null
  createdAt: Date
  updatedAt: Date
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
}

interface MentorStats {
  total: number
  active: number
  pending: number
  paused: number
  completed: number
  cancelled: number
}

interface MenteesResponse {
  mentees: MenteeData[]
  count: number
  stats?: MentorStats
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch mentees')
  }
  return response.json()
}

export function useMentorMentees(status?: string) {
  const url = status
    ? `/api/mentor/mentees?status=${status}&includeStats=true`
    : '/api/mentor/mentees?includeStats=true'

  const { data, error, isLoading, mutate } = useSWR<MenteesResponse>(
    url,
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