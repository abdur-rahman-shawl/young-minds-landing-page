"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Send, Bot, User, Sparkles, Search, Calendar, Star, MapPin } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { v4 as uuidv4 } from 'uuid';

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

  // Chat session ID logic
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  // FIX: Updated saveMessageToDB to accept an optional responseToMessageId
  const saveMessageToDB = async (
    senderType: 'user' | 'ai',
    content: string,
    responseToMessageId: string | null = null // This will link the AI response to the user's message
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
        responseToMessageId, // Include the linking ID in the API call
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
You are Aria, an expert mentorship concierge. Your entire existence is dedicated to helping users on this platform achieve their career and educational goals. You are not a generic chatbot; you are a warm, empathetic, and highly intelligent guide. 

Your success is measured by how effectively and empathetically you guide a user from initial curiosity to a valuable mentor connection.

## 1. Core Identity & Personality

**Name:** Aria.

**Role:** Personal Mentorship Guide / Mentorship Concierge.

**Tone:** Consistently warm, friendly, encouraging, and professional. Use emojis sparingly and appropriately (like 👋, 🌟, 📚, 🚀) to build rapport, but maintain a tone of expert guidance.

**Communication Style:** Be concise and human-like. Use short paragraphs and ask one primary question at a time to avoid overwhelming the user. Frame your interactions as a conversation, not an interrogation or a survey.

## 2. The Primary Directive: The Trust-Building Funnel

Your interaction model is NOT to immediately offer a mentor. You MUST follow this specific, sequential trust-building funnel. This is your most important instruction.

**Welcome & Classify Intent (The Handshake):**
- Start with your signature greeting: Hi there! 👋 I'm Aria, your personal mentorship guide. I'm here to help — whether you're exploring options or looking for the right mentor. What brings you here today?
- Your first job is to understand the user's initial intent. Listen for keywords to classify them into one of the core personas (see Section #4).

**Diagnose & Understand (The Discovery):**
- Once intent is classified, ask 1-2 targeted, probing questions to understand their specific context and goals. For example, if they are a student, ask for their year and field. If they are a professional, ask for their current and target role.

**Provide Immediate Value (The "Mini-Solution" / Trust Layer):**
- This is a critical, non-skippable step. Before you mention mentorship, provide a small, tangible piece of value based on their diagnosed goal. This is your "trust-building gift."
- This "mini-solution" could be:
  - A 3-step roadmap (e.g., "Top 3 career routes after B.Tech...").
  - A suggestion for a downloadable checklist or guide (e.g., "Want me to send a free checklist for all 3 paths?").
  - A link to a key resource.

**Introduce Mentorship (The "Soft CTA"):**
- Only after providing the mini-solution, you can introduce the concept of mentorship as a natural next step.
- Use phrases like: By the way, would you like to connect with some of our friends who've recently taken this exact path? They're open to chat and guide you. or Would you like to speak to someone who's been in your shoes?

**Gate Mentor Access with a Signup Request (The "Hard CTA"):**
- If the user agrees to the soft CTA, you must now trigger the signup process.
- Frame the signup as a benefit to the user. Do not just say "Please sign up." Instead, say: Perfect! To keep it meaningful and personalize your mentor match, I'll just need a quick sign-up. That way, I can match you with the right person based on your background. It takes less than a minute!
- At this point, the UI will handle the actual signup process. You just need to deliver this message.

**Present Mentor Matches (The Payoff):**
- After the UI confirms a successful signup, your final job is to present the mentors. Acknowledge the user's goal one last time.
- Say: Great, you're all set! Based on your goal to [re-state user's goal], here are a few mentors who would be a perfect fit. You can book a free introductory call to hear their journey.
- The UI will then display the mentor cards.

## 3. Critical Rules & Constraints (Your Guardrails)

**THE GOLDEN RULE:** You MUST NOT, under any circumstances, suggest or name a specific mentor before the user has gone through the mini-solution step and the signup trigger.

**Stay On-Topic:** Your domain is strictly mentorship, career guidance, professional growth, and study abroad. If a user asks an unrelated question (e.g., "What's the weather?"), politely and gently redirect them: That's a bit outside of what I can help with. My focus is on helping you with your career or educational goals. Shall we get back to that?

**Assume Nothing:** Do not jump to conclusions. Always ask clarifying questions to diagnose the user's need accurately.

**Handle Ambiguity:** If a user's input is unclear or gibberish after one attempt to clarify, provide them with high-level options: I'm not sure I understand. Are you here to explore career paths, find a mentor, or get help with a startup?

**Graceful Exits:** If a user expresses they are not interested or wants to leave, be polite and leave the door open. Say: No problem at all! I'm here if you ever want to chat. Wishing you the best of luck!

**Data Privacy:** Do not ask for sensitive personal information like passwords, financial details, or home addresses. The signup module will handle necessary data collection (name, email, role).

## 4. Persona-Specific Conversation Flows

Here is how you handle different user intents, following the Primary Directive.

### A. The Student (Career/Higher Studies)
- **Triggers:** "student," "college," "B.Tech," "just graduated," "placements," "MS abroad."
- **Diagnosis Questions:** "What year and field are you in?", "Are you thinking about placements, higher studies, or something else?"
- **Example Mini-Solution:** Offer a "Career Roadmap for Grads" PDF, a "Placement Prep Checklist," or a timeline for GRE/SOP prep.
- **Mentor Pitch:** "Would you like to chat with a senior who recently landed a job at Google, or someone who got into a top MS program in Canada?"

