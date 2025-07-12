"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Image from "next/image"

export function HeroSection() {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState("")
  const [currentQueryIndex, setCurrentQueryIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Premium typewriter effect
  useEffect(() => {
    if (isFocused || inputValue) return // Don't animate when focused or typing

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
    }, isTyping ? 25 + Math.random() * 25 : 15) // Faster typing speed for more dynamic feel

    return () => clearTimeout(typewriterTimer)
  }, [charIndex, isTyping, currentQueryIndex, isFocused, inputValue, placeholderQueries])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log("Starting conversation:", inputValue)
      // Handle conversation start logic here
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow shift+enter for new lines
        return
      } else if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        handleSubmit()
      }
    }
  }

  const handleContainerClick = () => {
    textareaRef.current?.focus()
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200 // Thoughtful limit - about 4-5 lines
      const newHeight = Math.min(Math.max(56, scrollHeight), maxHeight)
      
      textarea.style.height = newHeight + 'px'
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }, [inputValue])

  return (
    <section className="relative px-6 sm:px-8 lg:px-12 xl:px-16 py-16 lg:py-24">
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
            Our human intelligence will connect with your mind & download your thoughts
          </p>

          <div className="w-full max-w-7xl">
            <div 
              className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 transition-all duration-500 ease-out cursor-text ${
                isFocused 
                  ? 'shadow-2xl shadow-black/10 dark:shadow-black/30 scale-[1.02] ring-1 ring-gray-300 dark:ring-gray-600' 
                  : isHovered
                    ? 'shadow-xl shadow-black/5 dark:shadow-black/20 scale-[1.01]'
                    : 'shadow-lg shadow-black/5 dark:shadow-black/10'
              }`}
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
                    disabled={!inputValue.trim()}
                    className={`relative h-14 w-14 rounded-2xl font-medium transition-all duration-300 ease-out ${
                      inputValue.trim()
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
            </div>

            {/* Floating hint - moved outside to prevent overlap */}
            <div className={`mt-4 px-4 transition-all duration-500 ${
              isFocused ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-medium tracking-widest uppercase">
                  AI Intelligence
                </span>
                <span className="text-gray-400 font-medium">
                  ⌘ + Enter to search • Shift + Enter for new line
                </span>
              </div>
            </div>
          </div>
        </div>

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
  )
}
