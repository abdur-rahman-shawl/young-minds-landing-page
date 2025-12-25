
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionLobby } from "./SessionLobby"
import { LiveSessionUI } from "./LiveSessionUI"
import { SessionRating } from "./SessionRating"
import { CheckCircle } from "lucide-react"
import { Button } from "../ui/button"
import { logConsentEvents } from "@/lib/consent-client"

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
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setMediaStream(stream);
      setIsCameraOn(true);
      logConsentEvents({
        consentType: "camera",
        action: "granted",
        source: "browser_prompt",
        context: { location: "session-view-modal" },
      })
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraOn(false);
      logConsentEvents({
        consentType: "camera",
        action: "denied",
        source: "browser_prompt",
        context: {
          location: "session-view-modal",
          error: err instanceof Error ? err.message : "unknown_error",
        },
      })
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    setMediaStream(null);
    setIsCameraOn(false);
  };

  const handleJoin = async () => {
    if (session) {
      try {
        await fetch(`/api/bookings/${session.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' }),
          }
        );
      } catch (error) {
        console.error("Failed to update session status to 'in_progress':", error);
      }
    }
    setStage('in-call');
  };

  const handleTimeUp = async () => {
    if (session) {
      try {
        await fetch(`/api/bookings/${session.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'completed' }),
          }
        );
      } catch (error) {
        console.error("Failed to update session status to 'completed':", error);
      }
    }
    setStage('rating');
  };

  const { session: authSession } = useAuth();

  const handleSubmitRating = async (rating: number, feedback: string) => {
    if (!session || !authSession) {
      toast.error("You must be logged in to submit a review.");
      return;
    }

    const payload = {
      sessionId: session.id,
      revieweeId: session.mentorId,
      rating: rating,
      comment: feedback,
      reviewerRole: 'mentee',
    };

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      toast.success("Review submitted successfully!");
      setStage('success');
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (error) {
      console.error("Failed to submit review:", error);
      toast.error("There was an error submitting your review.");
    }
  };

  const handleSkipRating = async () => {
    if (!session || !authSession) {
      return handleClose();
    }

    const payload = {
      sessionId: session.id,
      revieweeId: session.mentorId,
      rating: 0, // 0 for skipped
      comment: 'skipped',
      reviewerRole: 'mentee',
    };

    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to record skipped review:", error);
    }
    
    handleClose();
  };

  const handleClose = () => {
    stopCamera() // Ensure camera is off when modal closes
    onClose()
    setTimeout(() => {
      setStage('lobby')
    }, 300)
  }

  // Cleanup effect when the modal is forced to unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

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
            isCameraOn={isCameraOn}
            mediaStream={mediaStream}
            startCamera={startCamera}
            stopCamera={stopCamera}
          />
        )}
        {stage === 'in-call' && (
          <LiveSessionUI
            mentorName={session.mentorName || 'Mentor'}
            mentorAvatar={session.mentorAvatar}
            onTimeUp={handleTimeUp}
            isCameraOn={isCameraOn}
            mediaStream={mediaStream}
            startCamera={startCamera}
            stopCamera={stopCamera}
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
