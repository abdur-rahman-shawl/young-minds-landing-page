"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock, Search, Filter } from "lucide-react"
import { useMentors } from "@/lib/hooks/use-mentors"

interface ExploreMentorsProps {
  onMentorSelect: (mentorId: number) => void
}

export function ExploreMentors({ onMentorSelect }: ExploreMentorsProps) {
  const { mentors, loading, error } = useMentors()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")

  // Filter mentors based on search and industry
  const filteredMentors = mentors.filter(mentor => {
    const matchesSearch = 
      mentor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mentor.expertise?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesIndustry = selectedIndustry === "all" || mentor.industry === selectedIndustry

    return matchesSearch && matchesIndustry
  })

  // Get unique industries for filter
  const industries = Array.from(new Set(mentors.map(m => m.industry).filter(Boolean)))

  if (loading) {
  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Explore Mentors</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
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
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Explore Mentors</h1>
        <p className="text-gray-600">{filteredMentors.length} mentors available</p>
        </div>
        
      {/* Search and Filter */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
            placeholder="Search mentors by name, title, company, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedIndustry}
          onChange={(e) => setSelectedIndustry(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Industries</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        </div>

      {/* Mentors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={mentor.image || undefined} alt={mentor.name} />
                  <AvatarFallback>
                    {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                  </AvatarFallback>
                </Avatar>
                  <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg group-hover:text-blue-600 transition-colors truncate">
                    {mentor.name}
                  </CardTitle>
                  <CardDescription className="truncate">
                    {mentor.title} at {mentor.company}
                  </CardDescription>
                </div>
            </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {mentor.headline && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {mentor.headline}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  <span>{mentor.industry}</span>
                  <span>•</span>
                  <Clock className="h-4 w-4" />
                  <span>{mentor.experience}+ years</span>
                </div>

                {/* Skills/Expertise */}
                {mentor.expertise && (
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise.split(',').slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill.trim()}
                      </Badge>
                    ))}
                    {mentor.expertise.split(',').length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{mentor.expertise.split(',').length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Rating and Price */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 ml-1">4.9</span>
                  </div>
                  {mentor.hourlyRate && (
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        ${mentor.hourlyRate}/{mentor.currency === 'USD' ? 'hr' : 'hour'}
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => onMentorSelect(parseInt(mentor.id))}
                >
                  View Profile
                </Button>
            </div>
            </CardContent>
          </Card>
        ))}
        </div>

      {filteredMentors.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No mentors found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or browse all mentors.
            </p>
            <Button onClick={() => {setSearchTerm(""); setSelectedIndustry("all")}}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 