"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  MessageCircle,
  MoreVertical,
  User,
  Clock,
  Target,
  CheckCircle,
  PauseCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
} from "lucide-react"
import { format } from "date-fns"

interface MenteeCardProps {
  mentee: {
    id: string
    menteeId: string
    status: string
    goals: string | null
    duration: string | null
    frequency: string | null
    rate: string | null
    currency: string | null
    billingType: string | null
    progress: string | null
    milestones: string | null
    startedAt: Date | null
    approvedByMentor: boolean | null
    approvedByMentee: boolean | null
    createdAt: Date
    mentee: {
      id: string
      email: string
      name: string | null
      image: string | null
      firstName: string | null
      lastName: string | null
      bio: string | null
      timezone: string | null
    }
  }
  onMessage?: () => void
  onSchedule?: () => void
  onViewProfile?: () => void
  onApprove?: () => void
  onReject?: () => void
  onPause?: () => void
  onResume?: () => void
  onComplete?: () => void
}

export function MenteeCard({
  mentee,
  onMessage,
  onSchedule,
  onViewProfile,
  onApprove,
  onReject,
  onPause,
  onResume,
  onComplete,
}: MenteeCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: {
        label: "Active",
        variant: "default" as const,
        icon: CheckCircle,
        color: "bg-green-100 text-green-800 border-green-200",
      },
      pending: {
        label: "Pending Approval",
        variant: "secondary" as const,
        icon: AlertCircle,
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      paused: {
        label: "Paused",
        variant: "outline" as const,
        icon: PauseCircle,
        color: "bg-gray-100 text-gray-800 border-gray-200",
      },
      completed: {
        label: "Completed",
        variant: "default" as const,
        icon: CheckCircle,
        color: "bg-blue-100 text-blue-800 border-blue-200",
      },
      cancelled: {
        label: "Cancelled",
        variant: "destructive" as const,
        icon: XCircle,
        color: "bg-red-100 text-red-800 border-red-200",
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const displayName = mentee.mentee.name || 
    (mentee.mentee.firstName && mentee.mentee.lastName 
      ? `${mentee.mentee.firstName} ${mentee.mentee.lastName}`
      : mentee.mentee.email)

  const getDurationText = () => {
    if (!mentee.startedAt) return "Not started"
    const start = new Date(mentee.startedAt)
    const now = new Date()
    const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months === 0) return "Just started"
    if (months === 1) return "1 month"
    return `${months} months`
  }

  const getProgressData = () => {
    if (!mentee.progress) return null
    try {
      return JSON.parse(mentee.progress)
    } catch {
      return null
    }
  }

  const getMilestonesData = () => {
    if (!mentee.milestones) return null
    try {
      return JSON.parse(mentee.milestones)
    } catch {
      return null
    }
  }

  const progress = getProgressData()
  const milestones = getMilestonesData()

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={mentee.mentee.image || undefined} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{displayName}</h3>
              <p className="text-sm text-gray-500">{mentee.mentee.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(mentee.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mentee.status === "pending" && (
                  <>
                    <DropdownMenuItem onClick={onApprove}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Request
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onReject} className="text-red-600">
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject Request
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {mentee.status === "active" && (
                  <>
                    <DropdownMenuItem onClick={onPause}>
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Pause Mentorship
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onComplete}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Completed
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {mentee.status === "paused" && (
                  <>
                    <DropdownMenuItem onClick={onResume}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Resume Mentorship
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onViewProfile}>
                  <User className="mr-2 h-4 w-4" />
                  View Full Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {mentee.bio && (
          <p className="text-sm text-gray-600 line-clamp-2">{mentee.mentee.bio}</p>
        )}

        {mentee.goals && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-blue-500" />
              Goals
            </div>
            <p className="text-sm text-gray-600 pl-6">{mentee.goals}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="h-3 h-3" />
              Duration
            </div>
            <p className="font-medium pl-5">{mentee.duration || getDurationText()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-3 w-3" />
              Frequency
            </div>
            <p className="font-medium pl-5">{mentee.frequency || "Not set"}</p>
          </div>
        </div>

        {mentee.rate && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="font-medium">
              {mentee.currency || "$"}{mentee.rate} / {mentee.billingType || "session"}
            </span>
          </div>
        )}

        {progress && progress.percentage !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <TrendingUp className="h-3 w-3" />
                Progress
              </span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-500">
            Member since {format(new Date(mentee.createdAt), "MMM yyyy")}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onMessage}
              disabled={mentee.status !== "active"}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button
              size="sm"
              onClick={onSchedule}
              disabled={mentee.status !== "active"}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}