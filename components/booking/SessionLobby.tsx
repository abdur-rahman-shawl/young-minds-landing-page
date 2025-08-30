
"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SessionLobbyProps {
  mentorName: string
  sessionTitle: string
  onJoin: () => void
}

export function SessionLobby({ mentorName, sessionTitle, onJoin }: SessionLobbyProps) {
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!isCameraOff) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err)
          setIsCameraOff(true) // Turn off camera if permission is denied
        })
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [isCameraOff])

  const handleJoinClick = () => {
    setIsJoining(true)
    // Simulate a short delay for connecting
    setTimeout(() => {
      onJoin()
      setIsJoining(false)
    }, 1500)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-900">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to join?</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Session with {mentorName}: "{sessionTitle}"</p>

      <div className="w-full max-w-md bg-black rounded-lg overflow-hidden aspect-video mb-6 shadow-lg">
        {isCameraOff ? (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <VideoOff className="w-12 h-12 text-gray-500" />
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <Button variant={isMicMuted ? "destructive" : "secondary"} size="icon" className="rounded-full w-12 h-12" onClick={() => setIsMicMuted(!isMicMuted)}>
          {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        <Button variant={isCameraOff ? "destructive" : "secondary"} size="icon" className="rounded-full w-12 h-12" onClick={() => setIsCameraOff(!isCameraOff)}>
          {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </Button>
      </div>

      <div className="w-full max-w-xs space-y-4 mb-8">
        <Select defaultValue="default-mic">
          <SelectTrigger>
            <SelectValue placeholder="Select Microphone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default-mic">Default Microphone</SelectItem>
            <SelectItem value="disabled-mic" disabled>No other microphones found</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="default-cam">
          <SelectTrigger>
            <SelectValue placeholder="Select Camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default-cam">Default Camera</SelectItem>
             <SelectItem value="disabled-cam" disabled>No other cameras found</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button size="lg" className="w-full max-w-xs" onClick={handleJoinClick} disabled={isJoining}>
        {isJoining ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
        {isJoining ? "Connecting..." : "Join Now"}
      </Button>
    </div>
  )
}
