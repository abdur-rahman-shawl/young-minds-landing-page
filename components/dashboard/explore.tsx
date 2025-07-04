"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star, MapPin, Clock, Search, Filter, TrendingUp, Award, Zap } from "lucide-react"

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
  featured?: boolean
  trending?: boolean
  topRated?: boolean
  responseTime: string
  sessionsCompleted: number
  category: string
}

const categories = [
  { name: "Product Management", icon: "📱", count: 45, color: "bg-blue-500" },
  { name: "Software Engineering", icon: "💻", count: 78, color: "bg-green-500" },
  { name: "Design", icon: "🎨", count: 32, color: "bg-purple-500" },
  { name: "Marketing", icon: "📊", count: 28, color: "bg-orange-500" },
  { name: "Data Science", icon: "📈", count: 24, color: "bg-red-500" },
  { name: "Leadership", icon: "👑", count: 36, color: "bg-yellow-500" },
  { name: "Entrepreneurship", icon: "🚀", count: 19, color: "bg-pink-500" },
  { name: "Sales", icon: "💼", count: 22, color: "bg-indigo-500" }
]

const featuredMentors: Mentor[] = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "VP of Product",
    company: "Meta",
    location: "San Francisco, CA",
    rating: 4.9,
    reviews: 127,
    hourlyRate: 180,
    expertise: ["Product Strategy", "User Research", "Team Leadership"],
    availability: "Available this week",
    featured: true,
    responseTime: "Usually responds in 2 hours",
    sessionsCompleted: 245,
    category: "Product Management"
  },
  {
    id: 2,
    name: "David Rodriguez",
    title: "Staff Engineer",
    company: "Google",
    location: "Mountain View, CA",
    rating: 5.0,
    reviews: 89,
    hourlyRate: 220,
    expertise: ["System Design", "Architecture", "Career Growth"],
    availability: "Available next week",
    trending: true,
    responseTime: "Usually responds in 1 hour",
    sessionsCompleted: 156,
    category: "Software Engineering"
  },
  {
    id: 3,
    name: "Emma Thompson",
    title: "Design Director",
    company: "Airbnb",
    location: "New York, NY",
    rating: 4.8,
    reviews: 203,
    hourlyRate: 160,
    expertise: ["Design Systems", "User Experience", "Design Leadership"],
    availability: "Available this week",
    topRated: true,
    responseTime: "Usually responds in 3 hours",
    sessionsCompleted: 312,
    category: "Design"
  }
]

const trendingMentors: Mentor[] = [
  {
    id: 4,
    name: "Michael Chang",
    title: "Startup Founder",
    company: "TechCorp (Acquired by Salesforce)",
    location: "Austin, TX",
    rating: 4.9,
    reviews: 156,
    hourlyRate: 250,
    expertise: ["Entrepreneurship", "Fundraising", "Product Development"],
    availability: "Available this month",
    trending: true,
    responseTime: "Usually responds in 4 hours",
    sessionsCompleted: 89,
    category: "Entrepreneurship"
  },
  {
    id: 5,
    name: "Lisa Wang",
    title: "VP of Marketing",
    company: "Stripe",
    location: "Seattle, WA",
    rating: 4.7,
    reviews: 174,
    hourlyRate: 190,
    expertise: ["Growth Marketing", "Brand Strategy", "Content Strategy"],
    availability: "Available next week",
    responseTime: "Usually responds in 2 hours",
    sessionsCompleted: 234,
    category: "Marketing"
  },
  {
    id: 6,
    name: "Alex Kumar",
    title: "Data Science Manager",
    company: "Netflix",
    location: "Los Angeles, CA",
    rating: 4.8,
    reviews: 98,
    hourlyRate: 200,
    expertise: ["Machine Learning", "Data Strategy", "Analytics"],
    availability: "Available this week",
    responseTime: "Usually responds in 1 hour",
    sessionsCompleted: 167,
    category: "Data Science"
  }
]

