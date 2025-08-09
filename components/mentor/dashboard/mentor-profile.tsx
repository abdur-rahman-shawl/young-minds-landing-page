"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Star, MapPin, Clock, Award, TrendingUp, Zap, Calendar, MessageCircle, Video, Heart, Share } from "lucide-react"

interface MentorProfileProps {
  mentorId: number
  onBack: () => void
}

interface MentorData {
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
  bio: string
  experience: Array<{
    company: string
    role: string
    duration: string
    description: string
  }>
  education: Array<{
    school: string
    degree: string
    year: string
  }>
  achievements: string[]
  languages: string[]
  timezone: string
  calendly: string
  testimonials: Array<{
    name: string
    role: string
    text: string
    rating: number
  }>
}

const mentorData: Record<number, MentorData> = {
  1: {
    id: 1,
    name: "Sarah Chen",
    title: "VP of Product",
    company: "Meta",
    location: "San Francisco, CA",
    rating: 4.9,
    reviews: 127,
    hourlyRate: 180,
    expertise: ["Product Strategy", "User Research", "Team Leadership", "Growth Hacking", "A/B Testing"],
    availability: "Available this week",
    featured: true,
    responseTime: "Usually responds in 2 hours",
    sessionsCompleted: 245,
    category: "Product Management",
    bio: "I'm a seasoned product leader with 8+ years of experience at top tech companies. I've led product teams from 0 to 1 and scaled products to millions of users. I'm passionate about helping the next generation of product managers navigate their careers and build incredible products.",
    experience: [
      { company: "Meta", role: "VP of Product", duration: "2021 - Present", description: "Leading product strategy for Instagram Stories and Reels" },
      { company: "Uber", role: "Senior Product Manager", duration: "2019 - 2021", description: "Launched Uber Eats in 15+ markets, growing to $2B+ revenue" },
      { company: "Google", role: "Product Manager", duration: "2016 - 2019", description: "Built and scaled Google Assistant's smart home features" }
    ],
    education: [
      { school: "Stanford University", degree: "MBA", year: "2016" },
      { school: "UC Berkeley", degree: "BS Computer Science", year: "2014" }
    ],
    achievements: [
      "Led product that reached 100M+ users",
      "Featured in ProductHunt's Top 10 PMs 2023",
      "Speaker at ProductCon 2022 & 2023"
    ],
    languages: ["English", "Mandarin", "Spanish"],
    timezone: "PST (GMT-8)",
    calendly: "https://calendly.com/sarah-chen",
    testimonials: [
      {
        name: "David Kim",
        role: "Senior PM at Airbnb",
        text: "Sarah's guidance was instrumental in my promotion to Senior PM. Her frameworks for prioritization and stakeholder management are game-changing.",
        rating: 5
      },
      {
        name: "Maria Rodriguez",
        role: "Product Lead at Stripe",
        text: "One of the best mentors I've worked with. Sarah's real-world experience and practical advice helped me navigate complex product decisions.",
        rating: 5
      }
    ]
  },
  2: {
    id: 2,
    name: "David Rodriguez",
    title: "Staff Engineer",
    company: "Google",
    location: "Mountain View, CA",
    rating: 5.0,
    reviews: 89,
    hourlyRate: 220,
    expertise: ["System Design", "Architecture", "Career Growth", "Distributed Systems", "Leadership"],
    availability: "Available next week",
    trending: true,
    responseTime: "Usually responds in 1 hour",
    sessionsCompleted: 156,
    category: "Software Engineering",
    bio: "Staff Engineer at Google with 10+ years building large-scale distributed systems. I've architected systems handling billions of requests and led engineering teams of 20+ engineers. I love helping engineers level up their technical and leadership skills.",
    experience: [
      { company: "Google", role: "Staff Engineer", duration: "2020 - Present", description: "Tech lead for Search infrastructure serving 8B+ queries daily" },
      { company: "Netflix", role: "Senior Engineer", duration: "2018 - 2020", description: "Built microservices architecture for streaming platform" },
      { company: "Amazon", role: "Software Engineer", duration: "2014 - 2018", description: "Developed AWS Lambda cold start optimizations" }
    ],
    education: [
      { school: "MIT", degree: "MS Computer Science", year: "2014" },
      { school: "UC San Diego", degree: "BS Computer Engineering", year: "2012" }
    ],
    achievements: [
      "Reduced system latency by 50% at Google Scale",
      "20+ patents in distributed systems",
      "Top 1% performer at Google for 3 consecutive years"
    ],
    languages: ["English", "Spanish"],
    timezone: "PST (GMT-8)",
    calendly: "https://calendly.com/david-rodriguez",
    testimonials: [
      {
        name: "Alex Chen",
        role: "Senior Engineer at Meta",
        text: "David's system design sessions were incredible. He helped me understand how to think about scale and trade-offs at the staff+ level.",
        rating: 5
      }
    ]
  },
  3: {
    id: 3,
    name: "Emma Thompson",
    title: "Design Director",
    company: "Airbnb",
    location: "New York, NY",
    rating: 4.8,
    reviews: 203,
    hourlyRate: 160,
    expertise: ["Design Systems", "User Experience", "Design Leadership", "Design Strategy", "User Research"],
    availability: "Available this week",
    topRated: true,
    responseTime: "Usually responds in 3 hours",
    sessionsCompleted: 312,
    category: "Design",
    bio: "Design Director at Airbnb with 7+ years crafting user experiences for global platforms. I've built design systems used by millions and led design teams across multiple continents. Passionate about mentoring the next generation of designers.",
    experience: [
      { company: "Airbnb", role: "Design Director", duration: "2021 - Present", description: "Leading design for host experience across 220+ countries" },
      { company: "Spotify", role: "Senior Product Designer", duration: "2019 - 2021", description: "Designed podcast discovery features for 400M+ users" },
      { company: "IDEO", role: "Product Designer", duration: "2017 - 2019", description: "Led design thinking workshops for Fortune 500 companies" }
    ],
    education: [
      { school: "RISD", degree: "MFA Industrial Design", year: "2017" },
      { school: "Carnegie Mellon", degree: "BFA Design", year: "2015" }
    ],
    achievements: [
      "Design systems adopted by 500+ designers",
      "Webby Award Winner 2022",
      "Featured in Design Museum London"
    ],
    languages: ["English", "French"],
    timezone: "EST (GMT-5)",
    calendly: "https://calendly.com/emma-thompson",
    testimonials: [
      {
        name: "Sophie Williams",
        role: "UX Designer at Netflix",
        text: "Emma taught me how to think strategically about design. Her mentorship helped me transition from junior to senior designer in just 18 months.",
        rating: 5
      }
    ]
  }
}

