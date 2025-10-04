"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Wifi, Send, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"

interface LiveSessionUIProps {
  counterpartName: string
  counterpartAvatar?: string | null
  sessionTitle?: string
  meetingUrl?: string | null
  meetingType?: string | null
  onTimeUp: () => void
  isCameraOn: boolean
  mediaStream: MediaStream | null
  startCamera: () => void
  stopCamera: () => void
  sessionDuration?: number // Duration in seconds
}

export function LiveSessionUI({
  counterpartName,
  counterpartAvatar,
  sessionTitle,
  meetingUrl,
  meetingType,
  onTimeUp,
  isCameraOn,
  mediaStream,
  startCamera,
  stopCamera,
  sessionDuration = 90,
}: LiveSessionUIProps) {
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [networkQuality, setNetworkQuality] = useState("good")
  const [showEndWarning, setShowEndWarning] = useState(false)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState(() => [
    {
      sender: counterpartName,
      text: "Welcome! Glad you could make it. What would you like to discuss today?",
      time: formatTime(2),
    },
    {
      sender: "You",
      text: "Hi! Thanks for having me. I'd like to start with my goals.",
      time: formatTime(5),
    },
    {
      sender: counterpartName,
      text: "That's a great place to start. Let's dive into that.",
      time: formatTime(8),
    },
  ])

  useEffect(() => {
    setMessages(prev => {
      if (!prev.length) return prev
      const updated = [...prev]
      updated[0] = {
        ...updated[0],
        sender: counterpartName,
      }
      updated[2] = {
        ...updated[2],
        sender: counterpartName,
      }
      return updated
    })
  }, [counterpartName])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = () => {
    if (chatInput.trim() !== "") {
      setMessages(prev => ([
        ...prev,
        {
          sender: "You",
          text: chatInput.trim(),
          time: formatTime(timeElapsed),
        },
      ]))
      setChatInput("")
    }
  }

  useEffect(() => {
    if (isCameraOn && mediaStream && pipVideoRef.current) {
      pipVideoRef.current.srcObject = mediaStream
    } else if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = null
    }
  }, [isCameraOn, mediaStream])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    if (timeElapsed === sessionDuration - 30) {
      setShowEndWarning(true)
      const warningTimeout = setTimeout(() => setShowEndWarning(false), 10000)
      return () => clearTimeout(warningTimeout)
    }

    if (timeElapsed >= sessionDuration) {
      onTimeUp()
    }

    return () => clearInterval(timer)
  }, [timeElapsed, onTimeUp, sessionDuration])

  useEffect(() => {
    const networkInterval = setInterval(() => {
      const qualities = ["good", "ok", "bad"] as const
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)]
      setNetworkQuality(randomQuality)
    }, 4000)
    return () => clearInterval(networkInterval)
  }, [])

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
    const secs = (seconds % 60).toString().padStart(2, "0")
    return `${mins}:${secs}`
  }

  const handleToggleCamera = () => {
    if (isCameraOn) {
      stopCamera()
    } else {
      startCamera()
    }
  }

  const networkColors = {
    good: "text-green-400",
    ok: "text-yellow-400",
    bad: "text-red-400",
  }

  const timerColor = showEndWarning ? "text-yellow-400" : "text-white"
  const isPulsing = showEndWarning

  return (
    <div className="relative flex min-h-full flex-col bg-gray-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-950 to-black" />
      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-1">
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <div className="absolute top-6 left-8 right-8 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Session with</p>
                <h2 className="text-2xl font-semibold">{counterpartName}</h2>
                {sessionTitle && (
                  <p className="text-sm text-gray-400">{sessionTitle}</p>
                )}
              </div>
              {meetingUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-gray-800/70 hover:bg-gray-700"
                  onClick={() => window.open(meetingUrl, "_blank", "noopener")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Meeting Link
                </Button>
              )}
            </div>

            <div className="relative flex flex-1 items-center justify-center px-6">
              <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 shadow-2xl">
                <div className="relative h-[540px] w-full bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                  <div className="absolute inset-4 rounded-[32px] border border-gray-800/60 bg-black/20 backdrop-blur-sm" />

                  <div className="absolute inset-4 grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
                    <div className="relative overflow-hidden rounded-[24px] border border-gray-800/60 bg-gray-900/60">
                      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                        <Avatar className="h-24 w-24 border border-gray-700">
                          <AvatarImage src={counterpartAvatar ?? undefined} />
                          <AvatarFallback className="text-3xl bg-gray-700">
                            {counterpartName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">{counterpartName}</h2>
                          {meetingType && (
                            <p className="text-sm text-gray-400 uppercase tracking-[0.2em]">
                              {meetingType}
                            </p>
                          )}
                        </div>
                        <div className="mx-auto w-3/4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-1 h-5 w-5" />
                            <p>
                              This is a simulated meeting environment. Use the toolbar below to toggle your camera, mic, and chat.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[24px] border border-gray-800/60 bg-gray-900/80 p-6">
                      <div className="space-y-6">
                        <div>
                          <p className="text-sm uppercase tracking-wide text-gray-400">Session Agenda</p>
                          <ul className="mt-3 space-y-2 text-sm text-gray-200">
                            <li>• Quick introductions and goals</li>
                            <li>• Focus topic deep dive</li>
                            <li>• Actionable next steps</li>
                          </ul>
                        </div>
                        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 text-sm text-gray-300">
                          <p className="font-medium text-gray-100">Session Tips</p>
                          <ul className="mt-2 space-y-2">
                            <li>• Share relevant documents in advance if possible</li>
                            <li>• Stay focused on one topic per session for best results</li>
                            <li>• Capture action items for follow-up</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "absolute w-48 h-32 bg-gray-800 rounded-lg shadow-lg border-2 border-gray-700 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out z-10",
                isChatOpen ? "bottom-24 left-4" : "top-4 right-4"
              )}
            >
              {isCameraOn ? (
                <video ref={pipVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              ) : (
                <VideoOff className="h-8 w-8 text-gray-500" />
              )}
              <span className="absolute bottom-2 left-2 text-xs font-medium">You</span>
            </div>

            <div
              className={cn(
                "absolute top-4 left-4 bg-black/50 p-2 rounded-lg transition-colors duration-300",
                isPulsing && "animate-pulse"
              )}
            >
              <div className={cn("flex items-center justify-between text-sm", timerColor)}>
                <span className="font-medium">Duration</span>
                <span className="ml-4 font-mono">{formatTime(timeElapsed)}</span>
              </div>
            </div>

            <div className="bg-gray-900/80 backdrop-blur-sm p-4 flex justify-center items-center space-x-4 z-10">
              <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-600" onClick={() => setIsMicMuted(!isMicMuted)}>
                {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <Button variant={isCameraOn ? "secondary" : "destructive"} size="icon" className="h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-600" onClick={handleToggleCamera}>
                {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
              </Button>
              <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full bg-gray-700 hover:bg-gray-600" onClick={() => setIsChatOpen(!isChatOpen)}>
                <MessageSquare className="h-6 w-6" />
              </Button>
              <div className={cn("flex items-center space-x-1 text-xs", networkColors[networkQuality as keyof typeof networkColors])}>
                <Wifi className="h-5 w-5" />
                <span>{networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="h-12 w-16 rounded-full">
                    <PhoneOff className="h-6 w-6" />
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
                    <AlertDialogAction onClick={onTimeUp} className="bg-red-600 hover:bg-red-700">
                      End Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div
            className={cn(
              "bg-gray-800/50 border-l border-gray-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
              isChatOpen ? "w-96" : "w-0"
            )}
          >
            <div className="flex h-full w-96 flex-col">
              <div className="border-b border-gray-700 p-4">
                <h3 className="font-semibold text-white">Session Chat</h3>
              </div>
              <div ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="text-center text-xs text-gray-400">Today</div>
                {messages.map((msg, index) => (
                  <div key={index} className={cn("flex items-start gap-2.5", msg.sender === "You" && "justify-end") }>
                    {msg.sender !== "You" && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={counterpartAvatar ?? undefined} />
                        <AvatarFallback>{counterpartName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col gap-1">
                      <div className={cn("flex items-center space-x-2", msg.sender === "You" && "justify-end") }>
                        <span className="text-sm font-semibold text-white">{msg.sender}</span>
                        <span className="text-xs text-gray-400">{msg.time}</span>
                      </div>
                      <div
                        className={cn(
                          "leading-1.5 p-3",
                          msg.sender === "You" ? "bg-blue-600 rounded-s-xl rounded-ee-xl" : "bg-gray-700 rounded-e-xl rounded-es-xl"
                        )}
                      >
                        <p className="text-sm text-white">{msg.text}</p>
                      </div>
                    </div>
                    {msg.sender === "You" && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>Y</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-700 p-4">
                <div className="relative">
                  <Input
                    placeholder="Type a message..."
                    className="border-gray-600 bg-gray-700"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button size="icon" className="absolute right-1.5 top-1.5 h-7 w-7" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

