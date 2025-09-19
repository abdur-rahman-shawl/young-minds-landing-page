"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, ThumbsUp, MessageCircle, Zap, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
//import { toast } from "sonner" // Assuming you use 'sonner' for toasts. If not, replace with your preferred method.
//import { Spinner } from "@/components/ui/spinner" // Assuming a Spinner component exists
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Assuming an Alert component exists

// --- Component Props ---
interface SessionRatingProps {
  sessionId: string;
  reviewee: {
    id: string;
    name: string;
    avatar?: string;
    role: 'mentor' | 'mentee';
  };
  onComplete: () => void; // A single callback for when the process is done (submitted or skipped)
}

// --- Type for the questions fetched from the API ---
interface ReviewQuestion {
  id: string;
  questionText: string;
  displayOrder: number;
}

const feedbackTags = [
  { icon: ThumbsUp, text: "Very Helpful" },
  { icon: MessageCircle, text: "Great Communicator" },
  { icon: Zap, text: "Knowledgeable" },
]

export function SessionRating({ sessionId, reviewee, onComplete }: SessionRatingProps) {
  // --- State Management ---
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/review-questions?role=${reviewee.role}&sessionId=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch review questions.");
        }
        
        const data: ReviewQuestion[] = await response.json();
        setQuestions(data);
      } catch (err: any) {
        setError(err.message);
       // toast.error("Could not load questions", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [sessionId, reviewee.role]);

  // --- Handlers ---
  const handleRatingChange = (questionId: string, value: number) => {
    setRatings(prev => ({ ...prev, [questionId]: value }));
  };

  const handleHoverChange = (questionId: string, value: number) => {
    setHoverRatings(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!allQuestionsRated) {
     // toast.error("Please rate all questions before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    
    // Format ratings into the array structure the API expects
    const ratingsPayload = Object.entries(ratings).map(([questionId, rating]) => ({
      questionId,
      rating,
    }));

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          feedback,
          ratings: ratingsPayload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit feedback.");
      }

      //toast.success("Feedback submitted!", { description: "Thank you for helping us improve." });
      onComplete(); // Notify parent component that we are done

    } catch (err: any) {
      setError(err.message);
     // toast.error("Submission Failed", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Derived State ---
  const allQuestionsRated = questions.length > 0 && questions.every(q => ratings[q.id] > 0);

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-2xl w-full p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
        
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading questions...</p>
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

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl w-full p-8 sm:p-12 bg-white dark:bg-gray-800 text-center rounded-2xl shadow-2xl">
      <Avatar className="w-24 h-24 mb-4">
        <AvatarImage src={reviewee.avatar} />
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

      {/* Feedback Tags (Kept for similar look and feel) */}
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
        placeholder="Any additional feedback or suggestions? (optional)"
        className="w-full max-w-md mb-8"
        rows={3}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button variant="ghost" onClick={onComplete}>Skip</Button>
        <Button size="lg" onClick={handleSubmit} disabled={!allQuestionsRated || isSubmitting}>
          {isSubmitting ? null : null}
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
      </div>
    </div>
  )
}