"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MessageSquare, BookOpen, TrendingUp, Clock, Users } from "lucide-react"
import { useMentors } from "@/lib/hooks/use-mentors"
import { useSessions } from "@/lib/hooks/use-sessions"
import { useSession } from "@/lib/auth-client"

interface DashboardProps {
  onMentorSelect: (mentorId: number) => void
}

export function Dashboard({ onMentorSelect }: DashboardProps) {
  const { data: session } = useSession()
  const { mentors, loading: mentorsLoading } = useMentors()
  const { sessions, loading: sessionsLoading } = useSessions('upcoming')
  
  // Get top mentors (first 3 for quick access)
  const topMentors = mentors.slice(0, 3)
  
  // Get upcoming sessions (first 3)
  const upcomingSessions = sessions.slice(0, 3)

  const stats = [
    {
      title: "Sessions Booked",
      value: sessions.length.toString(),
      description: "+2 from last month",
      icon: CalendarDays,
      trend: "up"
    },
    {
      title: "Hours Learned",
      value: (sessions.length * 1.5).toFixed(1), // Assuming 1.5 hours avg per session
      description: "+5.2 hours this week",
      icon: Clock,
      trend: "up"
    },
    {
      title: "Mentors Connected",
      value: "8",
      description: "2 new connections",
      icon: Users,
      trend: "up"
    },
    {
      title: "Skills Progress",
      value: "76%",
      description: "+12% this month",
      icon: TrendingUp,
      trend: "up"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}! 👋</h1>
          <p className="text-gray-600 mt-1">Continue your learning journey with expert mentors</p>
        </div>
        <Button onClick={() => onMentorSelect(0)}>
          Find New Mentors
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
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled mentoring sessions</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {session.mentorName?.split(' ').map(n => n[0]).join('') || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{session.mentorName}</p>
                      <p className="text-sm text-gray-600">{session.mentorTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(session.scheduledAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(session.scheduledAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No upcoming sessions</p>
                <Button size="sm" onClick={() => onMentorSelect(0)}>
                  Book a Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Mentors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recommended Mentors</CardTitle>
              <CardDescription>Top mentors based on your interests</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onMentorSelect(0)}>
              Explore All
            </Button>
          </CardHeader>
          <CardContent>
            {mentorsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : topMentors.length > 0 ? (
              <div className="space-y-3">
                {topMentors.map((mentor) => (
                  <div 
                    key={mentor.id} 
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => onMentorSelect(parseInt(mentor.id))}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={mentor.image || undefined} alt={mentor.name} />
                      <AvatarFallback>
                        {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{mentor.name}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {mentor.title} at {mentor.company}
                      </p>
                      {mentor.expertise && (
                        <div className="flex gap-1 mt-1">
                          {mentor.expertise.split(',').slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {mentor.hourlyRate && (
                      <div className="text-right">
                        <p className="text-sm font-medium">${mentor.hourlyRate}/hr</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No mentors available</p>
                <Button size="sm" onClick={() => onMentorSelect(0)}>
                  Browse Mentors
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to accelerate your learning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => onMentorSelect(0)}
            >
              <Users className="h-6 w-6" />
              <span>Find Mentors</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <MessageSquare className="h-6 w-6" />
              <span>Send Message</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center justify-center gap-2"
            >
              <BookOpen className="h-6 w-6" />
              <span>Learning Resources</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 