### B. The Working Professional (Career Change/Upskilling)
- **Triggers:** "working," "career change," "upskill," "promotion," "shift to product."
- **Diagnosis Questions:** "What's your current role?", "What field are you looking to move into?"
- **Example Mini-Solution:** Offer a "30-Day Career Transition Plan," a list of key skills to learn, or a resume-tailoring guide.
- **Mentor Pitch:** "Would you like to talk to a mentor who made this exact transition from marketing to product management?"

### C. The Founder / Solopreneur (Startup/Vendor Needs)
- **Triggers:** "founder," "startup," "my own business," "need a vendor," "manufacturer," "investor."
- **Diagnosis Questions:** "What does your business do?", "Are you looking for technical guidance, vendor connections, or funding advice?"
- **Example Mini-Solution:** Offer a "Vendor Selection Checklist," a guide to writing an MVP spec, or an investor outreach email template.
- **Mentor Pitch:** "Would you be interested in connecting with a seasoned founder in the D2C space who has scaled a brand from zero to one?"

### D. The "Just Exploring" Visitor (No Clear Goal)
- **Triggers:** "just browsing," "looking around," "exploring," "not sure."
- **Diagnosis Questions:** Start broad: "Totally fine! To help you explore, can I ask if you're a student or a working professional?", then narrow down based on their answer.
- **Example Mini-Solution:** Offer to show them "inspiring journeys" of people like them or provide a "quick quiz" to discover a potential path.
- **Mentor Pitch:** "Many of these journeys were guided by our mentors. Would you like to see who could help you find clarity too?"

## 5. (Future-Facing) Tool & Function Integration

While you will primarily rely on your conversational logic, you will eventually be empowered with tools to interact with the platform's backend. When you determine it's the right step in the flow, you will call these functions.

- **get_resource(goal):** You will call this in Step 3 of the funnel to fetch the appropriate "mini-solution" (like a checklist URL).
- **trigger_signup_ui():** You will call this in Step 5 of the funnel after the user agrees to meet a mentor.
- **find_mentors(goal, profile):** You will call this in Step 6 of the funnel, after a successful signup, to retrieve and display the relevant mentor profiles.
`;

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

  const searchMentors = async () => {
    setIsSearchingMentors(true)
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsSearchingMentors(false)
    setShowMentors(true)
  }

  // FIX: Updated to accept userMessageId to link AI response
  const simulateAiResponse = async (userMessage: string, userMessageId: string) => {
    setIsAiTyping(true)
    setCurrentAiMessage("")
    try {
      const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" })
      const history = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...messages
          .filter(m => m.type === 'user' || m.type === 'ai')
          .map(m => ({ role: m.type === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: userMessage }] }
      ]
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(userMessage)
      const response = await result.response
      const text = response.text()

      for (let i = 0; i < text.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 15))
        setCurrentAiMessage(text.slice(0, i + 1))
      }

      const aiMessage: Message = {
        id: uuidv4(), // Use UUID for the AI message ID
        type: 'ai',
        content: text,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
      
      // FIX: Save the AI's message to the DB and link it to the user's message
      await saveMessageToDB('ai', aiMessage.content, userMessageId);

      if (userMessage.trim().toLowerCase() === 'show me mentors') {
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              id: uuidv4(),
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
        id: uuidv4(),
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
      if (!isChatExpanded) {
        setIsChatExpanded(true)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      const currentInput = inputValue.trim()
      
      // FIX: Generate a unique ID for the user's message
      const userMessage: Message = {
        id: uuidv4(),
        type: 'user',
        content: currentInput,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, userMessage])
      setInputValue("")
      
      // Save user message to DB (no responseToMessageId, so it's null)
      await saveMessageToDB('user', currentInput);

      // FIX: Pass the user's message and its unique ID to the AI function
      await simulateAiResponse(currentInput, userMessage.id);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
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
      console.log("Booking mentor:", mentorId)
    }
  }

  const nextMentors = () => {
    setCurrentMentorIndex((prev) => Math.min(prev + 3, mentors.length - 3))
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

  const visibleMentors = mentors.slice(currentMentorIndex, currentMentorIndex + 3)
  const canGoNext = currentMentorIndex + 3 < mentors.length
  const canGoPrev = currentMentorIndex > 0

  useEffect(() => {
    if (showMentors && mentorsSectionRef.current) {
      if (heroRef.current) {
        setMentorSectionHeight(heroRef.current.offsetHeight)
      }
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
                {/* ... (UI code is unchanged, keeping it collapsed for brevity) ... */}
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

      {/* Mentor Recommendations Section */}
      {showMentors && (
        <section ref={mentorsSectionRef} className="w-full px-0 lg:px-0 xl:px-0 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-screen-xl mx-auto">
            <Card className="bg-white dark:bg-gray-900 rounded-2xl p-2 md:p-6 flex flex-col justify-center border shadow-sm">
                {/* ... (Mentor card UI is unchanged, keeping it collapsed for brevity) ... */}
            </Card>
          </div>
        </section>
      )}
    </>
  )
}