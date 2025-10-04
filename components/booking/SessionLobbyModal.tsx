"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SessionLobby } from "./SessionLobby"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"

interface SessionParticipant {
  id: string
  name: string
  image: string | null
}

interface SessionDetails {
  id: string
  title: string
  mentor: SessionParticipant
  mentee: SessionParticipant
}

interface SessionLobbyModalProps {
  sessionId: string | null
  isOpen: boolean
  viewerRole: "mentor" | "mentee"
  onClose: () => void
}

export function SessionLobbyModal({ sessionId, isOpen, viewerRole, onClose }: SessionLobbyModalProps) {
  const router = useRouter()
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !sessionId) {
      return
    }

    let isCancelled = false

    const fetchSessionDetails = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/sessions/${sessionId}`)
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load session details")
        }
        const data = await response.json()
        if (!isCancelled) {
          setSessionDetails(data as SessionDetails)
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to fetch session details:", err)
          setError(err instanceof Error ? err.message : "Failed to load session details")
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchSessionDetails()

    return () => {
      isCancelled = true
    }
  }, [isOpen, sessionId])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      setMediaStream(stream)
      setIsCameraOn(true)
    } catch (err) {
      console.error("Error accessing camera:", err)
      setIsCameraOn(false)
    }
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
    }
    setMediaStream(null)
    setIsCameraOn(false)
  }

  const handleJoin = () => {
    if (sessionId) {
      router.push(`/session/${sessionId}`)
    }
    handleClose()
  }

  const handleClose = () => {
    stopCamera()
    setSessionDetails(null)
    setError(null)
    onClose()
  }

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaStream])

  if (!sessionId) {
    return null
  }

  const counterpart = viewerRole === "mentor" ? sessionDetails?.mentee : sessionDetails?.mentor

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Joining session</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparing your meeting room…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex h-full items-center justify-center p-6">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to prepare session</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && !error && sessionDetails && counterpart && (
          <SessionLobby
            counterpartName={counterpart.name}
            sessionTitle={sessionDetails.title}
            onJoin={handleJoin}
            isCameraOn={isCameraOn}
            mediaStream={mediaStream}
            startCamera={startCamera}
            stopCamera={stopCamera}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

