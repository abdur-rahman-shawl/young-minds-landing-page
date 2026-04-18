"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useReviewQuestionsQuery, useSubmitSessionReviewMutation } from "@/hooks/queries/use-learning-queries"

interface SessionRatingProps {
  sessionId: string
  reviewee: {
    id: string
    name: string
    avatar?: string | null
    role: 'mentor' | 'mentee'
  }
  onComplete: () => void
  onSubmitted?: () => void
  onSkipped?: () => void
}

interface ReviewQuestion {
  id: string
  questionText: string
  displayOrder: number
}

export function SessionRating({
  sessionId,
  reviewee,
  onComplete,
  onSubmitted,
  onSkipped,
}: SessionRatingProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState("")
  const {
    data: questions = [],
    isLoading,
    error: questionsError,
  } = useReviewQuestionsQuery(
    {
      sessionId,
      role: reviewee.role,
    },
    Boolean(sessionId && reviewee.role)
  )
  const submitSessionReviewMutation = useSubmitSessionReviewMutation()

  useEffect(() => {
    if (!questionsError) {
      return
    }

    const message =
      questionsError instanceof Error
        ? questionsError.message
        : 'Failed to fetch review questions.'
    toast.error('Could not load questions', { description: message })
  }, [questionsError])

  const displayError = useMemo(() => {
    if (questionsError) {
      return questionsError instanceof Error
        ? questionsError.message
        : 'Failed to fetch review questions.'
    }

    if (submitSessionReviewMutation.error) {
      return submitSessionReviewMutation.error instanceof Error
        ? submitSessionReviewMutation.error.message
        : 'Failed to submit feedback.'
    }

    return null
  }, [questionsError, submitSessionReviewMutation.error])

  const allQuestionsRated = questions.length > 0 && questions.every(q => ratings[q.id] > 0)

  const handleSubmit = async () => {
    if (!allQuestionsRated) {
      toast.error('Please rate all questions before submitting.')
      return
    }

    const ratingsPayload = Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating }))
    const completeAfterSubmit = onSubmitted ?? onComplete

    try {
      await submitSessionReviewMutation.mutateAsync({
        sessionId,
        feedback,
        ratings: ratingsPayload,
      })

      toast.success('Feedback submitted!', { description: 'Thank you for helping us improve.' })
      completeAfterSubmit()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback.'
      if (message.includes('already submitted')) {
        toast.success('Feedback already submitted', { description: 'Thanks for sharing your thoughts earlier.' })
        completeAfterSubmit()
        return
      }
      toast.error('Submission Failed', { description: message })
    }
  }

  if (isLoading) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-12 shadow-2xl dark:bg-gray-800">
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading questions...</p>
      </div>
    )
  }

  if (displayError) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl bg-white p-12 shadow-2xl dark:bg-gray-800">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{displayError}</AlertDescription>
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
        <Button variant="ghost" onClick={onSkipped ?? onComplete}>Skip</Button>
        <Button size="lg" onClick={handleSubmit} disabled={!allQuestionsRated || submitSessionReviewMutation.isPending}>
          {submitSessionReviewMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  )
}


