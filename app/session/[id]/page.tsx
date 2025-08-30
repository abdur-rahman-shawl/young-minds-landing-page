"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { LiveSessionUI } from "@/components/booking/LiveSessionUI"
import { SessionRating } from "@/components/booking/SessionRating"
import { CheckCircle } from "lucide-react"

// In a real app, you'd fetch this data based on the `params.id`
const MOCK_SESSION_DATA = {
  id: '12345',
  title: 'Resume Review',
  mentorName: 'Jane Doe',
  mentorAvatar: 'https://github.com/shadcn.png',
}

type Stage = 'in-call' | 'rating' | 'success'

export default function SessionPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [stage, setStage] = useState<Stage>('in-call')
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      setIsCameraOn(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    setMediaStream(null);
    setIsCameraOn(false);
  };

  const handleTimeUp = () => {
    setStage('rating')
  }

  const handleSubmitRating = (rating: number, feedback: string) => {
    console.log("Rating submitted:", { rating, feedback, sessionId: params.id })
    stopCamera()
    setStage('success')
    setTimeout(() => {
      router.push('/dashboard') // Navigate back to dashboard
    }, 3000)
  }

  const handleSkipRating = () => {
    console.log("Rating skipped for session:", params.id)
    stopCamera()
    router.push('/dashboard')
  }

  // Cleanup effect when the user navigates away from the page
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  return (
    <div className="w-screen h-screen bg-gray-900">
      {stage === 'in-call' && (
        <LiveSessionUI
          mentorName={MOCK_SESSION_DATA.mentorName}
          mentorAvatar={MOCK_SESSION_DATA.mentorAvatar}
          onTimeUp={handleTimeUp}
          isCameraOn={isCameraOn}
          mediaStream={mediaStream}
          startCamera={startCamera}
          stopCamera={stopCamera}
        />
      )}
      {(stage === 'rating' || stage === 'success') && (
        <div className="w-full h-full flex items-center justify-center p-4">
          {stage === 'rating' && (
            <SessionRating
              mentorName={MOCK_SESSION_DATA.mentorName}
              mentorAvatar={MOCK_SESSION_DATA.mentorAvatar}
              onSubmit={handleSubmitRating}
              onSkip={handleSkipRating}
            />
          )}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center max-w-2xl w-full p-8 sm:p-12 bg-white dark:bg-gray-800 text-center rounded-2xl shadow-2xl">
              <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feedback Submitted!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">Thank you for helping us improve. You will be redirected shortly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
