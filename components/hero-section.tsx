"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Send, Bot, User, Sparkles, Search, Calendar, Star, MapPin } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { GoogleGenerativeAI } from "@google/generative-ai"

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface Mentor {
  id: number
  name: string
  title: string
  company: string
  location: string
  rating: number
  hourlyRate: number
  image: string
  expertise: string[]
  experience: string
}

export function HeroSection() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState("")
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [currentAiMessage, setCurrentAiMessage] = useState("")
  const [isSearchingMentors, setIsSearchingMentors] = useState(false)
  const [showMentors, setShowMentors] = useState(false)
  const [currentMentorIndex, setCurrentMentorIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const mentorsSectionRef = useRef<HTMLDivElement>(null)
  const [mentorSectionHeight, setMentorSectionHeight] = useState<number | undefined>(undefined)

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

  const mentors: Mentor[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      title: "Senior Product Manager",
      company: "Google",
      location: "San Francisco, CA",
      rating: 4.9,
      hourlyRate: 150,
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      expertise: ["Product Strategy", "User Research", "Data Analysis"],
      experience: "8+ years"
    },
    {
      id: 2,
      name: "Michael Chen",
      title: "Engineering Manager",
      company: "Microsoft",
      location: "Seattle, WA",
      rating: 4.8,
      hourlyRate: 140,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      expertise: ["Team Leadership", "Technical Architecture", "Agile"],
      experience: "10+ years"
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      title: "Data Scientist",
      company: "Netflix",
      location: "Los Angeles, CA",
      rating: 4.9,
      hourlyRate: 160,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      expertise: ["Machine Learning", "Python", "Statistics"],
      experience: "6+ years"
    },
    {
      id: 4,
      name: "David Kim",
      title: "UX Design Lead",
      company: "Apple",
      location: "Cupertino, CA",
      rating: 4.7,
      hourlyRate: 130,
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      expertise: ["User Experience", "Design Systems", "Prototyping"],
      experience: "7+ years"
    },
    {
      id: 5,
      name: "Lisa Thompson",
      title: "Marketing Director",
      company: "Airbnb",
      location: "New York, NY",
      rating: 4.8,
      hourlyRate: 145,
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
      expertise: ["Digital Marketing", "Brand Strategy", "Growth"],
      experience: "9+ years"
    }
  ]

  const SYSTEM_PROMPT = `
You are MentorAI, an AI Mentor Finder Assistant. Your role is to help users find the most suitable professional mentors for their career or learning needs. 

- Greet the user and ask clarifying questions to understand their background, goals, and what kind of mentorship they are seeking.
- Your primary intent is to gather enough information to recommend a few renowned professionals as potential mentors, tailored to the user's needs.
- When the user types "show me mentors", respond with a message indicating you are matching them to suitable mentors, and then the UI will display the matched mentors below.
- Do not entertain or respond to any chat that is not related to mentor finding, career guidance, or professional growth. Politely redirect the conversation if the user goes off-topic.
- Be concise, friendly, and professional. Do not fabricate mentor names; the actual mentor list will be shown by the app.
- Never answer questions unrelated to mentorship or career guidance.
`;

  // Premium typewriter effect
  useEffect(() => {
    if (isFocused || inputValue || isChatExpanded) return // Don't animate when focused, typing, or chat is expanded

    const currentQuery = placeholderQueries[currentQueryIndex]
    
    const typewriterTimer = setTimeout(() => {
      if (isTyping) {
        if (charIndex < currentQuery.length) {
          setCurrentPlaceholder(currentQuery.slice(0, charIndex + 1))
          setCharIndex(charIndex + 1)
        } else {
          // Pause at end of typing
          setTimeout(() => setIsTyping(false), 800)
        }
      } else {
        if (charIndex > 0) {
          setCurrentPlaceholder(currentQuery.slice(0, charIndex - 1))
          setCharIndex(charIndex - 1)
        } else {
          // Move to next query
          setCurrentQueryIndex((prevIndex) => (prevIndex + 1) % placeholderQueries.length)
          setIsTyping(true)
        }
      }
    }, isTyping ? 25 + Math.random() * 25 : 15)

    return () => clearTimeout(typewriterTimer)
  }, [charIndex, isTyping, currentQueryIndex, isFocused, inputValue, placeholderQueries, isChatExpanded])

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current && isChatExpanded) {
      const chatContainer = chatEndRef.current.closest('.overflow-y-auto')
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight
      }
    }
  }, [messages, isAiTyping, isChatExpanded, isSearchingMentors])

  const searchMentors = async () => {
    setIsSearchingMentors(true)
    
    // Simulate mentor search time
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    setIsSearchingMentors(false)
    setShowMentors(true)
  }

  // Replace simulateAiResponse with Gemini integration
  const simulateAiResponse = async (userMessage: string) => {
    setIsAiTyping(true)
    setCurrentAiMessage("")
    try {
      const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })
      // Prepare chat history for Gemini, with system prompt
      const history = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...messages
          .filter(m => m.type === 'user' || m.type === 'ai')
          .map(m => ({ role: m.type === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: userMessage }] }
      ]
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(userMessage)
      // Debug: print the raw result and response
      console.log('Gemini raw result:', result)
      if (result && result.response) {
        console.log('Gemini response object:', result.response)
      }
      const response = await result.response
      const text = response.text()
      // Simulate typing effect for realism
      for (let i = 0; i < text.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 15))
        setCurrentAiMessage(text.slice(0, i + 1))
      }
      const aiMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      // Only show mentors if user typed exactly 'show me mentors'
      if (userMessage.trim().toLowerCase() === 'show me mentors') {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString() + '-followup',
              type: 'ai',
              content: 'Here are some mentors matched to your needs. You can review their profiles below.',
              timestamp: new Date()
            }
          ])
          setShowMentors(true)
        }, 800)
      }
    } catch (err) {
      setCurrentAiMessage("")
      console.error('Gemini error:', err)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'ai',
        content: 'Sorry, I could not get a response from Gemini right now.',
        timestamp: new Date()
      }])
    } finally {
      setIsAiTyping(false)
      setCurrentAiMessage("")
    }
  }

  const handleSubmit = async () => {
    if (inputValue.trim() && !isAiTyping && !isSearchingMentors) {
      // Expand chat if not already expanded
      if (!isChatExpanded) {
        setIsChatExpanded(true)
        await new Promise(resolve => setTimeout(resolve, 300)) // Wait for expansion animation
      }
      
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: inputValue.trim(),
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, userMessage])
      const currentInput = inputValue.trim()
      setInputValue("")
      
      // Simulate AI response
      await simulateAiResponse(currentInput)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow shift+enter for new lines
        return
      } else {
        e.preventDefault()
        handleSubmit()
      }
    }
  }

  const handleContainerClick = () => {
    if (!isAiTyping && !isSearchingMentors) {
      textareaRef.current?.focus()
    }
  }

  const handleBookMentor = (mentorId: number) => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
    if (!isLoggedIn) {
      router.push("/auth")
    } else {
      // Handle booking logic for logged-in users
      console.log("Booking mentor:", mentorId)
    }
  }

  const nextMentors = () => {
    setCurrentMentorIndex((prev) => Math.min(prev + 3, mentors.length - 3))
  }

  const prevMentors = () => {
    setCurrentMentorIndex((prev) => Math.max(prev - 3, 0))
  }

  // Auto-resize textarea
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

  const visibleMentors = mentors.slice(currentMentorIndex, currentMentorIndex + 3)
  const canGoNext = currentMentorIndex + 3 < mentors.length
  const canGoPrev = currentMentorIndex > 0

  // After mentors are shown, scroll to mentor section and send follow-up AI message
  useEffect(() => {
    if (showMentors && mentorsSectionRef.current) {
      // Set mentor section height to match hero/chatbot
      if (heroRef.current) {
        setMentorSectionHeight(heroRef.current.offsetHeight)
      }
      // Scroll to mentors section
      mentorsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showMentors])

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
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 transition-opacity duration-500 ${
                  isFocused ? 'opacity-100' : 'opacity-0'
                }`} style={{ padding: '1px' }}>
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

                      {/* AI Thinking Animation */}
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

                      {/* AI Typing Indicator */}
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
                        style={{
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                        }}
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
                        } group-hover:scale-105 ${isFocused ? 'scale-105' : ''}`}
                      >
                        <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${
                          inputValue.trim() ? 'group-hover:translate-x-0.5' : ''
                        }`} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating hint - only show when chat is not expanded */}
              {!isChatExpanded && (
                <div className={`mt-4 px-4 transition-all duration-500 ${
                  isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}>
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

      {/* Mentor Recommendations Section - full width, below hero */}
      {showMentors && (
        <section ref={mentorsSectionRef} className="w-full px-0 lg:px-0 xl:px-0 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-screen-xl mx-auto">
            <Card className="bg-white dark:bg-gray-900 rounded-2xl p-2 md:p-6 flex flex-col justify-center border shadow-sm">
              <div className="mb-6 px-4 md:px-0">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Matched Mentors</h3>
                <p className="text-gray-600 dark:text-gray-400 text-base">Found {mentors.length} mentors based on your conversation</p>
              </div>
              {/* Mentor Cards Row */}
              <div className="relative flex items-center">
                {/* Left Arrow */}
                {canGoPrev && (
                  <button
                    onClick={prevMentors}
                    className="hidden md:flex absolute left-0 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <ArrowRight className="w-6 h-6 rotate-180 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
                {/* Cards Row */}
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <div
                    className="flex gap-8 px-4 md:px-8 transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${Math.floor(currentMentorIndex / 3) * 100}%)` }}
                  >
                    {visibleMentors.map((mentor) => (
                      <div
                        key={mentor.id}
                        className="min-w-[320px] max-w-xs w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
                      >
                        {/* Large Photo on Top */}
                        <div className="relative h-56 w-full bg-gray-100 dark:bg-gray-900">
                          <img
                            src={mentor.image}
                            alt={mentor.name}
                            className="object-cover w-full h-full"
                            onError={e => { e.currentTarget.src = '/default-mentor.png'; }}
                          />
                          <div className="absolute top-3 right-3 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-12"></div>
                        </div>
                        {/* Mentor Details */}
                        <div className="flex-1 flex flex-col p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">{mentor.name}</h4>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{mentor.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 truncate">{mentor.title}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2 truncate">{mentor.company}</p>
                          <div className="flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-500 truncate">{mentor.location}</span>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-gray-500 dark:text-gray-500">Exp: <span className="font-medium text-gray-700 dark:text-gray-300">{mentor.experience}</span></span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {mentor.expertise.map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="text-base text-gray-900 dark:text-white font-bold">${mentor.hourlyRate}<span className="text-xs text-gray-500 dark:text-gray-500 font-normal">/hr</span></div>
                            <Button
                              onClick={() => handleBookMentor(mentor.id)}
                              className="h-8 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-medium text-xs"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right Arrow */}
                {canGoNext && (
                  <button
                    onClick={nextMentors}
                    className="hidden md:flex absolute right-0 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    style={{ top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <ArrowRight className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
              </div>
              {/* Dots Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: Math.ceil(mentors.length / 3) }, (_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      Math.floor(currentMentorIndex / 3) === index
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </Card>
          </div>
        </section>
      )}
    </>
  )
}
