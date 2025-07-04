"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholderText = "Describe your perfect mentor..."

  // Handle modal visibility with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log("Searching for:", inputValue)
      onClose()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return
      } else if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        handleSubmit()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 200
      const newHeight = Math.min(Math.max(56, scrollHeight), maxHeight)
      
      textarea.style.height = newHeight + 'px'
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden'
    }
  }, [inputValue])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
        setIsFocused(true)
      }, 100)
    }
  }, [isOpen])

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/15 backdrop-blur-sm transition-all ${
        isOpen ? 'duration-150 ease-out opacity-100' : 'duration-200 ease-out opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`relative w-full max-w-4xl transition-all ${
        isOpen ? 'duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 translate-y-0 scale-100' : 'duration-200 ease-out opacity-0 translate-y-4 scale-95'
      }`}>
        <div 
          className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 transition-all duration-150 ease-out ${
            isFocused 
              ? 'shadow-xl shadow-black/8 dark:shadow-black/20 ring-1 ring-gray-300 dark:ring-gray-600' 
              : 'shadow-lg shadow-black/4 dark:shadow-black/10'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 transition-opacity duration-150 ${
            isFocused ? 'opacity-100' : 'opacity-0'
          }`} style={{ padding: '1px' }}>
            <div className="w-full h-full rounded-3xl bg-white dark:bg-gray-900"></div>
          </div>

          <div className="relative flex items-start px-8 py-7 gap-4">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder={placeholderText}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyPress}
                rows={1}
                className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none text-xl font-medium tracking-wide leading-relaxed resize-none overflow-hidden min-h-[56px] scrollbar-hide relative z-10 placeholder:text-gray-400"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              />
            </div>
            
            <div className="flex-shrink-0 self-end">
              <Button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className={`relative h-14 w-14 rounded-2xl font-medium transition-all duration-150 ease-out ${
                  inputValue.trim()
                    ? 'bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                }`}
              >
                <ArrowRight className={`h-5 w-5 transition-transform duration-150 ${
                  inputValue.trim() ? 'group-hover:translate-x-0.5' : ''
                }`} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 