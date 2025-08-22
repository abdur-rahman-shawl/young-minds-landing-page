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
  CheckCircle,
  XCircle,
  AlertCircle,
  Video,
  History,
  CalendarCheck,
  CalendarX,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

interface SessionMenteeCardProps {
  mentee: {
    menteeId: string
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
    totalSessions: number
    completedSessions: number
    upcomingSessions: number
    cancelledSessions: number
    lastSessionDate: Date | null
    nextSessionDate: Date | null
    firstSessionDate: Date | null
  }
  onMessage?: () => void
  onSchedule?: () => void
  onViewSessions?: () => void
}

export function SessionMenteeCard({
  mentee,
  onMessage,
  onSchedule,
  onViewSessions,
}: SessionMenteeCardProps) {
  const displayName = mentee.mentee.name || 
    (mentee.mentee.firstName && mentee.mentee.lastName 
      ? `${mentee.mentee.firstName} ${mentee.mentee.lastName}`
      : mentee.mentee.email)

  const getStatusBadge = () => {
    if (mentee.upcomingSessions > 0) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Active
        </Badge>
      )
    } else if (mentee.completedSessions > 0) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
          <History className="w-3 h-3" />
          Past Mentee
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Inactive
        </Badge>
      )
    }
  }

  const getMembershipDuration = () => {
    if (!mentee.firstSessionDate) return "New mentee"
    const firstDate = new Date(mentee.firstSessionDate)
    const now = new Date()
    const months = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months === 0) return "Less than a month"
    if (months === 1) return "1 month"
    return `${months} months`
  }

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
            {getStatusBadge()}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewSessions}>
                  <History className="mr-2 h-4 w-4" />
                  View Session History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSchedule}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule New Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMessage}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {mentee.mentee.bio && (
          <p className="text-sm text-gray-600 line-clamp-2">{mentee.mentee.bio}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Video className="h-3 w-3" />
                Total Sessions
              </div>
              <p className="font-semibold text-lg">{mentee.totalSessions}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CalendarCheck className="h-3 w-3" />
                Completed
              </div>
              <p className="font-semibold">{mentee.completedSessions}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3" />
                Upcoming
              </div>
              <p className="font-semibold text-lg text-green-600">
                {mentee.upcomingSessions}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CalendarX className="h-3 w-3" />
                Cancelled
              </div>
              <p className="font-semibold text-gray-500">{mentee.cancelledSessions}</p>
            </div>
          </div>
        </div>

        {mentee.nextSessionDate && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Next Session</p>
                <p className="text-sm font-semibold text-green-900">
                  {format(new Date(mentee.nextSessionDate), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs">
                {formatDistanceToNow(new Date(mentee.nextSessionDate), { addSuffix: true })}
              </Badge>
            </div>
          </div>
        )}

        {!mentee.nextSessionDate && mentee.lastSessionDate && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Last Session</p>
                <p className="text-sm font-semibold text-gray-800">
                  {format(new Date(mentee.lastSessionDate), "MMM d, yyyy")}
                </p>
              </div>
              <Badge className="bg-gray-100 text-gray-600 text-xs">
                {formatDistanceToNow(new Date(mentee.lastSessionDate), { addSuffix: true })}
              </Badge>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-gray-500">
            Mentoring for {getMembershipDuration()}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onMessage}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button
              size="sm"
              onClick={onSchedule}
              className="bg-blue-500 hover:bg-blue-600 text-white"
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