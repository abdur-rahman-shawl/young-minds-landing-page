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
  Phone
} from "lucide-react"
import { useMentorDetail } from "@/hooks/use-mentor-detail"
import { BookingModal } from "@/components/booking/booking-modal"
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

  const handleBookSession = () => {
    if (!session) {
      toast.error("Please log in to book a session")
      return
    }
    setIsBookingModalOpen(true)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Button>
        
        {/* Loading skeleton */}
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-gray-200 rounded-2xl"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Button>
        
        <Card className="p-8 text-center">
          <div className="text-red-600 mb-4">
            <p className="text-lg font-semibold">Error Loading Mentor</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!mentor) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </Button>
        
        <Card className="p-8 text-center">
          <p className="text-lg font-semibold text-gray-600">Mentor not found</p>
          <p className="text-sm text-gray-500 mt-2">The mentor you're looking for is not available.</p>
        </Card>
      </div>
    )
  }

  // Note: Rating, reviews, and sessions data will be added when available in the database

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
            <Avatar className="w-24 h-24 rounded-2xl">
              <AvatarImage 
                src={mentor.image || undefined} 
                alt={mentor.name || 'Mentor'} 
                className="rounded-2xl"
              />
              <AvatarFallback className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold text-3xl">
                {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white dark:border-gray-900"></div>
          </div>

          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {mentor.name || 'Anonymous Mentor'}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                  {mentor.title || 'Professional'}{mentor.company && ` at ${mentor.company}`}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {(mentor.city || mentor.country) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {[mentor.city, mentor.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {mentor.industry && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {mentor.industry}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                {mentor.hourlyRate && (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${mentor.hourlyRate}/{mentor.currency === 'USD' ? 'hr' : 'hour'}
                  </p>
                )}
                <p className="text-sm text-gray-500">Professional Mentor</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Experience</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {mentor.experience ? `${mentor.experience}+ years` : 'N/A'}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Availability</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {mentor.isAvailable ? 'Available' : 'Busy'}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Max Mentees</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {mentor.maxMentees || 'Unlimited'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                size="lg" 
                className="flex-1 bg-blue-500 hover:bg-blue-600 gap-2"
                onClick={handleBookSession}
              >
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
      {mentor.expertiseArray && mentor.expertiseArray.length > 0 && (
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {mentor.expertiseArray.map((skill, index) => (
              <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-0 px-3 py-1">
                {skill}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* About / Headline */}
      {(mentor.about || mentor.headline) && (
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">About</h2>
          {mentor.headline && (
            <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              {mentor.headline}
            </p>
          )}
          {mentor.about && (
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {mentor.about}
            </p>
          )}
        </Card>
      )}

      {/* Contact & Links */}
      {(mentor.linkedinUrl || mentor.githubUrl || mentor.websiteUrl || mentor.email || mentor.phone) && (
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connect</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mentor.linkedinUrl && (
              <Button variant="outline" className="justify-start gap-3" asChild>
                <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn Profile
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}
            {mentor.githubUrl && (
              <Button variant="outline" className="justify-start gap-3" asChild>
                <a href={mentor.githubUrl} target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                  GitHub Profile
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}
            {mentor.websiteUrl && (
              <Button variant="outline" className="justify-start gap-3" asChild>
                <a href={mentor.websiteUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-4 h-4" />
                  Personal Website
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}
            {mentor.email && (
              <Button variant="outline" className="justify-start gap-3" asChild>
                <a href={`mailto:${mentor.email}`}>
                  <Mail className="w-4 h-4" />
                  Email
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}
            {mentor.phone && (
              <Button variant="outline" className="justify-start gap-3" asChild>
                <a href={`tel:${mentor.phone}`}>
                  <Phone className="w-4 h-4" />
                  Phone
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Professional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mentor.resumeUrl && (
          <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Resume</h2>
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={mentor.resumeUrl} target="_blank" rel="noopener noreferrer">
                <Award className="w-4 h-4" />
                View Resume
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
          </Card>
        )}
        
        <Card className="p-6 bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Verification</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <Badge variant={mentor.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}>
                {mentor.verificationStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Member since</span>
              <span className="font-medium">
                {new Date(mentor.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Modal */}
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
    </div>
  )
}