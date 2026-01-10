"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar,
  MessageCircle,
  MoreVertical,
  History,
  Video,
  CalendarCheck,
  CalendarX,
  Clock,
  CheckCircle,
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
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 h-5 px-1.5 text-[10px] gap-1">
          <CheckCircle className="w-2.5 h-2.5" />
          Active
        </Badge>
      )
    } else if (mentee.completedSessions > 0) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 h-5 px-1.5 text-[10px] gap-1">
          <History className="w-2.5 h-2.5" />
          Past
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 h-5 px-1.5 text-[10px] gap-1">
          <Clock className="w-2.5 h-2.5" />
          Inactive
        </Badge>
      )
    }
  }

  const getMembershipDuration = () => {
    if (!mentee.firstSessionDate) return "New"
    const firstDate = new Date(mentee.firstSessionDate)
    const now = new Date()
    const months = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    if (months === 0) return "< 1 mo"
    return `${months} mos`
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 overflow-hidden group">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={mentee.mentee.image || undefined} alt={displayName} />
              <AvatarFallback className="text-sm">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-sm truncate max-w-[120px]" title={displayName}>{displayName}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]" title={mentee.mentee.email}>{mentee.mentee.email}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground -mr-2 -mt-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onViewSessions}>
                <History className="mr-2 h-3.5 w-3.5" />
                View History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSchedule}>
                <Calendar className="mr-2 h-3.5 w-3.5" />
                Schedule Session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMessage}>
                <MessageCircle className="mr-2 h-3.5 w-3.5" />
                Send Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-muted/30 p-2 rounded border border-transparent group-hover:border-border/50 transition-colors">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Video className="h-3 w-3" />
              Completed
            </div>
            <p className="font-semibold text-sm">{mentee.completedSessions}</p>
          </div>

          <div className="bg-muted/30 p-2 rounded border border-transparent group-hover:border-border/50 transition-colors">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Upcoming
            </div>
            <p className={`font-semibold text-sm ${mentee.upcomingSessions > 0 ? "text-green-600" : ""}`}>
              {mentee.upcomingSessions}
            </p>
          </div>
        </div>

        {mentee.nextSessionDate ? (
          <div className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 px-3 py-2 rounded-md">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span className="font-medium">Next:</span>
              <span>{format(new Date(mentee.nextSessionDate), "MMM d")}</span>
            </div>
            <span className="opacity-80 text-[10px]">
              {formatDistanceToNow(new Date(mentee.nextSessionDate), { addSuffix: true })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2 rounded-md bg-muted/30">
            <History className="h-3.5 w-3.5" />
            <span>Last seen {mentee.lastSessionDate ? formatDistanceToNow(new Date(mentee.lastSessionDate), { addSuffix: true }) : "recently"}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onMessage}
            className="flex-1 h-8 text-xs font-normal"
          >
            Message
          </Button>
          <Button
            size="sm"
            onClick={onSchedule}
            className="flex-1 h-8 text-xs font-normal"
          >
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}