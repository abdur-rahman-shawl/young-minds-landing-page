"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Star, MapPin, Clock, Users } from "lucide-react"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Mentor {
  id: number
  name: string
  title: string
  company: string
  location: string
  rating: number
  reviews: number
  hourlyRate: number
  expertise: string[]
  availability: string
  image: string
  responseTime: string
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [inputValue, setInputValue] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'results'>('idle')
  const [mentors, setMentors] = useState<Mentor[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholderText = "Describe your perfect mentor..."

  // Sample mentor data
  const sampleMentors: Mentor[] = [
    {
      id: 1,
      name: "Sarah Johnson",
      title: "Senior Product Manager",
      company: "Meta",
      location: "San Francisco, CA",
      rating: 4.9,
      reviews: 127,
      hourlyRate: 180,
      expertise: ["Product Strategy", "User Research", "Team Leadership"],
      availability: "Available this week",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 2 hours"
    },
    {
      id: 2,
      name: "David Chen",
      title: "Engineering Director",
      company: "Google",
      location: "Mountain View, CA",
      rating: 5.0,
      reviews: 89,
      hourlyRate: 220,
      expertise: ["System Design", "Team Management", "Career Growth"],
      availability: "Available next week",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 1 hour"
    },
    {
      id: 3,
      name: "Maria Rodriguez",
      title: "UX Design Lead",
      company: "Airbnb",
      location: "New York, NY",
      rating: 4.8,
      reviews: 203,
      hourlyRate: 160,
      expertise: ["Design Systems", "User Experience", "Design Leadership"],
      availability: "Available this week",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 3 hours"
    },
    {
      id: 4,
      name: "James Wilson",
      title: "Startup Founder",
      company: "TechCorp (Acquired by Salesforce)",
      location: "Austin, TX",
      rating: 4.9,
      reviews: 156,
      hourlyRate: 250,
      expertise: ["Entrepreneurship", "Fundraising", "Product Development"],
      availability: "Available this month",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 4 hours"
    },
    {
      id: 5,
      name: "Emily Zhang",
      title: "VP of Marketing",
      company: "Stripe",
      location: "Seattle, WA",
      rating: 4.7,
      reviews: 174,
      hourlyRate: 190,
      expertise: ["Growth Marketing", "Brand Strategy", "Content Strategy"],
      availability: "Available next week",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 2 hours"
    },
    {
      id: 6,
      name: "Michael Brown",
      title: "Data Science Manager",
      company: "Netflix",
      location: "Los Angeles, CA",
      rating: 4.8,
      reviews: 98,
      hourlyRate: 200,
      expertise: ["Machine Learning", "Data Strategy", "Analytics"],
      availability: "Available this week",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 1 hour"
    },
    {
      id: 7,
      name: "Lisa Thompson",
      title: "Chief Technology Officer",
      company: "Fintech Startup",
      location: "Boston, MA",
      rating: 5.0,
      reviews: 67,
      hourlyRate: 280,
      expertise: ["Technical Leadership", "Architecture", "Scaling Teams"],
      availability: "Available this month",
      image: "/placeholder.svg?height=60&width=60",
      responseTime: "Usually responds in 6 hours"
    }
  ]

  // Handle modal visibility with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setSearchState('idle')
        setMentors([])
        setInputValue("")
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setSearchState('loading')
      
      // Simulate search delay
      setTimeout(() => {
        setMentors(sampleMentors)
        setSearchState('results')
      }, 4500)
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
    if (isOpen && textareaRef.current && searchState === 'idle') {
      setTimeout(() => {
        textareaRef.current?.focus()
        setIsFocused(true)
      }, 100)
    }
  }, [isOpen, searchState])

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/15 backdrop-blur-sm transition-opacity ${
        isOpen ? 'duration-150 ease-out opacity-100' : 'duration-200 ease-out opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`h-full flex flex-col ${
          searchState === 'idle' ? 'pt-[10vh] pb-[10vh]' : 'pt-8 pb-8'
        }`}
        onClick={handleBackdropClick}
      >
        
        {/* Search Bar - Fixed */}
        <div className={`w-full max-w-4xl mx-auto px-4 mb-6 transition-opacity ${
          isOpen ? 'duration-200 ease-out opacity-100' : 'duration-200 ease-out opacity-0'
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
                  disabled={searchState === 'loading'}
                  className="w-full bg-transparent text-gray-900 dark:text-white focus:outline-none text-xl font-medium tracking-wide leading-relaxed resize-none overflow-auto min-h-[56px] relative z-10 placeholder:text-gray-400 apple-scrollbar disabled:opacity-60"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent',
                  }}
                />
              </div>
              
              <div className="flex-shrink-0 self-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || searchState === 'loading'}
                  className={`relative h-14 w-14 rounded-2xl font-medium transition-all duration-150 ease-out ${
                    inputValue.trim() && searchState !== 'loading'
                      ? 'bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 shadow-lg hover:shadow-xl'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {searchState === 'loading' ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className={`h-5 w-5 transition-transform duration-150 ${
                      inputValue.trim() ? 'group-hover:translate-x-0.5' : ''
                    }`} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Area - Scrollable */}
        <div className="flex-1 overflow-auto w-full max-w-4xl mx-auto px-4 apple-scrollbar" onClick={(e) => e.stopPropagation()}>
          {/* Loading Skeleton */}
          {searchState === 'loading' && (
            <div className="space-y-4 animate-in fade-in-0 duration-300 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="h-14 w-14 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-28 rounded-full" />
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton className="h-4 w-16 ml-auto" />
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Mentor Results */}
          {searchState === 'results' && (
            <div className="space-y-4 pt-4 pb-16 animate-in fade-in-0 duration-500">
            {mentors.map((mentor) => (
              <Card 
                key={mentor.id}
                className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl hover:shadow-lg transition-shadow duration-150 cursor-pointer"
              >
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {mentor.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                  </div>
                  
                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{mentor.name}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{mentor.title} at {mentor.company}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-amber-500 mb-1">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-medium text-sm">{mentor.rating}</span>
                          <span className="text-gray-500 text-xs">({mentor.reviews})</span>
                        </div>
                        <p className="text-gray-900 dark:text-white font-semibold">${mentor.hourlyRate}/hr</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {mentor.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mentor.availability}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {mentor.expertise.map((skill) => (
                        <Badge 
                          key={skill} 
                          variant="secondary" 
                          className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">{mentor.responseTime}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
} 