function MentorCard({ mentor, size = "normal" }: { mentor: Mentor, size?: "normal" | "large" }) {
  const isLarge = size === "large"
  
  return (
    <Card className={`${isLarge ? 'p-8' : 'p-6'} bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl hover:shadow-xl transition-all duration-200 cursor-pointer group relative overflow-hidden`}>
      {/* Featured/Trending Badge */}
      {mentor.featured && (
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 gap-1">
            <Award className="w-3 h-3" />
            Featured
          </Badge>
        </div>
      )}
      {mentor.trending && (
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1">
            <TrendingUp className="w-3 h-3" />
            Trending
          </Badge>
        </div>
      )}
      {mentor.topRated && (
        <div className="absolute top-4 right-4 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1">
            <Zap className="w-3 h-3" />
            Top Rated
          </Badge>
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`${isLarge ? 'w-20 h-20' : 'w-14 h-14'} rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold ${isLarge ? 'text-2xl' : 'text-lg'}`}>
            {mentor.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
        </div>
        
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className={`font-semibold text-gray-900 dark:text-white ${isLarge ? 'text-xl' : 'text-lg'}`}>
                {mentor.name}
              </h3>
              <p className={`text-gray-600 dark:text-gray-400 ${isLarge ? 'text-base' : 'text-sm'}`}>
                {mentor.title} at {mentor.company}
              </p>
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
          
          <div className={`flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ${isLarge ? 'mb-4' : 'mb-3'}`}>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {mentor.location}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {mentor.availability}
            </div>
          </div>
          
          <div className={`flex flex-wrap gap-2 ${isLarge ? 'mb-4' : 'mb-3'}`}>
            {mentor.expertise.slice(0, isLarge ? 4 : 3).map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0"
              >
                {skill}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">{mentor.responseTime}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{mentor.sessionsCompleted} sessions</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CategoryCard({ category }: { category: typeof categories[0] }) {
  return (
    <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl hover:shadow-lg transition-all duration-200 cursor-pointer group">
      <div className="flex items-center space-x-4">
        <div className={`w-12 h-12 ${category.color} rounded-xl flex items-center justify-center text-2xl`}>
          {category.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">
            {category.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {category.count} mentors
          </p>
        </div>
      </div>
    </Card>
  )
}

export function ExploreMentors() {
  return (
    <div className="space-y-8 p-6">
      {/* Header with Search */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Explore Mentors
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover world-class mentors to accelerate your career growth
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input 
              placeholder="Search mentors, skills, or companies..." 
              className="pl-10 h-12 rounded-xl border border-gray-200 dark:border-gray-800"
            />
          </div>
          <Button variant="outline" size="lg" className="h-12 px-6 rounded-xl gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Featured Mentors */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Featured Mentors</h2>
          <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
            View all
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {featuredMentors.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Browse by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      </section>

      {/* Trending This Week */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Trending This Week</h2>
          <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
            View all
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {trendingMentors.map((mentor) => (
            <MentorCard key={mentor.id} mentor={mentor} />
          ))}
        </div>
      </section>

      {/* Top Charts */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Top Charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-4">Most Popular</h3>
            <div className="space-y-3">
              {featuredMentors.slice(0, 3).map((mentor, index) => (
                <div key={mentor.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-900 dark:text-blue-300 text-sm truncate">{mentor.name}</p>
                    <p className="text-blue-600 dark:text-blue-400 text-xs">{mentor.company}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-medium">{mentor.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-4">Highest Rated</h3>
            <div className="space-y-3">
              {[...featuredMentors].sort((a, b) => b.rating - a.rating).slice(0, 3).map((mentor, index) => (
                <div key={mentor.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-900 dark:text-green-300 text-sm truncate">{mentor.name}</p>
                    <p className="text-green-600 dark:text-green-400 text-xs">{mentor.company}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-medium">{mentor.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl">
            <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-4">New & Rising</h3>
            <div className="space-y-3">
              {trendingMentors.slice(0, 3).map((mentor, index) => (
                <div key={mentor.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-purple-900 dark:text-purple-300 text-sm truncate">{mentor.name}</p>
                    <p className="text-purple-600 dark:text-purple-400 text-xs">{mentor.company}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-3 h-3 fill-current" />
                    <span className="text-xs font-medium">{mentor.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
} 