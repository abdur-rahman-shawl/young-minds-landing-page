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
  ArrowRight,
} from "lucide-react"
import { useMentorDashboardStats, useMentorRecentSessions, useMentorRecentMessages, useMentorPendingReviews } from "@/hooks/use-mentor-dashboard"
import { format, formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { MentorAnalyticsSection } from './mentor-analytics-section';
import Link from "next/link"

interface MentorOnlyDashboardProps {
  user: any
}

export function MentorOnlyDashboard({ user }: MentorOnlyDashboardProps) {
  const { mentorProfile, isLoading: profileLoading, refreshUserData } = useAuth()
  const { stats, isLoading: statsLoading, error: statsError } = useMentorDashboardStats()
  const { sessions, isLoading: sessionsLoading } = useMentorRecentSessions(5)
  const { messages, isLoading: messagesLoading } = useMentorRecentMessages(5)
  const { sessionsToReview, isLoading: reviewsLoading, error: reviewsError } = useMentorPendingReviews(user)
  const router = useRouter()
  // Note: Payment gate is now handled at DashboardShell level
  // This component will only render if payment is complete

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
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-3">
              <CardHeader className="py-0 pb-1">
                <Skeleton className="h-3 w-20" />
              </CardHeader>
              <CardContent className="py-0">
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
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
    <div className="space-y-4">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats?.upcomingSessions > 0
              ? `You have ${stats.upcomingSessions} upcoming session${stats.upcomingSessions > 1 ? 's' : ''}`
              : 'Manage your mentees and track your mentoring progress'}
          </p>
        </div>
        <Button size="sm" onClick={() => router.push('/dashboard?section=mentees')}>
          <Users className="mr-2 h-4 w-4" />
          View All Mentees
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="py-3">
            <CardHeader className="flex flex-row items-center justify-between py-0 pb-1 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded p-1.5 ${stat.color.replace('text-', 'bg-').replace('500', '100')} dark:bg-opacity-20`}>
                <stat.icon className={`h-3 w-3 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="py-0 px-4">
              <div className="text-xl font-bold">{stat.value}</div>
              <p className="text-[11px] text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message Stats Bar */}
      {stats && stats.unreadMessages > 0 && (
        <Card className="border-primary/20 bg-primary/5 py-2">
          <CardContent className="py-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary/10 p-1.5">
                <MessageSquare className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-medium">
                {stats.unreadMessages} unread message{stats.unreadMessages > 1 ? 's' : ''}
              </span>
            </div>
            <Button size="sm" variant="secondary" onClick={() => router.push('/dashboard?section=messages')}>
              View
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Recent Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div>
              <CardTitle className="text-sm">Recent Sessions</CardTitle>
              <CardDescription className="text-xs">Your latest mentoring sessions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/dashboard?section=schedule')}>
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {sessionsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-1">
                {sessions.slice(0, 4).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={session.mentee.image || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {session.mentee.name?.charAt(0) || session.mentee.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium leading-none">{session.mentee.name || session.mentee.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(session.scheduledAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={session.status === 'scheduled' ? 'default' : session.status === 'completed' ? 'secondary' : 'outline'} className="capitalize text-[10px] h-5 px-1.5">
                        {session.status}
                      </Badge>
                      {session.meetingType === 'video' && <Video className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-muted p-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">No sessions scheduled</p>
                <p className="text-[10px] text-muted-foreground">Start accepting mentees</p>
              </div>
            )}
          </CardContent>
        </Card>


        {sessionsToReview && sessionsToReview.length > 0 && (
          <Card className="border-l-2 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <div>
                <CardTitle className="text-sm">{sessionsToReview.length} Pending Review{sessionsToReview.length > 1 ? 's' : ''}</CardTitle>
                <CardDescription className="text-xs">Leave feedback for your mentees</CardDescription>
              </div>
              {sessionsToReview.length > 3 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                  <Link href="/dashboard?section=reviews">
                    View All
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {reviewsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-3 w-24 flex-1" />
                    </div>
                  ))}
                </div>
              ) : reviewsError ? (
                <p className="text-xs text-destructive py-2">Error loading reviews</p>
              ) : (
                <div className="space-y-1">
                  {sessionsToReview.slice(0, 3).map((session) => (
                    <div
                      key={session.sessionId}
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={session.mentee.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {session.mentee.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium">{session.mentee.name}</p>
                      </div>
                      <Button asChild size="sm" className="h-6 text-[10px] px-2">
                        <Link href={`/review-session/${session.sessionId}`}>Rate</Link>
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
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
            <div>
              <CardTitle className="text-sm">Recent Messages</CardTitle>
              <CardDescription className="text-xs">Latest messages from mentees</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/dashboard?section=messages')}>
              View All
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {messagesLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-1">
                {messages.slice(0, 4).map((message) => (
                  <div key={message.id} className="flex items-start gap-2 py-2 px-2 -mx-2 rounded hover:bg-muted/50 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={message.sender.image || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {message.sender.name?.charAt(0) || message.sender.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium leading-none truncate">{message.sender.name || message.sender.email}</p>
                        {!message.isRead && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">New</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-muted p-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">No messages yet</p>
                <p className="text-[10px] text-muted-foreground">Connect with mentees</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Summary */}
        {mentorProfile && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
              <div>
                <CardTitle className="text-sm">Profile Summary</CardTitle>
                <CardDescription className="text-xs">Your mentor profile</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push('/dashboard?section=profile')}>
                Edit
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="text-sm">{user?.name?.charAt(0) || 'M'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">{mentorProfile.title}</h3>
                  <p className="text-xs text-muted-foreground">{mentorProfile.company}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-2 text-xs">
                    <span><span className="text-muted-foreground">Rate:</span> <span className="font-medium">${mentorProfile.hourlyRate}</span></span>
                    <span><span className="text-muted-foreground">Mentees:</span> <span className="font-medium">{mentorProfile.maxMentees}</span></span>
                    {stats && (
                      <span><span className="text-muted-foreground">Earned:</span> <span className="font-medium">${stats.totalEarnings.toFixed(0)}</span></span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


