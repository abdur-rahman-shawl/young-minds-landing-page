"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
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
  CreditCard,
  Lock,
  ShieldCheck
} from "lucide-react"
import { useMentorDashboardStats, useMentorRecentSessions, useMentorRecentMessages, useMentorPendingReviews } from "@/hooks/use-mentor-dashboard"
import { format, formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { MentorAnalyticsSection } from './mentor-analytics-section';
import Link from "next/link"
import { useState, useCallback } from "react"

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
  const paymentStatus = mentorProfile?.paymentStatus ?? 'PENDING'
  const isPaymentComplete = paymentStatus === 'COMPLETED'

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

  const handlePaymentComplete = useCallback(async () => {
    await refreshUserData()
  }, [refreshUserData])

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

  if (!isPaymentComplete) {
    return (
      <PaymentRequiredScreen 
        name={user?.name}
        email={mentorProfile?.email || user?.email}
        onPaymentComplete={handlePaymentComplete}
      />
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
      <CardTitle>
        You have {sessionsToReview.length} pending review
        {sessionsToReview.length > 1 ? "s" : ""}
      </CardTitle>
      <CardDescription>
        Your feedback is valuable for mentees and the community.
      </CardDescription>
    </CardHeader>
    <CardContent>
      {reviewsLoading ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ) : reviewsError ? (
        <div className="text-center py-4 text-red-500">
          <p>Error: {reviewsError}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessionsToReview.map((session) => {
            // Ensure sessionEndedAt is valid
            const sessionEndedAt = session.sessionEndedAt
              ? new Date(session.sessionEndedAt)
              : null;

            return (
              <div
                key={session.sessionId}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.mentee.avatar || undefined} />
                    <AvatarFallback>
                      {session.mentee.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{session.mentee.name}</p>
                    <p className="text-xs text-gray-500">
                      {sessionEndedAt && !isNaN(sessionEndedAt.getTime())
                        ? `Session ended ${formatDistanceToNow(sessionEndedAt, { addSuffix: true })}`
                        : "Session ended recently."}
                    </p>
                  </div>
                </div>
                <Button asChild size="sm">
                  <Link href={`/review-session/${session.sessionId}`}>Rate Now</Link>
                </Button>
              </div>
            );
          })}
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

function PaymentRequiredScreen({ name, email, onPaymentComplete }: { name?: string; email?: string; onPaymentComplete?: () => Promise<void> | void }) {
  const firstName = name?.split(' ')[0] || 'Mentor'
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleApplyCoupon = async () => {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      setApplyError('Enter a coupon code to continue')
      return
    }

    setIsApplying(true)
    setApplyError(null)
    setValidationMessage(null)

    try {
      const response = await fetch('/api/mentor/payments/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponCode: normalizedCode }),
      })

      const data = await response.json().catch(() => ({ success: false, error: 'Invalid response from server' }))

      if (!response.ok || !data?.success) {
        const message = data?.error || 'Invalid coupon code. Please try again.'
        throw new Error(message)
      }

      setCouponApplied(true)
      setValidationMessage(data?.message || 'Coupon accepted — you can now continue without payment.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to validate coupon code'
      setCouponApplied(false)
      setApplyError(message)
    } finally {
      setIsApplying(false)
    }
  }

  const handleContinueWithoutPayment = async () => {
    if (!couponApplied || isCompleting) return
    setIsCompleting(true)
    try {
      await onPaymentComplete?.()
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12">
      <Card className="w-full max-w-3xl border-t-4 border-t-blue-600 shadow-xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-10 w-10 text-blue-600" />
            <div>
              <CardTitle>Complete your mentor activation</CardTitle>
              <CardDescription>
                Access to the mentor workspace requires a one-time onboarding payment.
              </CardDescription>
            </div>
          </div>
          <Badge className="w-fit bg-yellow-100 text-yellow-800">Payment pending</Badge>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 flex gap-3 text-blue-900">
            <Lock className="h-5 w-5 mt-1 text-blue-600" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold">Hi {firstName},</p>
              <p>Your dashboard is locked until we confirm your mentor subscription payment.</p>
              <p className="text-blue-800">
                Once payment is completed you'll regain access to mentee requests, scheduling, and payouts.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Mentor onboarding fee</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">₹5K</p>
                <p className="text-xs text-gray-500">One-time payment • refundable if we can't activate your account</p>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Priority profile verification</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Mentor success onboarding kit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Marketplace visibility boost</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border bg-gray-50 p-5">
                <p className="text-sm text-gray-600">We'll send the receipt and instructions to</p>
                <p className="text-lg font-semibold text-gray-900">{email || 'your registered email'}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Need an invoice for bookkeeping? Reply to that email and our finance team will help you within 24 hours.
                </p>
                <div className="mt-6 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Secure payments powered by Stripe</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <span>Refund guarantee if activation fails</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-5">
            <p className="text-sm font-semibold text-gray-800">Have a coupon code?</p>
            <p className="text-sm text-gray-600 mt-1">Enter your mentor coupon to skip the onboarding payment.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(event) => {
                  setCouponCode(event.target.value.toUpperCase())
                  setCouponApplied(false)
                  setApplyError(null)
                  setValidationMessage(null)
                }}
                className="flex-1 uppercase"
              />
              <Button 
                variant="outline" 
                onClick={handleApplyCoupon} 
                className="sm:w-auto"
                disabled={isApplying}
              >
                {isApplying ? 'Applying...' : 'Apply coupon'}
              </Button>
            </div>
            {applyError && (
              <p className="mt-3 text-xs text-red-600">{applyError}</p>
            )}
            {couponApplied && validationMessage ? (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span>{validationMessage}</span>
              </div>
            ) : (
              !applyError && (
                <p className="mt-3 text-xs text-gray-500">Valid coupons waive the onboarding fee instantly.</p>
              )
            )}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              You'll be redirected to our secure payment partner. Completing payment instantly unlocks your access.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Proceed to payment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="secondary" 
                disabled={!couponApplied || isCompleting}
                className={`sm:w-auto ${!couponApplied || isCompleting ? 'cursor-not-allowed opacity-70' : ''}`}
                onClick={handleContinueWithoutPayment}
              >
                {isCompleting ? 'Continuing...' : 'Continue without payment'}
              </Button>
              <Button variant="outline" className="border-dashed">
                Contact support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
