"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MapPin, Briefcase, ChevronRight, SlidersHorizontal } from "lucide-react"
import { useMentors } from "@/lib/hooks/use-mentors"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ExploreMentorsProps {
  onMentorSelect: (mentorId: string) => void
}

export function ExploreMentors({ onMentorSelect }: ExploreMentorsProps) {
  const { mentors, loading, error } = useMentors()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [priceRange, setPriceRange] = useState("all")

  // Filter mentors based on search, industry, and price
  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = 
      mentor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.expertise?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesIndustry = selectedIndustry === "all" || mentor.industry === selectedIndustry
    
    let matchesPrice = true
    if (priceRange !== "all" && mentor.hourlyRate) {
      const rate = mentor.hourlyRate
      switch(priceRange) {
        case "0-50": matchesPrice = rate <= 50; break;
        case "50-100": matchesPrice = rate > 50 && rate <= 100; break;
        case "100-200": matchesPrice = rate > 100 && rate <= 200; break;
        case "200+": matchesPrice = rate > 200; break;
      }
    }

    return matchesSearch && matchesIndustry && matchesPrice
  }).sort((a, b) => {
    switch(sortBy) {
      case "price-low": return (a.hourlyRate || 0) - (b.hourlyRate || 0)
      case "price-high": return (b.hourlyRate || 0) - (a.hourlyRate || 0)
      case "experience": return (b.experience || 0) - (a.experience || 0)
      default: return 0 // featured
    }
  })

  // Get unique industries for filter
  const industries = Array.from(new Set(mentors.map(m => m.industry).filter(Boolean)))
  
  // Calculate stats
  const totalMentors = filteredMentors.length
  const avgRate = filteredMentors.reduce((acc, m) => acc + (m.hourlyRate || 0), 0) / (totalMentors || 1)
  const totalExperience = filteredMentors.reduce((acc, m) => acc + (m.experience || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="h-12 bg-white rounded-lg animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-lg p-6 space-y-4 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
  return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Explore Mentors</h1>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">Error loading mentors: {error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Clean Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-gray-900">
              Find Your Mentor
            </h1>
            <p className="text-gray-600">
              Connect with experienced professionals to accelerate your career growth
            </p>
          </div>
        
          {/* Professional Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search mentors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 border-gray-200 focus:border-gray-400 focus:ring-0"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger className="w-[160px] h-10 border-gray-200 focus:ring-0">
                    <SelectValue placeholder="Industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={priceRange} onValueChange={setPriceRange}>
                  <SelectTrigger className="w-[140px] h-10 border-gray-200 focus:ring-0">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Price</SelectItem>
                    <SelectItem value="0-50">Under $50</SelectItem>
                    <SelectItem value="50-100">$50 - $100</SelectItem>
                    <SelectItem value="100-200">$100 - $200</SelectItem>
                    <SelectItem value="200+">$200+</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-10 border-gray-200 focus:ring-0">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Recommended</SelectItem>
                    <SelectItem value="price-low">Price: Low</SelectItem>
                    <SelectItem value="price-high">Price: High</SelectItem>
                    <SelectItem value="experience">Experience</SelectItem>
                  </SelectContent>
                </Select>
                
                {(searchTerm || selectedIndustry !== "all" || priceRange !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedIndustry("all")
                      setPriceRange("all")
                      setSortBy("featured")
                    }}
                    className="h-10 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Results count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'} available
            </p>
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              More filters
            </Button>
          </div>

          {/* Professional Mentors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => {
              const isAvailable = Math.random() > 0.3
              
              return (
                <div
                  key={mentor.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onMentorSelect(mentor.id)}
                >
                  <div className="space-y-4">
                    {/* Header with Avatar */}
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mentor.image || undefined} alt={mentor.name} />
                        <AvatarFallback className="bg-gray-100 text-gray-600">
                          {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 line-clamp-1">
                          {mentor.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {mentor.title}
                        </p>
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {mentor.company}
                        </p>
                      </div>
                      {mentor.hourlyRate && (
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ${mentor.hourlyRate}
                          </p>
                          <p className="text-xs text-gray-500">per hour</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Bio */}
                    {mentor.headline && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {mentor.headline}
                      </p>
                    )}
                    
                    {/* Meta Information */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        <span>{mentor.experience}+ years</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{mentor.industry}</span>
                      </div>
                    </div>
                    
                    {/* Skills */}
                    {mentor.expertise && (
                      <div className="flex flex-wrap gap-2">
                        {mentor.expertise.split(',').slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                        {mentor.expertise.split(',').length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{mentor.expertise.split(',').length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <Button
                      variant="outline"
                      className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 group"
                      onClick={(e) => {
                        e.stopPropagation()
                        onMentorSelect(mentor.id)
                      }}
                    >
                      View Profile
                      <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Professional Empty State */}
          {filteredMentors.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No mentors found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedIndustry("all");
                  setPriceRange("all");
                  setSortBy("featured");
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 