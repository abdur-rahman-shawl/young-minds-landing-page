"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionLobby } from "./SessionLobby"

interface Session {
  id: string
  title: string
  mentorName?: string
}

interface SessionLobbyModalProps {
  session: Session | null
  isOpen: boolean
  onClose: () => void
}

export function SessionLobbyModal({ session, isOpen, onClose }: SessionLobbyModalProps) {
  const router = useRouter()
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

  const handleJoin = () => {
    // Pass session data to the new page via query params or state
    // For simplicity in this simulation, we'll just navigate
    router.push(`/session/${session?.id}`)
    handleClose()
  }

  const handleClose = () => {
    stopCamera() // Ensure camera is off when modal closes
    onClose()
  }

  // Cleanup effect when the modal is forced to unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Joining session: {session.title}</DialogTitle>
        </DialogHeader>
        <SessionLobby
          mentorName={session.mentorName || 'Mentor'}
          sessionTitle={session.title}
          onJoin={handleJoin}
          isCameraOn={isCameraOn}
          mediaStream={mediaStream}
          startCamera={startCamera}
          stopCamera={stopCamera}
        />
      </DialogContent>
    </Dialog>
  )
}
