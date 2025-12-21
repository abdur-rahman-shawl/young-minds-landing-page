"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  MapPin, 
  Briefcase, 
  ArrowRight, 
  SlidersHorizontal, 
  Star, 
  Zap, 
  Clock,
  Filter
} from "lucide-react"
import { useMentors } from "@/lib/hooks/use-mentors"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ExploreMentorsProps {
  onMentorSelect: (mentorId: string) => void
}

export function ExploreMentors({ onMentorSelect }: ExploreMentorsProps) {
  const { mentors, loading, error } = useMentors()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndustry, setSelectedIndustry] = useState("all")
  const [sortBy, setSortBy] = useState("featured")
  const [priceRange, setPriceRange] = useState("all")

  // Filter mentors logic
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
      default: return 0 
    }
  })

  // Get unique industries
  const industries = Array.from(new Set(mentors.map(m => m.industry).filter(Boolean)))
  
  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="h-64 bg-gray-900 w-full animate-pulse mb-8" />
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-24 bg-gray-200" />
                <CardContent className="pt-0 relative">
                   <Skeleton className="h-16 w-16 rounded-full absolute -top-8 left-6 border-4 border-white" />
                   <div className="mt-10 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
         <div className="bg-red-50 p-4 rounded-full text-red-500">
             <SlidersHorizontal className="w-8 h-8" />
         </div>
         <p className="text-lg font-medium">Unable to load mentors</p>
         <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* 1. HERO SEARCH SECTION */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-neutral-900 to-black pt-16 pb-24 overflow-hidden">
         {/* Noise Texture */}
         <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
         
         <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <Badge variant="outline" className="mb-4 text-gray-400 border-gray-700 bg-white/5 backdrop-blur-sm px-4 py-1.5 uppercase tracking-wider text-xs">
              <Zap className="w-3 h-3 mr-2 text-yellow-500" />
              Accelerate your career
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Master your craft with <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">world-class mentors</span>
            </h1>
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
              Find and book 1:1 sessions with industry experts from top companies.
            </p>

            {/* Floating Search Bar */}
            <div className="relative max-w-2xl mx-auto">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input 
                  placeholder="Search by name, company, or skill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 h-14 bg-white/95 backdrop-blur-xl border-0 ring-4 ring-white/10 rounded-full text-lg shadow-2xl focus-visible:ring-blue-500/50 text-gray-900 placeholder:text-gray-500"
                />
            </div>
         </div>
      </div>

      {/* 2. FILTERS BAR (Sticky) */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
             <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Filters Group */}
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide pb-2 md:pb-0">
                    <div className="flex items-center text-sm font-medium text-gray-500 mr-2">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters:
                    </div>

                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                        <SelectTrigger className="w-[160px] h-9 bg-white border-gray-200 hover:border-gray-300 rounded-full text-xs">
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
                        <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 hover:border-gray-300 rounded-full text-xs">
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
                            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full h-9"
                        >
                            Reset
                        </Button>
                    )}
                </div>

                {/* Sort & Count */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-2 md:pt-0">
                    <p className="text-sm text-gray-500 whitespace-nowrap">
                        <strong className="text-gray-900">{filteredMentors.length}</strong> mentors found
                    </p>
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[160px] h-9 border-0 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium">
                            <span className="text-gray-500 mr-2">Sort by:</span>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="featured">Recommended</SelectItem>
                            <SelectItem value="price-low">Price: Low to High</SelectItem>
                            <SelectItem value="price-high">Price: High to Low</SelectItem>
                            <SelectItem value="experience">Experience</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

             </div>
        </div>
      </div>

      {/* 3. MENTOR GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map((mentor) => {
               // Mock data for visual appeal (since DB might not have it yet)
               const rating = (4 + Math.random()).toFixed(1);
               const reviews = Math.floor(Math.random() * 50);

              return (
                <div
                  key={mentor.id}
                  className="group relative bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full"
                  onClick={() => onMentorSelect(mentor.id)}
                >
                  {/* Card Header Gradient */}
                  <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-100 relative">
                     {mentor.hourlyRate && (
                         <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm text-xs font-bold text-gray-900 border border-gray-100">
                             ${mentor.hourlyRate}/hr
                         </div>
                     )}
                  </div>
                  
                  <div className="px-6 flex-1 flex flex-col">
                    {/* Avatar pulling up */}
                    <div className="relative -mt-10 mb-4 flex justify-between items-end">
                        <Avatar className="h-20 w-20 border-4 border-white shadow-md bg-white">
                            <AvatarImage src={mentor.image || undefined} alt={mentor.name} className="object-cover" />
                            <AvatarFallback className="bg-gray-900 text-white font-bold text-xl">
                            {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                            </AvatarFallback>
                        </Avatar>
                        
                        {/* Rating Badge */}
                        <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md text-xs font-semibold mb-1">
                            <Star className="w-3 h-3 fill-yellow-700" />
                            <span>{rating}</span>
                            <span className="text-yellow-600/60 font-normal">({reviews})</span>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="mb-4">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {mentor.name}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium line-clamp-1">
                          {mentor.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          at {mentor.company || 'Confidential'}
                        </p>
                    </div>

                    {/* Tags */}
                    {mentor.expertise && (
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {mentor.expertise.split(',').slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2.5 py-1 text-[10px] uppercase tracking-wide font-medium bg-gray-50 text-gray-600 border border-gray-100 rounded-md"
                          >
                            {skill.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-auto pt-4 pb-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                         <div className="flex items-center gap-2 text-xs text-gray-500">
                             <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                             <span>{mentor.experience}+ Yrs Exp.</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-gray-500">
                             <MapPin className="w-3.5 h-3.5 text-gray-400" />
                             <span className="truncate max-w-[100px]">{mentor.industry}</span>
                         </div>
                    </div>

                  </div>
                  
                  {/* Hover Action */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center">
                      <Button className="w-full bg-gray-900 text-white shadow-lg hover:bg-gray-800">
                          View Profile <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                  </div>

                </div>
              )
            })}
          </div>
          
          {/* Empty State */}
          {filteredMentors.length === 0 && !loading && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
              <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No mentors found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                We couldn't find any mentors matching your criteria. Try adjusting your filters or search terms.
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedIndustry("all");
                  setPriceRange("all");
                  setSortBy("featured");
                }}
                variant="outline"
              >
                Clear all filters
              </Button>
            </div>
          )}
      </div>
    </div>
  )
}