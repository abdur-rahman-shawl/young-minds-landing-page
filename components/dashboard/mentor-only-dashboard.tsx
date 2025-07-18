"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  FileText,
  Star,
  TrendingUp,
  MessageSquare
} from "lucide-react"

interface MentorOnlyDashboardProps {
  user: any
}

interface MentorProfile {
  id: string
  title: string
  company: string
  verificationStatus: string
  verificationNotes?: string
  hourlyRate: string
  currency: string
  maxMentees: number
  headline: string
  about: string
}

export function MentorOnlyDashboard({ user }: MentorOnlyDashboardProps) {
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMentorProfile = async () => {
      try {
        const response = await fetch(`/api/mentors?userId=${user.id}`)
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          setMentorProfile(result.data[0])
        }
      } catch (error) {
        console.error('Error fetching mentor profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.id) {
      fetchMentorProfile()
    }
  }, [user?.id])

  const getVerificationStatusInfo = (status: string) => {
    switch (status) {
      case 'YET_TO_APPLY':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: FileText,
          title: 'Complete Application',
          message: 'Set up your mentor profile to start accepting mentees'
        }
      case 'IN_PROGRESS':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          title: 'Under Review',
          message: 'Your application is being reviewed by our team'
        }
      case 'VERIFIED':
        return {
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          title: 'Verified Mentor',
          message: 'You can now accept mentees and conduct sessions'
        }
      case 'REJECTED':
        return {
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          title: 'Application Rejected',
          message: 'Please review feedback and reapply'
        }
      case 'REVERIFICATION':
        return {
          color: 'bg-orange-100 text-orange-800',
          icon: RefreshCw,
          title: 'Additional Info Required',
          message: 'Please provide the requested information'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          title: 'Unknown Status',
          message: 'Please contact support'
        }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const verificationInfo = mentorProfile 
    ? getVerificationStatusInfo(mentorProfile.verificationStatus)
    : getVerificationStatusInfo('YET_TO_APPLY')

  const StatusIcon = verificationInfo.icon
  const isVerified = mentorProfile?.verificationStatus === 'VERIFIED'

  // If not verified, show restricted view
  if (!isVerified) {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👨‍🏫</h1>
            <p className="text-gray-600 mt-1">Complete your verification to start mentoring</p>
          </div>
        </div>

        {/* Verification Status - Prominent Display */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <StatusIcon className="w-12 h-12 text-orange-500" />
              <div className="flex-1">
                <h3 className="font-bold text-xl text-gray-900">{verificationInfo.title}</h3>
                <p className="text-gray-600 text-lg mt-1">{verificationInfo.message}</p>
                {mentorProfile?.verificationNotes && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700"><strong>Admin Notes:</strong> {mentorProfile.verificationNotes}</p>
                  </div>
                )}
                
                {mentorProfile?.verificationStatus === 'YET_TO_APPLY' && (
                  <div className="mt-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Complete Application
                    </Button>
                  </div>
                )}
                
                {(mentorProfile?.verificationStatus === 'REJECTED' || mentorProfile?.verificationStatus === 'REVERIFICATION') && (
                  <div className="mt-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Reapply Now
                    </Button>
                  </div>
                )}
              </div>
              <Badge className={`${verificationInfo.color} text-lg px-4 py-2`}>
                {verificationInfo.title}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Restricted Access Message */}
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600 mb-4">You need to be verified before you can access mentoring features.</p>
              <div className="text-sm text-gray-500">
                <p>Once verified, you'll be able to:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Accept mentee requests</li>
                  <li>• Schedule mentoring sessions</li>
                  <li>• Chat with mentees</li>
                  <li>• Track your earnings</li>
                  <li>• View analytics</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Summary (still accessible) */}
        {mentorProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
              <CardDescription>Your submitted mentor profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback>{user?.name?.charAt(0) || 'M'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{mentorProfile.title}</h3>
                  <p className="text-gray-600">{mentorProfile.company}</p>
                  <p className="text-sm text-gray-500 mt-1">{mentorProfile.headline}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm"><strong>Rate:</strong> ${mentorProfile.hourlyRate}/{mentorProfile.currency}</span>
                    <span className="text-sm"><strong>Max Mentees:</strong> {mentorProfile.maxMentees}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Edit Profile (Restricted)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Verified mentor gets full dashboard (existing code)
  const stats = [
    {
      title: "Active Mentees",
      value: "0",
      description: "Your current mentees",
      icon: Users,
      trend: "neutral"
    },
    {
      title: "This Month Earnings",
      value: "$0",
      description: "Revenue this month",
      icon: DollarSign,
      trend: "neutral"
    },
    {
      title: "Upcoming Sessions",
      value: "0",
      description: "Sessions scheduled",
      icon: Calendar,
      trend: "neutral"
    },
    {
      title: "Rating",
      value: "5.0",
      description: "Average rating",
      icon: Star,
      trend: "up"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👨‍🏫</h1>
          <p className="text-gray-600 mt-1">Manage your mentees and track your mentoring progress</p>
        </div>
        <Button>
          Find New Mentees
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest mentoring sessions</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No sessions scheduled yet</p>
                  <p className="text-sm">Start accepting mentees to see sessions here</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest messages from mentees</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No messages yet</p>
                  <p className="text-sm">Connect with mentees to start conversations</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Summary */}
      {mentorProfile && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>Your mentor profile information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.image || undefined} />
                <AvatarFallback>{user?.name?.charAt(0) || 'M'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{mentorProfile.title}</h3>
                <p className="text-gray-600">{mentorProfile.company}</p>
                <p className="text-sm text-gray-500 mt-1">{mentorProfile.headline}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-sm"><strong>Rate:</strong> ${mentorProfile.hourlyRate}/{mentorProfile.currency}</span>
                  <span className="text-sm"><strong>Mentees:</strong> {mentorProfile.maxMentees}</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 