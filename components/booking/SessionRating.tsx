
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, ThumbsUp, MessageCircle, Zap } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SessionRatingProps {
  mentorName: string
  mentorAvatar?: string
  onSubmit: (rating: number, feedback: string) => void
  onSkip: () => void
}

const feedbackTags = [
  { icon: ThumbsUp, text: "Very Helpful" },
  { icon: MessageCircle, text: "Great Communicator" },
  { icon: Zap, text: "Knowledgeable" },
]

export function SessionRating({ mentorName, mentorAvatar, onSubmit, onSkip }: SessionRatingProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [feedback, setFeedback] = useState("")

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, feedback)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-900 text-center">
      <Avatar className="w-24 h-24 mb-4">
        <AvatarImage src={mentorAvatar} />
        <AvatarFallback className="text-3xl bg-gray-700">{mentorName.charAt(0)}</AvatarFallback>
      </Avatar>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Rate your session with {mentorName}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Your feedback helps us improve the community.</p>

      {/* Star Rating */}
      <div className="flex items-center space-x-2 mb-8">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-10 h-10 cursor-pointer transition-colors ${
              (hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"
            }`}
            fill={(hoverRating || rating) >= star ? "currentColor" : "none"}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          />
        ))}
      </div>

      {/* Feedback Tags */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {feedbackTags.map(tag => (
          <Button key={tag.text} variant="outline" onClick={() => setFeedback(prev => prev ? `${prev}, ${tag.text}` : tag.text)}>
            <tag.icon className="w-4 h-4 mr-2" />
            {tag.text}
          </Button>
        ))}
      </div>

      {/* Comments Box */}
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Add any other comments (optional)..."
        className="w-full max-w-md mb-8"
        rows={3}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button variant="ghost" onClick={onSkip}>Skip</Button>
        <Button size="lg" onClick={handleSubmit} disabled={rating === 0}>Submit Feedback</Button>
      </div>
    </div>
  )
}
