"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Briefcase,
  Linkedin,
  Github,
  Globe,
  Share2,
  MessageSquare,
  Sparkles,
  Award,
  CheckCircle,
  MoreHorizontal,
  Star,
  Quote,
  Medal,
  Calendar,
  Trophy,
  Zap,
  ExternalLink,
  Mail
} from "lucide-react"
import { useMentorDetail } from "@/hooks/use-mentor-detail"
import { BookingModal } from "@/components/booking/booking-modal"
import { MessageRequestModal } from "@/components/messaging/message-request-modal"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface MentorDetailViewProps {
  mentorId: string | null
  onBack: () => void
}

type TabType = "overview" | "reviews" | "achievements" | "mentoring_style"

export function MentorDetailView({ mentorId, onBack }: MentorDetailViewProps) {
  const { mentor, loading, error } = useMentorDetail(mentorId)
  const { session } = useAuth()
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const isMessageMentorEnabled = false;

  const handleBookSession = () => {
    if (!session) {
      toast.error("Please log in to book a session")
      return
    }
    setIsBookingModalOpen(true)
  }

  const handleSendMessage = () => {
    if (!session) {
      toast.error("Please log in to send a message")
      return
    }
    setIsMessageModalOpen(true)
  }

  const handleMessageSuccess = () => {
    toast.success("Message request sent successfully! The mentor will be notified.")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-64 bg-gray-900 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 mt-8">
            <div className="space-y-4">
              <Skeleton className="w-64 h-8" />
              <Skeleton className="w-full h-64 rounded-xl" />
            </div>
        </div>
      </div>
    )
  }

  if (error || !mentor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <p className="text-xl font-medium text-gray-900 mb-4">{error || "Mentor not found"}</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    )
  }

  const initials = mentor.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'M';

  // --- SUB-COMPONENT RENDERS ---

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* About Section */}
      <section>
        {mentor.headline && (
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4 leading-relaxed">
            "{mentor.headline}"
          </h3>
        )}
        <div className="prose prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-7">
          <p className="whitespace-pre-wrap">{mentor.about || "This mentor hasn't added a bio yet."}</p>
        </div>
      </section>

      {/* Background / Insights Card */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <h3 className="font-semibold text-gray-900 dark:text-white">Background</h3>
        </div>
        <CardContent className="p-0">
          {/* Expertise Row */}
          <div className="flex flex-col sm:flex-row sm:items-start p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
              <span className="text-sm font-medium text-gray-500">Expertise</span>
            </div>
            <div className="w-full sm:w-2/3 flex flex-wrap gap-2">
              {mentor.expertiseArray && mentor.expertiseArray.length > 0 ? (
                mentor.expertiseArray.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 font-normal px-3 py-1">
                    {skill}
                  </Badge>
                ))
              ) : (
                <span className="text-gray-400 text-sm">Not specified</span>
              )}
            </div>
          </div>

          {/* Industry Row */}
          <div className="flex flex-col sm:flex-row sm:items-center p-6 border-b border-gray-100 dark:border-gray-800">
            <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
              <span className="text-sm font-medium text-gray-500">Industry</span>
            </div>
            <div className="w-full sm:w-2/3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-200 font-medium">{mentor.industry || 'Tech'}</span>
              </div>
            </div>
          </div>

          {/* Location Row */}
          <div className="flex flex-col sm:flex-row sm:items-center p-6">
            <div className="w-full sm:w-1/3 mb-2 sm:mb-0">
              <span className="text-sm font-medium text-gray-500">Location</span>
            </div>
            <div className="w-full sm:w-2/3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-gray-200 font-medium">{[mentor.city, mentor.country].filter(Boolean).join(', ') || 'Remote'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Experience Section */}
      <section>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          Experience <Badge className="bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center p-0 text-xs">1</Badge>
        </h3>

        <Card className="border-0 shadow-none bg-transparent">
          {/* Current Role Item */}
          <div className="flex gap-4 mb-6">
            <div className="mt-1">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                <Briefcase className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">{mentor.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.company}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 rounded-md bg-gray-200 text-gray-700">CURRENT</Badge>
                <span className="text-xs text-gray-500">Present</span>
              </div>
            </div>
          </div>

          {/* Total Experience Summary */}
          <div className="flex gap-4">
            <div className="mt-1">
              <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">Total Experience</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.experience}+ years in the industry</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )

  const renderAchievements = () => {
    // Mock Data for Achievements
    const milestones = [
      { id: 1, title: "1000 Mentorship Minutes", date: "22 Sep, 2025", icon: "🔥", color: "bg-orange-100 text-orange-600" },
      { id: 2, title: "500 Mentorship Minutes", date: "29 May, 2025", icon: "💎", color: "bg-blue-100 text-blue-600" },
      { id: 3, title: "100 Mentorship Minutes", date: "18 Jul, 2024", icon: "🚀", color: "bg-pink-100 text-pink-600" },
      { id: 4, title: "25 Mentorship Sessions", date: "03 Oct, 2025", icon: "🎖️", color: "bg-rose-100 text-rose-600" },
      { id: 5, title: "10 Mentorship Sessions", date: "26 Apr, 2025", icon: "🔟", color: "bg-indigo-100 text-indigo-600" },
    ]

    const recognitions = [
      { id: 1, label: "Top 100 Mentor", date: "Mar 2025", icon: Trophy },
      { id: 2, label: "Top 100 Mentor", date: "Jun 2025", icon: Trophy },
      { id: 3, label: "Top 100 Mentor", date: "Sep 2025", icon: Trophy },
    ]

    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Milestones Column */}
          <div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Session Milestones</h3>
             <div className="space-y-6">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-4 group">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm", milestone.color)}>
                      {milestone.icon}
                    </div>
                    <div className="flex-1 border-b border-gray-100 dark:border-gray-800 pb-6 group-last:border-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{milestone.title}</h4>
                        <span className="text-xs text-gray-400 font-medium">{milestone.date}</span>
                      </div>
                      <button className="flex items-center text-xs text-gray-500 mt-1 hover:text-blue-600 transition-colors">
                        See credentials <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Recognition Column */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Community Recognition</h3>
            <div className="grid grid-cols-2 gap-4">
              {recognitions.map((rec) => (
                <Card key={rec.id} className="text-center hover:shadow-md transition-all border-gray-100 dark:border-gray-800">
                  <CardContent className="pt-6 pb-4 flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-3 ring-4 ring-orange-50/50">
                      <rec.icon className="w-8 h-8 text-amber-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{rec.label}</h4>
                    <Badge variant="secondary" className="mt-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100">
                      {rec.date}
                    </Badge>
                    <button className="flex items-center text-xs text-gray-400 mt-3 hover:text-amber-600 transition-colors">
                        See credentials <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderReviews = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-bold text-gray-900 dark:text-white">What mentees say</h3>
         <Badge variant="outline">0 Reviews</Badge>
      </div>
      
      <Card className="bg-gray-50 dark:bg-gray-900 border-dashed border-2 border-gray-200 dark:border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
            <Star className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reviews yet</h4>
          <p className="text-gray-500 max-w-sm mb-6">
            This mentor hasn't received any reviews yet. Be the first to book a session and share your experience!
          </p>
          <Button onClick={handleBookSession} variant="outline">
            Book a Session
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderMentoringStyle = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mentoring Style</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" /> Superpowers
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {["Active Listener", "Career Strategist", "Technical Deep-dives", "Empathetic"].map((tag) => (
                        <Badge key={tag} variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" /> Communication Style
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-sm text-gray-600 leading-relaxed">
                    "I prefer a direct yet supportive approach. I like to ask questions that help you find the answer yourself, rather than just giving you the solution."
                 </p>
            </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-gray-950 pb-20 font-sans">
      
      {/* 1. HERO SECTION (Apple Style Dark Gradient) */}
      <div className="relative bg-gradient-to-br from-zinc-900 via-neutral-900 to-black pt-6 pb-12 overflow-hidden">
        {/* Subtle texture/noise overlay */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Bar (Back Button) */}
          <div className="flex justify-between items-center mb-10">
             <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-300 hover:text-white hover:bg-white/10 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Explore
             </Button>
             <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                    <Share2 className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full">
                    <MoreHorizontal className="w-5 h-5" />
                </Button>
             </div>
          </div>

          {/* Profile Info (Flex Container) */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
             
             {/* Avatar */}
             <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white/10 shadow-2xl ring-1 ring-black/50 bg-neutral-800">
                <AvatarImage src={mentor.image || undefined} alt={mentor.name || 'Mentor'} className="object-cover" />
                <AvatarFallback className="text-4xl font-bold bg-neutral-800 text-gray-200">
                  {initials}
                </AvatarFallback>
             </Avatar>

             {/* Text Content */}
             <div className="flex-1 space-y-3 mb-2">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                        {mentor.name}
                        {mentor.verificationStatus === 'VERIFIED' && (
                            <CheckCircle className="w-6 h-6 text-blue-400 fill-blue-400/10" />
                        )}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-300 font-medium">
                        {mentor.title} <span className="text-gray-500 font-normal">at {mentor.company}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                        <MapPin className="w-3.5 h-3.5" />
                        {[mentor.city, mentor.country].filter(Boolean).join(', ') || 'Remote'}
                    </span>
                    
                    {/* Socials */}
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                        {mentor.linkedinUrl && (
                            <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                <Linkedin className="w-4 h-4" />
                            </a>
                        )}
                        {mentor.websiteUrl && (
                            <a href={mentor.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                <Globe className="w-4 h-4" />
                            </a>
                        )}
                         {mentor.githubUrl && (
                            <a href={mentor.githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>
             </div>

             {/* Mobile CTA (Visible only on small screens) */}
             <div className="w-full md:hidden mt-4">
                 <Button className="w-full bg-white text-black hover:bg-gray-100" onClick={handleBookSession}>Book Session</Button>
             </div>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Sticky Tabs Bar */}
        <div className="sticky top-0 z-30 bg-[#F9FAFB]/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 -mx-4 px-4 sm:mx-0 sm:px-0 mb-8 overflow-x-auto scrollbar-hide">
          <nav className="flex space-x-8" aria-label="Tabs">
            {['overview', 'reviews', 'achievements', 'mentoring_style'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as TabType)}
                className={cn(
                  "py-4 px-1 text-sm font-semibold whitespace-nowrap border-b-2 transition-all capitalize",
                  activeTab === tab 
                    ? "border-gray-900 dark:border-white text-gray-900 dark:text-white" 
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                )}
              >
                {tab.replace('_', ' ')}
                {tab === 'reviews' && (
                  <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1 bg-gray-100 text-gray-600">0</Badge>
                )}
                {tab === 'achievements' && (
                   <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1 bg-teal-50 text-teal-700">10</Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN (2/3 width) - Dynamic Content */}
          <div className="lg:col-span-2">
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'reviews' && renderReviews()}
              {activeTab === 'achievements' && renderAchievements()}
              {activeTab === 'mentoring_style' && renderMentoringStyle()}
          </div>

          {/* RIGHT COLUMN (Sidebar) - Static */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Community Stats */}
            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Profile Insights</h3>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Mentorship Capacity</p>
                    <p className="font-semibold text-gray-900">{mentor.maxMentees || 'Unlimited'} Mentees</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-pink-50 p-2 rounded-lg text-pink-600">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase">Top Skill</p>
                    <p className="font-semibold text-gray-900">{mentor.expertiseArray?.[0] || 'Mentorship'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Sessions Block */}
            <div className="sticky top-20">
              <div className="mb-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Available sessions</h3>
                <p className="text-sm text-gray-500">Book 1:1 sessions from the options based on your needs</p>
              </div>
              
              <Card className="border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl hover:shadow-md transition-shadow group cursor-pointer" onClick={handleBookSession}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">1:1 Mentorship</h4>
                    {mentor.hourlyRate ? (
                      <Badge className="bg-gray-900 text-white group-hover:bg-blue-600 transition-colors">${mentor.hourlyRate}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">Free</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    A private session to discuss your career, portfolio, or technical challenges.
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center text-xs text-gray-500 gap-1">
                      <Clock className="w-3 h-3" />
                      <span>60 mins</span>
                    </div>
                    <Button className="bg-gray-900 group-hover:bg-blue-600 text-white font-medium px-6 transition-colors">
                      Book
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isMessageMentorEnabled && (<Card className="mt-4 border border-gray-200 dark:border-gray-800 shadow-sm rounded-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-3">
                    <h4 className="font-bold text-gray-900 dark:text-white text-md">Have a quick question?</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Send a message to introduce yourself before booking.
                    </p>
                    <Button variant="outline" onClick={handleSendMessage} className="w-full mt-2 border-gray-300 hover:bg-gray-50">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
            </div>

          </div>
        </div>
      </div>

      {/* Modals */}
      {mentor && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          mentor={{
            id: mentor.id,
            userId: mentor.userId,
            fullName: mentor.fullName,
            title: mentor.title,
            company: mentor.company,
            profileImageUrl: mentor.profileImageUrl,
            hourlyRate: mentor.hourlyRate,
            currency: mentor.currency,
            about: mentor.about,
            expertise: mentor.expertiseArray ? JSON.stringify(mentor.expertiseArray) : mentor.expertise,
          }}
        />
      )}
      {mentor && session?.user?.id && (
        <MessageRequestModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          recipientId={mentor.userId}
          recipientName={mentor.fullName || 'Mentor'}
          recipientType="mentor"
          userId={session.user.id}
          onSuccess={handleMessageSuccess}
        />
      )}
    </div>
  )
}