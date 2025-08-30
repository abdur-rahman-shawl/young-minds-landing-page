
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Wifi, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface LiveSessionUIProps {
  mentorName: string
  mentorAvatar?: string
  onTimeUp: () => void
}

export function LiveSessionUI({ mentorName, mentorAvatar, onTimeUp }: LiveSessionUIProps) {
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(true) // Default to camera off
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [networkQuality, setNetworkQuality] = useState('good')

  // Session Timer Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Network Quality Simulation Logic
  useEffect(() => {
    const networkInterval = setInterval(() => {
      const qualities = ['good', 'ok', 'bad']
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)]
      setNetworkQuality(randomQuality)
    }, 4000) // Change every 4 seconds
    return () => clearInterval(networkInterval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const networkColors = {
    good: 'text-green-500',
    ok: 'text-yellow-500',
    bad: 'text-red-500',
  }

  return (
    <div className="relative w-full h-full bg-gray-900 text-white flex flex-col">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mentor's Video Feed (Placeholder) */}
          <div className="flex-1 flex items-center justify-center bg-black rounded-tl-lg">
            <div className="text-center">
              <div className="relative w-24 h-24 mb-4 animate-pulse rounded-full ring-4 ring-green-500/50 shadow-[0_0_20px_5px] shadow-green-500/30">
                <Avatar className="w-full h-full">
                  <AvatarImage src={mentorAvatar} />
                  <AvatarFallback className="text-3xl bg-gray-700">{mentorName.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <h2 className="text-2xl font-semibold">{mentorName}</h2>
              <p className="text-gray-400 text-sm">Speaking...</p>
            </div>
          </div>

          {/* Self-view (Picture-in-Picture Placeholder) */}
          <div className="absolute top-4 right-4 w-48 h-32 bg-gray-800 rounded-lg shadow-lg border-2 border-gray-700 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-gray-500" />
            <span className="absolute bottom-2 left-2 text-xs font-medium">You</span>
          </div>

          {/* Timer */}
          <div className="absolute top-4 left-4 bg-black/50 p-2 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Duration</span>
              <span className="font-mono ml-4">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 flex justify-center items-center space-x-4 rounded-bl-lg">
            <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-gray-700 hover:bg-gray-600" onClick={() => setIsMicMuted(!isMicMuted)}>
              {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-gray-700 hover:bg-gray-600" onClick={() => setIsCameraOff(!isCameraOff)}>
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </Button>
            <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-gray-700 hover:bg-gray-600" onClick={() => setIsChatOpen(!isChatOpen)}>
              <MessageSquare className="w-6 h-6" />
            </Button>
            <div className={cn("flex items-center space-x-1 text-xs", networkColors[networkQuality as keyof typeof networkColors])}>
              <Wifi className="w-5 h-5" />
              <span>{networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" className="rounded-full w-16 h-12">
                  <PhoneOff className="w-6 h-6" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End Session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to end the session? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onTimeUp} className="bg-red-600 hover:bg-red-700">End Session</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="w-80 bg-gray-800/50 border-l border-gray-700 flex flex-col rounded-r-lg">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Session Chat</h3>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="text-xs text-center text-gray-400">Today</div>
              {/* Mentor Message */}
              <div className="flex items-start gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={mentorAvatar} />
                  <AvatarFallback>{mentorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-sm font-semibold text-white">{mentorName}</span>
                    <span className="text-xs font-normal text-gray-400">{formatTime(2)}</span>
                  </div>
                  <div className="leading-1.5 p-3 bg-gray-700 rounded-e-xl rounded-es-xl">
                    <p className="text-sm font-normal text-white">Welcome! Glad you could make it. What would you like to discuss today?</p>
                  </div>
                </div>
              </div>
              {/* User Message */}
              <div className="flex items-start gap-2.5 justify-end">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse justify-end">
                    <span className="text-sm font-semibold text-white">You</span>
                    <span className="text-xs font-normal text-gray-400">{formatTime(5)}</span>
                  </div>
                  <div className="leading-1.5 p-3 bg-blue-600 rounded-s-xl rounded-ee-xl">
                    <p className="text-sm font-normal text-white">Hi! Thanks for having me. I'd like to start with my resume.</p>
                  </div>
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarFallback>Y</AvatarFallback>
                </Avatar>
              </div>
               {/* Mentor Message */}
              <div className="flex items-start gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={mentorAvatar} />
                  <AvatarFallback>{mentorName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-sm font-semibold text-white">{mentorName}</span>
                    <span className="text-xs font-normal text-gray-400">{formatTime(8)}</span>
                  </div>
                  <div className="leading-1.5 p-3 bg-gray-700 rounded-e-xl rounded-es-xl">
                    <p className="text-sm font-normal text-white">That's a great question. Let's dive into that.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="relative">
                <Input placeholder="Message cannot be sent in this simulation..." className="bg-gray-700 border-gray-600" disabled />
                <Button size="icon" className="absolute right-1.5 top-1.5 h-7 w-7" disabled>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
