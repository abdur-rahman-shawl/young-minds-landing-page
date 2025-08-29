"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Send, Bot, Sparkles, Search, ArrowLeftCircle, ArrowRightCircle, MapPin } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { MentorDetailView } from "@/components/mentee/mentor-detail-view"
import { useAuth } from "@/contexts/auth-context"
import { SignInPopup } from "@/components/auth/sign-in-popup"

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

// Matches the shape returned by /api/public-mentors
interface DbMentor {
  id: string
  userId: string
  title: string | null
  company: string | null
  industry: string | null
  expertise: string | null
  experience: number | null
  hourlyRate: string | null
  currency: string | null
  headline: string | null
  about: string | null
  linkedinUrl: string | null
  githubUrl?: string | null
  websiteUrl?: string | null
  verificationStatus: string | null
  isAvailable: boolean | null
  // joined user basics
  name: string | null
  email: string | null
  image: string | null
}

export function HeroSection() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [selectedMentorIdForModal, setSelectedMentorIdForModal] = useState<string | null>(null)
  const [isMentorModalOpen, setIsMentorModalOpen] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState("")
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [currentAiMessage, setCurrentAiMessage] = useState("")
  const [isSearchingMentors, setIsSearchingMentors] = useState(false)

  // REAL mentors from your DB
  const [dbMentors, setDbMentors] = useState<DbMentor[]>([])
  const [showMentors, setShowMentors] = useState(false)
  const [currentMentorIndex, setCurrentMentorIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const mentorsSectionRef = useRef<HTMLDivElement>(null)
  const [mentorSectionHeight, setMentorSectionHeight] = useState<number | undefined>(undefined)

  // Chat session ID logic
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { isAuthenticated } = useAuth()
  const [showSignInPopup, setShowSignInPopup] = useState(false)

  const handleBookIntroCall = (mentorId: string) => {
    if (isAuthenticated) {
      setSelectedMentorIdForModal(mentorId)
      setIsMentorModalOpen(true)
    } else {
      setShowSignInPopup(true)
    }
  }

  useEffect(() => {
    let sessionId = localStorage.getItem('ai_chatbot_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('ai_chatbot_session_id', sessionId);
    }
    setChatSessionId(sessionId);
    const storedUserId = localStorage.getItem('userId');
    setUserId(storedUserId || null);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'userId') {
        setUserId(event.newValue || null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Save message helper
  const saveMessageToDB = async (
    senderType: 'user' | 'ai',
    content: string,
    responseToMessageId: string | null = null
  ) => {
    if (!chatSessionId) return;
    const latestUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    await fetch('/api/ai-chatbot-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatSessionId,
        userId: latestUserId || null,
        senderType,
        content,
        responseToMessageId,
        metadata: {},
      }),
    });
  };

  const placeholderQueries = [
    "What college would I opt for Hotel Management in Australia?",
    "Which university offers the best MBA program in Canada?",
    "How do I transition from engineering to product management?",
    "What are the career prospects in artificial intelligence?",
    "Should I pursue a master's degree or start working immediately?",
    "How can I break into the tech industry without a CS degree?",
    "What skills are most valuable for remote work opportunities?",
    "Which coding bootcamp would be best for career switching?"
  ]

  // Typewriter placeholder effect
  useEffect(() => {
    if (isFocused || inputValue || isChatExpanded) return
    const currentQuery = placeholderQueries[currentQueryIndex]
    const typewriterTimer = setTimeout(() => {
      if (isTyping) {
        if (charIndex < currentQuery.length) {
          setCurrentPlaceholder(currentQuery.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        } else {
          setTimeout(() => setIsTyping(false), 800)
        }
      } else {
        if (charIndex > 0) {
          setCurrentPlaceholder(currentQuery.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        } else {
          setCurrentQueryIndex((prevIndex) => (prevIndex + 1) % placeholderQueries.length)
          setIsTyping(true)
        }
      }
    }, isTyping ? 25 + Math.random() * 25 : 15)
    return () => clearTimeout(typewriterTimer)
  }, [charIndex, isTyping, currentQueryIndex, isFocused, inputValue, placeholderQueries, isChatExpanded])

  useEffect(() => {
    if (chatEndRef.current && isChatExpanded) {
      const chatContainer = chatEndRef.current.closest('.overflow-y-auto')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }
  }, [messages, isAiTyping, isChatExpanded, isSearchingMentors])

  const simulateAiResponse = async (userMessage: string, userMessageId: string) => {
    setIsAiTyping(true)
    setCurrentAiMessage("")
    let fullResponseText = "";
    let toolCallDetected = false;

    try {
      const body = JSON.stringify({
        userMessage,
        history: messages.map(m => ({ type: m.type, content: m.content })),
      });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Chat route error: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let partialJson = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        partialJson += decoder.decode(value, { stream: true });

        // Try to parse the partial JSON to get the text part for streaming UI
        try {
          // This regex is a simple way to extract the 'text' field value
          // for real-time display, even if the JSON is incomplete.
          const textMatch = partialJson.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)/);
          if (textMatch && textMatch[1]) {
            // Unescape common characters for display
            const streamingText = textMatch[1].replace(/\\n/g, "\n").replace(/\\\"/g, '"');
            setCurrentAiMessage(streamingText);
          }

          // Check if a tool call is present in the complete JSON object
          const finalJson = JSON.parse(partialJson);
          if (finalJson.tool_call && finalJson.tool_call.name === 'find_mentors') {
            toolCallDetected = true;
          }
        } catch (e) {
          // JSON is not yet complete, continue accumulating chunks
        }
      }

      // Final processing after the stream is complete
      try {
        const finalResponse = JSON.parse(partialJson);
        fullResponseText = finalResponse.text || "";
      } catch (e) {
        console.error("Failed to parse final JSON from stream:", e);
        // Fallback to whatever text was partially streamed
        fullResponseText = currentAiMessage;
      }

      const aiMessage: Message = {
        id: uuidv4(),
        type: 'ai',
        content: fullResponseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      await saveMessageToDB('ai', aiMessage.content, userMessageId);

      // If the tool call was detected during the stream, execute it now.
      if (toolCallDetected) {
        await fetchMentorsFromApi();
      }

    } catch (err) {
      console.error("AI stream error:", err);
      setCurrentAiMessage("");
      setMessages(prev => [...prev, {
        id: uuidv4(),
        type: 'ai',
        content: 'Sorry, I could not get a response right now.',
        timestamp: new Date()
      }]);
    } finally {
      setIsAiTyping(false)
      setCurrentAiMessage("")
    }
  };

  // Fetch real mentors from your public route
  const fetchMentorsFromApi = async () => {
    try {
      setIsSearchingMentors(true)

      const params = new URLSearchParams({
        page: '1',
        pageSize: '12',
        availableOnly: 'true',
      });

      const res = await fetch(`/api/public-mentors?${params.toString()}`, { method: 'GET' })
      if (!res.ok) throw new Error(`Failed to fetch mentors: ${res.status}`)
      const json = await res.json()
      const list: DbMentor[] = json?.data ?? []
      setDbMentors(list)
      setShowMentors(true)
      setCurrentMentorIndex(0)
    } catch (e) {
      console.error('Error fetching mentors:', e)
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          type: 'ai',
          content: 'I couldn’t load mentors right now. Please try again in a moment.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsSearchingMentors(false)
    }
  }

  const handleSubmit = async () => {
    if (inputValue.trim() && !isAiTyping && !isSearchingMentors) {
      if (!isChatExpanded) {
        setIsChatExpanded(true)
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      const currentInput = inputValue.trim()

      const userMessage: Message = {
        id: uuidv4(),
        type: 'user',
        content: currentInput,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, userMessage])
      setInputValue("")

      await saveMessageToDB('user', currentInput)

      // The hardcoded check is no longer needed here.
      // The AI will decide when to call the tool.
      await simulateAiResponse(currentInput, userMessage.id)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) return
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleContainerClick = () => {
    if (!isAiTyping && !isSearchingMentors) {
      textareaRef.current?.focus()
    }
  }

  

  const nextMentors = () => {
    setCurrentMentorIndex((prev) => Math.min(prev + 3, Math.max(dbMentors.length - 3, 0)))
  }

  const prevMentors = () => {
    setCurrentMentorIndex((prev) => Math.max(prev - 3, 0))
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120
      const newHeight = Math.min(Math.max(56, scrollHeight), maxHeight)
      textarea.style.height = newHeight + 'px'
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }, [inputValue])

  const visibleMentors = dbMentors.slice(currentMentorIndex, currentMentorIndex + 3)
  const canGoNext = currentMentorIndex + 3 < dbMentors.length
  const canGoPrev = currentMentorIndex > 0

  useEffect(() => {
    if (showMentors && mentorsSectionRef.current) {
      if (heroRef.current) {
        setMentorSectionHeight(heroRef.current.offsetHeight)
      }
      mentorsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showMentors])

  // ---------- UI helpers: expertise chips, rate, placeholders ----------

  const parseExpertise = (exp: string | null) =>
    (exp ?? "")
      .split(/[,;]\s*/g)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 6)

  const formatRate = (rate: string | null, curr: string | null) => {
    if (!rate) return null
    const n = Number(rate)
    if (Number.isNaN(n)) return null
    return `${curr ?? 'USD'} ${n.toFixed(0)}/hr`
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "?"
    const parts = name.trim().split(/\s+/)
    const first = parts[0]?.[0] ?? ""
    const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
    return (first + last).toUpperCase() || "?"
  }

  // SVG placeholder as data URI – no external request needed
  const placeholderDataUrl = (name?: string | null) => {
    const initials = encodeURIComponent(getInitials(name))
    const bg = "EEE"     // light gray background
    const fg = "666"     // mid gray text
    // 600x360 fits our header aspect better
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360'>
      <rect width='100%' height='100%' fill='#${bg}'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial' font-size='120' fill='#${fg}'>${initials}</text>
    </svg>`
    return `data:image/svg+xml;utf8,${svg}`
  }

  return (
    <>
      <section ref={heroRef} className="relative px-6 sm:px-8 lg:px-12 xl:px-16 py-16 lg:py-24">
        {/* Background Shape */}
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-50 dark:bg-gray-700/20 rounded-br-[160px] -z-10"></div>

        {/* Decorative Dots */}
        <div className="absolute top-16 left-6 sm:left-8 lg:left-12 xl:left-16 w-12 h-24 opacity-30 -z-5">
          <div className="w-full h-full bg-gradient-to-b from-gray-400 to-transparent bg-[radial-gradient(circle,_#d1d5db_1.5px,_transparent_1.5px)] bg-[length:18px_18px]"></div>
        </div>

        <div className="relative flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="lg:w-3/5">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              What's on your mind?
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-12 text-lg lg:text-xl">
              Our AI intelligence will connect with your mind & download your thoughts
            </p>

            <div className="w-full max-w-4xl">
              {/* Chat Container */}
              <div 
                className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 transition-all duration-700 ease-out cursor-text ${ 
                  isFocused 
                    ? 'shadow-2xl shadow-black/10 dark:shadow-black/30 scale-[1.02] ring-1 ring-gray-300 dark:ring-gray-600' 
                    : isHovered
                      ? 'shadow-xl shadow-black/5 dark:shadow-black/20 scale-[1.01]'
                      : 'shadow-lg shadow-black/5 dark:shadow-black/10'
                } ${isChatExpanded ? 'h-[600px]' : 'h-auto'}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleContainerClick}
              >
                {/* Subtle gradient border */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 transition-opacity duration-500 ${isFocused ? 'opacity-100' : 'opacity-0'}`} style={{ padding: '1px' }}>
                  <div className="w-full h-full rounded-3xl bg-white dark:bg-gray-900"></div>
                </div>

                {/* Chat Messages */}
                {isChatExpanded && (
                  <div className="relative h-full flex flex-col">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                        <p className="text-xs text-gray-500">Always here to help</p>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {messages.map((message) => (
                        <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.type === 'ai' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="max-w-[80%]">
                            <div className={`rounded-2xl px-4 py-3 ${ 
                              message.type === 'user' 
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                            }`}>
                              <p className="text-sm leading-relaxed">{message.content}</p>
                            </div>
                            <p className="text-xs text-gray-400 mt-1 ml-1">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* AI Thinking */}
                      {isAiTyping && !currentAiMessage && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="max-w-[80%]">
                            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Thinking</span>
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Streaming text */}
                      {isAiTyping && currentAiMessage && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="max-w-[80%]">
                            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-4 py-3">
                              <p className="text-sm leading-relaxed">
                                {currentAiMessage}
                                <span className="animate-pulse">|</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mentor Search Animation */}
                      {isSearchingMentors && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                            <Search className="w-4 h-4 text-white" />
                          </div>
                          <div className="max-w-[80%]">
                            <div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Searching for suitable mentors</span>
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="border-t border-gray-100 dark:border-gray-800 p-4">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 relative">
                          <textarea
                            ref={textareaRef}
                            placeholder={isAiTyping || isSearchingMentors ? "Please wait..." : "Type your message..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onKeyDown={handleKeyPress}
                            rows={1}
                            disabled={isAiTyping || isSearchingMentors}
                            className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none text-sm font-medium tracking-wide leading-relaxed resize-none overflow-hidden min-h-[44px] rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <Button
                          onClick={handleSubmit}
                          disabled={!inputValue.trim() || isAiTyping || isSearchingMentors}
                          className={`h-11 w-11 rounded-2xl font-medium transition-all duration-300 ease-out ${ 
                            inputValue.trim() && !isAiTyping && !isSearchingMentors
                              ? 'bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Initial Input (when chat is not expanded) */}
                {!isChatExpanded && (
                  <div className="relative flex items-start px-8 py-7 gap-4">
                    <div className="flex-1 relative">
                      <textarea
                        ref={textareaRef}
                        placeholder=""
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyPress}
                        rows={1}
                        className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none text-xl font-medium tracking-wide leading-relaxed resize-none overflow-hidden min-h-[56px] scrollbar-hide relative z-10"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      />
                      
                      {/* Custom animated placeholder */}
                      {!inputValue && !isFocused && (
                        <div className="absolute inset-0 flex items-start pt-[2px]">
                          <span className="text-gray-400 text-xl font-medium tracking-wide leading-relaxed pointer-events-none">
                            {currentPlaceholder}
                            <span className="animate-pulse">|</span>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 self-end">
                      <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || isAiTyping || isSearchingMentors}
                        className={`relative h-14 w-14 rounded-2xl font-medium transition-all duration-300 ease-out ${ 
                          inputValue.trim() && !isAiTyping && !isSearchingMentors
                            ? 'bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 shadow-lg hover:shadow-xl scale-100 hover:scale-105 hover:rotate-[-2deg]'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed scale-95'
                        }`}
                      >
                        <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${inputValue.trim() ? 'group-hover:translate-x-0.5' : ''}`} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating hint - only show when chat is not expanded */}
              {!isChatExpanded && (
                <div className={`mt-4 px-4 transition-all duration-500 ${isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium tracking-widest uppercase">
                      AI Intelligence
                    </span>
                    <span className="text-gray-400 font-medium">
                      Press Enter to chat • Shift + Enter for new line
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hero image stays next to chat only */}
          <div className="lg:w-2/5 flex justify-center lg:justify-end">
            <div className="relative w-80 h-80 lg:w-96 lg:h-96">
              <Image
                src="https://img.freepik.com/free-photo/smiley-man-working-laptop-from-home_23-2148306647.jpg"
                alt="Person working on a laptop"
                fill
                className="object-cover rounded-t-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mentor Recommendations Section (REAL data) */}
      {showMentors && (
        <section ref={mentorsSectionRef} className="w-full px-0 lg:px-0 xl:px-0 py-8 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-screen-xl mx-auto">
            <Card className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-6 border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mentors</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={prevMentors}
                    disabled={!canGoPrev}
                    className={`rounded-full p-2 ${!canGoPrev ? 'opacity-30 cursor-not-allowed' : ''}`}
                    aria-label="Previous mentors"
                  >
                    <ArrowLeftCircle className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={nextMentors}
                    disabled={!canGoNext}
                    className={`rounded-full p-2 ${!canGoNext ? 'opacity-30 cursor-not-allowed' : ''}`}
                    aria-label="Next mentors"
                  >
                    <ArrowRightCircle className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              {dbMentors.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  No mentors found right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {visibleMentors.map((m) => {
                    const chips = parseExpertise(m.expertise)
                    const rate = formatRate(m.hourlyRate, m.currency)
                    const imgSrc = m.image || placeholderDataUrl(m.name)

                    return (
                      <div key={m.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden flex flex-col cursor-pointer" onClick={() => handleBookIntroCall(m.id)}>
                        {/* Header image area (taller card) */}
                        <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgSrc}
                            alt={m.name ?? 'Mentor'}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Content */}
                        <div className="p-4 flex flex-col gap-3 flex-1">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white truncate">
                              {m.name ?? 'Unnamed Mentor'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {(m.title || 'Mentor')}{m.company ? ` • ${m.company}` : ''}
                            </div>
                          </div>

                          {m.headline && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                              {m.headline}
                            </div>
                          )}

                          {(chips.length > 0) && (
                            <div className="flex flex-wrap gap-2">
                              {chips.slice(0, 4).map((c, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2">
                              <div className="text-xs text-gray-500">Experience</div>
                              <div className="font-medium">{(m.experience ?? 0)} yrs</div>
                            </div>
                            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-2">
                              <div className="text-xs text-gray-500">Rate</div>
                              <div className="font-medium">{rate ?? '—'}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-gray-500">
                              <MapPin className="h-3.5 w-3.5" />
                              {/* If you later add city/country, put them here.
                                  For now we hint the industry as a proxy. */}
                              <span className="truncate">{m.industry ?? '—'}</span>
                            </div>

                            <div className="flex items-center gap-3">
                              {m.linkedinUrl ? (
                                <a
                                  href={m.linkedinUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline text-gray-600 dark:text-gray-300"
                                >
                                  LinkedIn
                                </a>
                              ) : null}
                              {m.websiteUrl ? (
                                <a
                                  href={m.websiteUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="underline text-gray-600 dark:text-gray-300"
                                >
                                  Website
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            onClick={(e) => { e.stopPropagation(); handleBookIntroCall(m.id); }}
                            className="mt-1 w-full rounded-xl"
                          >
                            Book Intro Call
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </section>
      )}

      <Dialog open={isMentorModalOpen} onOpenChange={setIsMentorModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto overflow-x-hidden flex flex-col items-center justify-center">
          <DialogHeader className="pl-8 pr-12 pt-20 pb-0 w-full">
            <DialogTitle>Mentor Profile</DialogTitle>
            <DialogDescription>
              View mentor details and book a session.
            </DialogDescription>
          </DialogHeader>
          {selectedMentorIdForModal && (
            <div className="pl-8 pr-12 pt-0 w-full mx-auto">
              <MentorDetailView
                mentorId={selectedMentorIdForModal}
                onBack={() => {
                  setIsMentorModalOpen(false)
                  setSelectedMentorIdForModal(null)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SignInPopup 
        isOpen={showSignInPopup} 
        onClose={() => setShowSignInPopup(false)} 
        callbackUrl="/?section=explore"
      />
    </>
  )
}