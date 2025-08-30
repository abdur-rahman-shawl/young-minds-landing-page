
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionLobby } from "./SessionLobby"
import { LiveSessionUI } from "./LiveSessionUI"
import { SessionRating } from "./SessionRating"
import { CheckCircle } from "lucide-react"
import { Button } from "../ui/button"

interface Session {
  id: string
  title: string
  mentorName?: string
  mentorAvatar?: string
}

interface SessionViewModalProps {
  session: Session | null
  isOpen: boolean
  onClose: () => void
}

type Stage = 'lobby' | 'in-call' | 'rating' | 'success'

export function SessionViewModal({ session, isOpen, onClose }: SessionViewModalProps) {
  const [stage, setStage] = useState<Stage>('lobby')

  const handleJoin = () => {
    setStage('in-call')
  }

  const handleTimeUp = () => {
    // In a real app, you might have different logic if the user hangs up early
    setStage('rating')
  }

  const handleSubmitRating = (rating: number, feedback: string) => {
    console.log("Rating submitted:", { rating, feedback, sessionId: session?.id })
    // Here you would make an API call to save the feedback
    setStage('success')
    // Auto-close after a few seconds
    setTimeout(() => {
      handleClose()
    }, 3000)
  }

  const handleSkipRating = () => {
    console.log("Rating skipped for session:", session?.id)
    handleClose()
  }

  const handleClose = () => {
    onClose()
    // Reset to lobby for the next time it opens
    setTimeout(() => {
      setStage('lobby')
    }, 300) // Delay to allow for closing animation
  }

  const getStageTitle = (stage: Stage) => {
    switch (stage) {
      case 'lobby':
        return `Joining session: ${session?.title}`;
      case 'in-call':
        return `Session in progress with ${session?.mentorName}`;
      case 'rating':
        return `Rate your session with ${session?.mentorName}`;
      case 'success':
        return 'Feedback submitted';
      default:
        return 'Session';
    }
  };

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{getStageTitle(stage)}</DialogTitle>
        </DialogHeader>
        {stage === 'lobby' && (
          <SessionLobby
            mentorName={session.mentorName || 'Mentor'}
            sessionTitle={session.title}
            onJoin={handleJoin}
          />
        )}
        {stage === 'in-call' && (
          <LiveSessionUI
            mentorName={session.mentorName || 'Mentor'}
            mentorAvatar={session.mentorAvatar}
            onTimeUp={handleTimeUp}
          />
        )}
        {stage === 'rating' && (
          <SessionRating
            mentorName={session.mentorName || 'Mentor'}
            mentorAvatar={session.mentorAvatar}
            onSubmit={handleSubmitRating}
            onSkip={handleSkipRating}
          />
        )}
        {stage === 'success' && (
          <div className="flex flex-col items-center justify-center h-full p-8 bg-green-50 dark:bg-green-900/20 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feedback Submitted!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Thank you for helping us improve.</p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
