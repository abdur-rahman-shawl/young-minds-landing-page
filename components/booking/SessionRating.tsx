"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, ThumbsUp, MessageCircle, Zap, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// --- Component Props ---
interface SessionRatingProps {
  sessionId: string;
  reviewee: {
    id: string;
    name: string;
    avatar?: string | null;
    role: 'mentor' | 'mentee';
  };
  onComplete: () => void;
}

// --- Type for the questions fetched from the API ---
interface ReviewQuestion {
  id: string;
  questionText: string;
  displayOrder: number;
}

export function SessionRating({ sessionId, reviewee, onComplete }: SessionRatingProps) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!sessionId || !reviewee.role) return;
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/reviews/questions?role=${reviewee.role}&sessionId=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch review questions.");
        }
        
        const data: ReviewQuestion[] = await response.json();
        setQuestions(data);
      } catch (err: any) {
        setError(err.message);
        toast.error("Could not load questions", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId, reviewee.role]);

  const handleSubmit = async () => {
    if (!allQuestionsRated) {
      toast.error("Please rate all questions before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    const ratingsPayload = Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating }));

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, feedback, ratings: ratingsPayload }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback.");
      }

      toast.success("Feedback submitted!", { description: "Thank you for helping us improve." });
      onComplete();

    } catch (err: any) {
      setError(err.message);
      toast.error("Submission Failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const allQuestionsRated = questions.length > 0 && questions.every(q => ratings[q.id] > 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-2xl w-full p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        {/* Spinner component removed */}
        <p className="text-lg text-gray-600 dark:text-gray-400">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center max-w-2xl w-full p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

   const handleRatingChange = (questionId: string, value: number) => {
    setRatings(prev => ({ ...prev, [questionId]: value }));
  };

  // THIS IS THE CORRECT IMPLEMENTATION
  const handleHoverChange = (questionId: string, value: number) => {
    setHoverRatings(prev => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl w-full p-8 sm:p-12 bg-white dark:bg-gray-800 text-center rounded-2xl shadow-2xl">
      <Avatar className="w-24 h-24 mb-4">
        <AvatarImage src={reviewee.avatar ?? undefined} />
        <AvatarFallback className="text-3xl bg-gray-700">{reviewee.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Rate your session with {reviewee.name}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Your feedback helps us improve the community.</p>

      {/* Dynamic Questions & Ratings */}
      <div className="w-full max-w-md space-y-6 mb-8 text-left">
        {questions.map((question) => (
          <div key={question.id}>
            <p className="text-gray-800 dark:text-gray-200 font-medium mb-2">{question.questionText}</p>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 cursor-pointer transition-colors ${
                    (hoverRatings[question.id] || ratings[question.id] || 0) >= star 
                      ? "text-yellow-400" 
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                  fill={(hoverRatings[question.id] || ratings[question.id] || 0) >= star ? "currentColor" : "none"}
                  onClick={() => handleRatingChange(question.id, star)}
                  onMouseEnter={() => handleHoverChange(question.id, star)}
                  onMouseLeave={() => handleHoverChange(question.id, 0)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Comments Box */}
      <Textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Any additional feedback or suggestions? (optional)"
        className="w-full max-w-md mb-8"
        rows={3}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button variant="ghost" onClick={onComplete}>Skip</Button>
        <Button size="lg" onClick={handleSubmit} disabled={!allQuestionsRated || isSubmitting}>
          {/* Spinner component removed from button */}
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  )
}