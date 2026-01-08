"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Search,
  MapPin,
  Briefcase,
  ArrowRight,
  Star,
  Zap,
  Filter,
  CheckCircle2
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
      switch (priceRange) {
        case "0-50": matchesPrice = rate <= 50; break;
        case "50-100": matchesPrice = rate > 50 && rate <= 100; break;
        case "100-200": matchesPrice = rate > 100 && rate <= 200; break;
        case "200+": matchesPrice = rate > 200; break;
      }
    }
    return matchesSearch && matchesIndustry && matchesPrice
  }).sort((a, b) => {
    switch (sortBy) {
      case "price-low": return (a.hourlyRate || 0) - (b.hourlyRate || 0)
      case "price-high": return (b.hourlyRate || 0) - (a.hourlyRate || 0)
      case "experience": return (b.experience || 0) - (a.experience || 0)
      default: return 0
    }
  })

  const industries = Array.from(new Set(mentors.map(m => m.industry).filter(Boolean)))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-transparent pb-20">

      {/* 1. HERO SECTION */}
      <div className="relative bg-[#0F1115] rounded-3xl overflow-hidden mb-8 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] -ml-20 -mb-20"></div>

        <div className="relative z-10 px-8 py-16 md:py-20 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-6 text-slate-300 border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold">
              <Zap className="w-3 h-3 mr-2 text-yellow-400 fill-yellow-400" />
              Expert Mentorship
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Unlock your potential with <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">world-class mentors</span>
            </h1>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mt-10 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <Input
                placeholder="Search by role, company, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 h-14 bg-white/10 backdrop-blur-md border-white/10 rounded-full text-lg shadow-xl text-white placeholder:text-slate-400 focus:bg-white/15 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. FILTERS BAR */}
      <div className="sticky top-20 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-y border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:mx-0 sm:px-0 mb-8">
        <div className="max-w-7xl mx-auto py-3">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide no-scrollbar">
              <div className="flex items-center text-xs font-bold uppercase text-slate-400 mr-2 tracking-wide">
                <Filter className="w-3 h-3 mr-2" />
                Filters
              </div>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-[150px] h-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full text-xs shadow-sm">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="w-[130px] h-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-full text-xs shadow-sm">
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
                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSelectedIndustry("all"); setPriceRange("all"); }} className="text-xs text-red-500 hover:bg-red-50 h-8 rounded-full px-3">
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
                <span className="text-slate-900 dark:text-white font-bold">{filteredMentors.length}</span> mentors found
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-medium justify-end px-2">
                  <span className="text-slate-400 mr-2">Sort:</span> <SelectValue />
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
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredMentors.map((mentor) => {
            const rating = (4 + Math.random()).toFixed(1);
            const reviews = Math.floor(Math.random() * 50);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={mentor.id}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                onClick={() => onMentorSelect(mentor.id)}
              >
                {/* Card Banner */}
                <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px]"></div>
                </div>

                <div className="px-6 flex-1 flex flex-col relative">
                  {/* Floating Avatar */}
                  <div className="absolute -top-10 left-6">
                    <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-900 shadow-md">
                      <AvatarImage src={mentor.image || undefined} className="object-cover" />
                      <AvatarFallback className="bg-slate-800 text-white font-bold text-xl">
                        {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Verified Check */}
                    <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                    </div>
                  </div>

                  {/* Rate Badge */}
                  <div className="self-end mt-3">
                    {mentor.hourlyRate ? (
                      <Badge variant="secondary" className="bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold border-slate-200 dark:border-slate-700">
                        ${mentor.hourlyRate}<span className="text-slate-400 font-normal ml-0.5">/hr</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Free</Badge>
                    )}
                  </div>

                  <div className="mt-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {mentor.name}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-900/30">
                        <Star className="w-3 h-3 fill-amber-500" /> {rating}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {mentor.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      at {mentor.company || 'Confidential'}
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    {mentor.expertise && (
                      <div className="flex flex-wrap gap-1.5">
                        {mentor.expertise.split(',').slice(0, 3).map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal hover:bg-slate-200">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{mentor.experience}+ Yrs Exp.</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{mentor.industry}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Hover Slide-up Button */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300 border-t border-slate-100 dark:border-slate-800">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                    View Profile <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredMentors.length === 0 && !loading && (
        <div className="text-center py-20">
          <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No mentors found</h3>
          <p className="text-slate-500 mb-6">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  )
}