export function MentorProfile({ mentorId, onBack }: MentorProfileProps) {
  const mentor = mentorData[mentorId as keyof typeof mentorData]
  
  if (!mentor) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Explore
        </Button>
        <p>Mentor not found</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Heart className="w-4 h-4" />
            Save
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share className="w-4 h-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="p-8 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-3xl">
              {mentor.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white dark:border-gray-900"></div>
            
            {/* Badges */}
            {mentor.featured && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 gap-1">
                  <Award className="w-3 h-3" />
                  Featured
                </Badge>
              </div>
            )}
            {mentor.trending && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Trending
                </Badge>
              </div>
            )}
            {mentor.topRated && (
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1">
                  <Zap className="w-3 h-3" />
                  Top Rated
                </Badge>
              </div>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {mentor.name}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                  {mentor.title} at {mentor.company}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {mentor.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {mentor.timezone}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <Star className="w-5 h-5 fill-current" />
                  <span className="text-xl font-bold">{mentor.rating}</span>
                  <span className="text-gray-500 text-sm">({mentor.reviews} reviews)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">${mentor.hourlyRate}/hr</p>
                <p className="text-sm text-gray-500">{mentor.sessionsCompleted} sessions completed</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Response Time</p>
                <p className="font-semibold text-gray-900 dark:text-white">{mentor.responseTime.split(' ')[3]}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Availability</p>
                <p className="font-semibold text-gray-900 dark:text-white">{mentor.availability}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Languages</p>
                <p className="font-semibold text-gray-900 dark:text-white">{mentor.languages.join(', ')}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button size="lg" className="flex-1 bg-blue-500 hover:bg-blue-600 gap-2">
                <Calendar className="w-4 h-4" />
                Book Session
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Message
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Video className="w-4 h-4" />
                Quick Call
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Expertise */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Expertise</h2>
        <div className="flex flex-wrap gap-2">
          {mentor.expertise.map((skill) => (
            <Badge key={skill} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0 px-3 py-1">
              {skill}
            </Badge>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{mentor.bio}</p>
      </Card>

      {/* Experience */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Experience</h2>
        <div className="space-y-4">
          {mentor.experience.map((exp, index) => (
            <div key={index} className="flex gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{exp.role}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{exp.duration}</span>
                </div>
                <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">{exp.company}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{exp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Education & Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Education</h2>
          <div className="space-y-3">
            {mentor.education.map((edu, index) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900 dark:text-white">{edu.degree}</h3>
                <p className="text-gray-600 dark:text-gray-400">{edu.school} • {edu.year}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Achievements</h2>
          <div className="space-y-2">
            {mentor.achievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">{achievement}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Testimonials */}
      <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">What people say</h2>
        <div className="space-y-4">
          {mentor.testimonials.map((testimonial, index) => (
            <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current text-amber-500" />
                ))}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3 italic">"{testimonial.text}"</p>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{testimonial.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
} 