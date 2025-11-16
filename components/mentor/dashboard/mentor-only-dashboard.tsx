"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  MessageSquare,
  TrendingDown,
  Video,
  ArrowRight
} from "lucide-react"
import { useMentorDashboardStats, useMentorRecentSessions, useMentorRecentMessages, useMentorPendingReviews } from "@/hooks/use-mentor-dashboard"
import { format, formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface MentorOnlyDashboardProps {
  user: any
}

export function MentorOnlyDashboard({ user }: MentorOnlyDashboardProps) {
  const { mentorProfile, isLoading: profileLoading } = useAuth()
  const { stats, isLoading: statsLoading, error: statsError } = useMentorDashboardStats()
  const { sessions, isLoading: sessionsLoading } = useMentorRecentSessions(5)
  const { messages, isLoading: messagesLoading } = useMentorRecentMessages(5)
   const { sessionsToReview, isLoading: reviewsLoading, error: reviewsError } = useMentorPendingReviews(user)
  const router = useRouter()

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

  if (profileLoading || statsLoading) {
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
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => router.push('/become-expert')}
                    >
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

  // Calculate trends
  const sessionsTrend = stats && stats.sessionsLastMonth > 0 
    ? ((stats.sessionsThisMonth - stats.sessionsLastMonth) / stats.sessionsLastMonth * 100).toFixed(0)
    : stats?.sessionsThisMonth > 0 ? '100' : '0';

  // Format rating display
  const ratingDisplay = stats?.averageRating 
    ? stats.averageRating.toFixed(1)
    : 'N/A';

  // Verified mentor gets full dashboard with dynamic data
  const dashboardStats = [
    {
      title: "Active Mentees",
      value: stats?.activeMentees || 0,
      description: `Out of ${stats?.totalMentees || 0} total`,
      icon: Users,
      trend: stats?.activeMentees > 0 ? "up" : "neutral",
      color: "text-blue-500"
    },
    {
      title: "This Month Earnings",
      value: `$${stats?.monthlyEarnings?.toFixed(2) || '0.00'}`,
      description: "Revenue this month",
      icon: DollarSign,
      trend: stats?.monthlyEarnings > 0 ? "up" : "neutral",
      color: "text-green-500"
    },
    {
      title: "Upcoming Sessions",
      value: stats?.upcomingSessions || 0,
      description: `${stats?.completedSessions || 0} completed`,
      icon: Calendar,
      trend: stats?.upcomingSessions > 0 ? "up" : "neutral",
      color: "text-purple-500"
    },
    {
      title: "Rating",
      value: ratingDisplay,
      description: `Based on ${stats?.totalReviews || 0} reviews`,
      icon: Star,
      trend: stats?.averageRating >= 4 ? "up" : stats?.averageRating ? "neutral" : "neutral",
      color: "text-yellow-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👨‍🏫</h1>
          <p className="text-gray-600 mt-1">
            {stats?.upcomingSessions > 0 
              ? `You have ${stats.upcomingSessions} upcoming session${stats.upcomingSessions > 1 ? 's' : ''}`
              : 'Manage your mentees and track your mentoring progress'}
          </p>
        </div>
        <Button onClick={() => router.push('/?section=mentees')}>
          View All Mentees
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
              {stat.trend !== "neutral" && (
                <div className="flex items-center mt-2">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs ${stat.trend === "up" ? "text-green-500" : "text-red-500"}`}>
                    Active
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Stats Bar */}
      {stats && stats.unreadMessages > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                You have {stats.unreadMessages} unread message{stats.unreadMessages > 1 ? 's' : ''}
              </span>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-blue-300 hover:bg-blue-100"
              onClick={() => router.push('/?section=messages')}
            >
              View Messages
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Your latest mentoring sessions</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/?section=schedule')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.mentee.image || undefined} />
                        <AvatarFallback>
                          {session.mentee.name?.charAt(0) || session.mentee.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{session.mentee.name || session.mentee.email}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(session.scheduledAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.status === 'scheduled' ? 'default' : session.status === 'completed' ? 'secondary' : 'outline'}>
                        {session.status}
                      </Badge>
                      {session.meetingType === 'video' && <Video className="h-3 w-3 text-gray-400" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No sessions scheduled yet</p>
                  <p className="text-sm">Start accepting mentees to see sessions here</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


          {sessionsToReview && sessionsToReview.length > 0 && (
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader>
                        <CardTitle>You have {sessionsToReview.length} pending review{sessionsToReview.length > 1 ? 's' : ''}</CardTitle>
                        <CardDescription>Your feedback is valuable for mentees and the community.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {reviewsLoading ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-24" /></div></div>
                          </div>
                        ) : reviewsError ? (
                          <div className="text-center py-4 text-red-500"><p>Error: {reviewsError}</p></div>
                        ) : (
                          <div className="space-y-3">
                            {sessionsToReview.map((session) => (
                              <div key={session.sessionId} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={session.mentee.avatar || undefined} />
                                    <AvatarFallback>{session.mentee.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{session.mentee.name}</p>
                                    <p className="text-xs text-gray-500">
                                      Session ended {formatDistanceToNow(new Date(session.sessionEndedAt), { addSuffix: true })}
                                    </p>
                                  </div>
                                </div>
                                <Button asChild size="sm">
                                  <Link href={`/session/${session.sessionId}`}>Rate Now</Link>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}



        {/* Recent Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest messages from mentees</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/?section=messages')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.sender.image || undefined} />
                      <AvatarFallback>
                        {message.sender.name?.charAt(0) || message.sender.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{message.sender.name || message.sender.email}</p>
                        {!message.isRead && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>No messages yet</p>
                  <p className="text-sm">Connect with mentees to start conversations</p>
                </div>
              </div>
            )}
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
                  <span className="text-sm"><strong>Max Mentees:</strong> {mentorProfile.maxMentees}</span>
                  {stats && (
                    <span className="text-sm"><strong>Total Earnings:</strong> ${stats.totalEarnings.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/?section=profile')}
              >
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}