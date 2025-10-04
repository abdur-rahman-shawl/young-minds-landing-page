"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SessionRatingProps {
  sessionId: string
  reviewee: {
    id: string
    name: string
    avatar?: string | null
    role: 'mentor' | 'mentee'
  }
  onComplete: () => void
}

interface ReviewQuestion {
  id: string
  questionText: string
  displayOrder: number
}

export function SessionRating({ sessionId, reviewee, onComplete }: SessionRatingProps) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!sessionId || !reviewee.role) return
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/reviews/questions?role=${reviewee.role}&sessionId=${sessionId}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch review questions.')
        }

        const data: ReviewQuestion[] = await response.json()
        setQuestions(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch review questions.'
        setError(message)
        toast.error('Could not load questions', { description: message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [sessionId, reviewee.role])

  const allQuestionsRated = questions.length > 0 && questions.every(q => ratings[q.id] > 0)

  const handleSubmit = async () => {
    if (!allQuestionsRated) {
      toast.error('Please rate all questions before submitting.')
      return
    }

    setIsSubmitting(true)
    const ratingsPayload = Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating }))

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback, ratings: ratingsPayload }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          toast.success('Feedback already submitted', { description: 'Thanks for sharing your thoughts earlier.' })
          onComplete()
          return
        }
        throw new Error(errorData.error || 'Failed to submit feedback.')
      }

      toast.success('Feedback submitted!', { description: 'Thank you for helping us improve.' })
      onComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback.'
      setError(message)
      toast.error('Submission Failed', { description: message })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-12 shadow-2xl dark:bg-gray-800">
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-12 shadow-2xl dark:bg-gray-800">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleRatingChange = (questionId: string, value: number) => {
    setRatings(prev => ({ ...prev, [questionId]: value }))
  }

  const handleHoverChange = (questionId: string, value: number) => {
    setHoverRatings(prev => ({ ...prev, [questionId]: value }))
  }

  return (
    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800 sm:p-12">
      <Avatar className="mb-4 h-24 w-24">
        <AvatarImage src={reviewee.avatar ?? undefined} />
        <AvatarFallback className="bg-gray-700 text-3xl">{reviewee.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Rate your session with {reviewee.name}</h2>
      <p className="mb-8 text-gray-600 dark:text-gray-400">Your feedback helps us improve the community.</p>

      <div className="mb-8 max-h-[55vh] w-full max-w-md space-y-6 overflow-y-auto pr-1 text-left">
        {questions.map((question) => (
          <div key={question.id}>
            <p className="mb-2 font-medium text-gray-800 dark:text-gray-200">{question.questionText}</p>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-8 w-8 cursor-pointer transition-colors ${
                    (hoverRatings[question.id] || ratings[question.id] || 0) >= star
                      ? 'text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                  fill={(hoverRatings[question.id] || ratings[question.id] || 0) >= star ? 'currentColor' : 'none'}
                  onClick={() => handleRatingChange(question.id, star)}
                  onMouseEnter={() => handleHoverChange(question.id, star)}
                  onMouseLeave={() => handleHoverChange(question.id, 0)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Any additional feedback or suggestions? (optional)"
        className="mb-8 w-full max-w-md"
        rows={3}
      />

      <div className="flex space-x-4">
        <Button variant="ghost" onClick={onComplete}>Skip</Button>
        <Button size="lg" onClick={handleSubmit} disabled={!allQuestionsRated || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  )
}


