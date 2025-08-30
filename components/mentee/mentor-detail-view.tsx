"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Award,
  Calendar,
  MessageCircle,
  Video,
  Heart,
  Share,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Mail,
  Phone,
  Briefcase,
  Users,
  CheckCircle
} from "lucide-react"
import { useMentorDetail } from "@/hooks/use-mentor-detail"
import { BookingModal } from "@/components/booking/booking-modal"
import { MessageRequestModal } from "@/components/messaging/message-request-modal"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface MentorDetailViewProps {
  mentorId: string | null
  onBack: () => void
}

export function MentorDetailView({ mentorId, onBack }: MentorDetailViewProps) {
  const { mentor, loading, error } = useMentorDetail(mentorId)
  const { session } = useAuth()
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)

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

  const StatItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | number | undefined }) => (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-gray-500" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 dark:text-white">{value || 'N/A'}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </Card>
            ))}
          </div>
          <div className="space-y-6">
            <Card className="p-6 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
              <Separator className="my-6" />
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center">
        <p className="text-red-500">{error}</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    )
  }

  if (!mentor) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center">
        <p>Mentor not found.</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Left Column */}
          <div className="md:col-span-2 space-y-8">
            {/* About Section */}
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">About {mentor.name}</h2>
              {mentor.headline && (
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  {mentor.headline}
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                {mentor.about || `I am a passionate and experienced software engineer with over 10 years of experience in the tech industry. I specialize in frontend development with React and have a strong background in building scalable and user-friendly web applications. I am excited to share my knowledge and help aspiring developers grow their skills.`}
              </p>
            </Card>

            {/* Expertise Section */}
            {mentor.expertiseArray && mentor.expertiseArray.length > 0 && (
              <Card className="p-8 border-0 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Expertise</h2>
                <div className="flex flex-wrap gap-3">
                  {mentor.expertiseArray.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-base px-4 py-2 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Professional Info */}
            <Card className="p-8 border-0 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Professional Background</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StatItem icon={Briefcase} label="Experience" value={`${mentor.experience}+ years`} />
                <StatItem icon={Users} label="Max Mentees" value={mentor.maxMentees || 'Unlimited'} />
                <StatItem icon={Clock} label="Industry" value={mentor.industry} />
                <StatItem icon={MapPin} label="Location" value={[mentor.city, mentor.country].filter(Boolean).join(', ')} />
              </div>
            </Card>

            {/* Contact & Links */}
            {(mentor.linkedinUrl || mentor.githubUrl || mentor.websiteUrl) && (
              <Card className="p-8 border-0 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Connect & Learn More</h2>
                <div className="flex flex-wrap gap-4">
                   {mentor.linkedinUrl && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="w-4 h-4" /> LinkedIn
                      </a>
                    </Button>
                  )}
                  {mentor.githubUrl && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={mentor.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Github className="w-4 h-4" /> GitHub
                      </a>
                    </Button>
                  )}
                  {mentor.websiteUrl && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={mentor.websiteUrl} target="_blank" rel="noopener noreferrer">
                        <Globe className="w-4 h-4" /> Website
                      </a>
                    </Button>
                  )}
                  {mentor.resumeUrl && (
                    <Button variant="outline" className="gap-2" asChild>
                      <a href={mentor.resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Award className="w-4 h-4" /> View Resume
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column (Sticky) */}
          <div className="md:sticky top-24 space-y-6">
            <Card className="p-6 text-center border-0 shadow-lg">
              <Avatar className="w-28 h-28 mx-auto mb-4 rounded-full ring-4 ring-white dark:ring-gray-800 shadow-md">
                <AvatarImage src={mentor.image || undefined} alt={mentor.name || 'Mentor'} />
                <AvatarFallback className="text-4xl font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mentor.name}</h1>
              <p className="text-md text-gray-600 dark:text-gray-400 mb-1">{mentor.title}</p>
              {mentor.company && <p className="text-sm text-gray-500 mb-4">at {mentor.company}</p>}
              
              {mentor.verificationStatus === 'VERIFIED' && (
                <Badge variant="default" className="mb-4 gap-1.5 pl-2 pr-3 py-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified Mentor
                </Badge>
              )}

              <Separator className="my-6" />

              {mentor.hourlyRate && (
                <div className="mb-6">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    ${mentor.hourlyRate}
                    <span className="text-lg font-medium text-gray-500">/hr</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button size="lg" className="w-full gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleBookSession}>
                  <Calendar className="w-5 h-5" />
                  Book a Session
                </Button>
                <Button variant="outline" size="lg" className="w-full gap-2" onClick={handleSendMessage}>
                  <MessageCircle className="w-5 h-5" />
                  Send a Message
                </Button>
              </div>
            </Card>
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
