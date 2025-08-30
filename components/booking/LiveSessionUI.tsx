
"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Wifi, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { AlertTriangle } from "lucide-react"

interface LiveSessionUIProps {
  mentorName: string
  mentorAvatar?: string
  onTimeUp: () => void
  isCameraOn: boolean
  mediaStream: MediaStream | null
  startCamera: () => void
  stopCamera: () => void
  sessionDuration: number // Duration in seconds
}

export function LiveSessionUI({ 
  mentorName, 
  mentorAvatar, 
  onTimeUp, 
  isCameraOn, 
  mediaStream, 
  startCamera, 
  stopCamera, 
  sessionDuration = 90 // Default to 90s for simulation
}: LiveSessionUIProps) {
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [networkQuality, setNetworkQuality] = useState('good')
  const [showEndWarning, setShowEndWarning] = useState(false)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([
    {
      sender: mentorName,
      text: "Welcome! Glad you could make it. What would you like to discuss today?",
      time: formatTime(2),
    },
    {
      sender: 'You',
      text: "Hi! Thanks for having me. I'd like to start with my resume.",
      time: formatTime(5),
    },
    {
      sender: mentorName,
      text: "That's a great question. Let's dive into that.",
      time: formatTime(8),
    },
  ])

  // Scroll to bottom of chat on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (chatInput.trim() !== "") {
      setMessages([
        ...messages,
        {
          sender: 'You',
          text: chatInput.trim(),
          time: formatTime(timeElapsed),
        },
      ]);
      setChatInput("");
    }
  };

  // Attach stream to PiP video element
  useEffect(() => {
    if (isCameraOn && mediaStream && pipVideoRef.current) {
      pipVideoRef.current.srcObject = mediaStream
    } else if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = null
    }
  }, [isCameraOn, mediaStream])

  // Session Timer Logic & Warnings
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    // End of session warning logic
    if (timeElapsed === sessionDuration - 30) { // 60s for a 90s session
      setShowEndWarning(true);
      const warningTimeout = setTimeout(() => setShowEndWarning(false), 10000); // Hide after 10s
      return () => clearTimeout(warningTimeout);
    }

    // End of session logic
    if (timeElapsed >= sessionDuration) {
      onTimeUp();
    }

    return () => clearInterval(timer)
  }, [timeElapsed, onTimeUp, sessionDuration])

  // Network Quality Simulation Logic
  useEffect(() => {
    const networkInterval = setInterval(() => {
      const qualities = ['good', 'ok', 'bad']
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)]
      setNetworkQuality(randomQuality)
    }, 4000)
    return () => clearInterval(networkInterval)
  }, [])

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
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
    good: 'text-green-500',
    ok: 'text-yellow-500',
    bad: 'text-red-500',
  }

  // Derived state for timer color and pulse
  const timerColor = timeElapsed >= sessionDuration - 30 ? 'text-red-500' : timeElapsed >= sessionDuration - 60 ? 'text-yellow-500' : 'text-white';
  const isPulsing = timeElapsed >= sessionDuration - 30;

  return (
    <div className="relative w-full h-full bg-gray-900 text-white flex flex-col overflow-hidden rounded-lg">
      {/* End of Session Warning Banner */}
      <div className={cn(
        "absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md p-3 bg-yellow-500/20 backdrop-blur-md border-b border-yellow-500/30 text-center text-sm font-medium text-yellow-200 transition-transform duration-300 ease-in-out z-20",
        showEndWarning ? "translate-y-0" : "-translate-y-full"
      )}>
        <AlertTriangle className="inline-block w-4 h-4 mr-2" />
        This session will end in less than a minute.
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
          {/* Mentor's Video Feed (Placeholder) */}
          <div className="relative flex-1 flex items-center justify-center bg-black">
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

          {/* Self-view (Picture-in-Picture) */}
          <div className={cn(
            "absolute w-48 h-32 bg-gray-800 rounded-lg shadow-lg border-2 border-gray-700 flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out z-10",
            isChatOpen ? "bottom-24 left-4" : "top-4 right-4"
          )}>
            {isCameraOn ? (
              <video ref={pipVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <VideoOff className="w-8 h-8 text-gray-500" />
            )}
            <span className="absolute bottom-2 left-2 text-xs font-medium">You</span>
          </div>

          {/* Timer */}
          <div className={cn(
            "absolute top-4 left-4 bg-black/50 p-2 rounded-lg transition-colors duration-300",
            isPulsing && "animate-pulse"
          )}>
            <div className={cn("flex items-center justify-between text-sm", timerColor)}>
              <span className="font-medium">Duration</span>
              <span className="font-mono ml-4">{formatTime(timeElapsed)}</span>
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="bg-gray-900/80 backdrop-blur-sm p-4 flex justify-center items-center space-x-4 z-10">
            <Button variant="secondary" size="icon" className="rounded-full w-12 h-12 bg-gray-700 hover:bg-gray-600" onClick={() => setIsMicMuted(!isMicMuted)}>
              {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>
            <Button variant={isCameraOn ? "secondary" : "destructive"} size="icon" className="rounded-full w-12 h-12 bg-gray-700 hover:bg-gray-600" onClick={handleToggleCamera}>
              {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
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
        <div className={cn(
          "bg-gray-800/50 border-l border-gray-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
          isChatOpen ? "w-96" : "w-0"
        )}>
          <div className="w-96 h-full flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Session Chat</h3>
            </div>
            <div ref={chatContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="text-xs text-center text-gray-400">Today</div>
              {messages.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-2.5", msg.sender === 'You' && "justify-end")}>
                  {msg.sender !== 'You' && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={mentorAvatar} />
                      <AvatarFallback>{mentorName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={cn("flex items-center space-x-2 rtl:space-x-reverse", msg.sender === 'You' && "justify-end")}>
                      <span className="text-sm font-semibold text-white">{msg.sender}</span>
                      <span className="text-xs font-normal text-gray-400">{msg.time}</span>
                    </div>
                    <div className={cn(
                      "leading-1.5 p-3",
                      msg.sender === 'You' ? "bg-blue-600 rounded-s-xl rounded-ee-xl" : "bg-gray-700 rounded-e-xl rounded-es-xl"
                    )}>
                      <p className="text-sm font-normal text-white">{msg.text}</p>
                    </div>
                  </div>
                  {msg.sender === 'You' && (
                     <Avatar className="w-8 h-8">
                      <AvatarFallback>Y</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="relative">
                <Input 
                  placeholder="Type a message..."
                  className="bg-gray-700 border-gray-600"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button size="icon" className="absolute right-1.5 top-1.5 h-7 w-7" onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
