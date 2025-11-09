"use client"

import { useState, useEffect } from "react"
import { CalendarDays, MessageSquare, BookOpen, TrendingUp, Clock, Users, Target, Zap } from "lucide-react"
import { useMentors } from "@/lib/hooks/use-mentors"
import { useSessions } from "@/lib/hooks/use-sessions"
import { useDashboardStats } from "@/lib/hooks/use-dashboard-stats"
import { useSession } from "@/lib/auth-client"
import { WelcomeSection } from "@/components/dashboard/welcome-section"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { SessionsList } from "@/components/dashboard/session-card"
import { MentorsList } from "@/components/dashboard/mentor-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DashboardProps {
  onMentorSelect: (mentorId: string) => void
  onSectionChange?: (section: string) => void
}

export function Dashboard({ onMentorSelect, onSectionChange }: DashboardProps) {
  const { data: session } = useSession()
  const { mentors, loading: mentorsLoading } = useMentors()
  const { sessions, loading: sessionsLoading } = useSessions('upcoming')
  const { stats: dashboardStats, loading: statsLoading } = useDashboardStats()
  
  // Get top mentors (first 3 for quick access)
  const topMentors = mentors.slice(0, 3)
  
  // Get upcoming sessions (first 3)
  const upcomingSessions = sessions.slice(0, 3)



  // Build stats array with real data
  const stats = dashboardStats ? [
    {
      title: "Sessions Booked",
      value: dashboardStats.sessionsBooked.value.toString(),
      description: dashboardStats.sessionsBooked.description,
      icon: CalendarDays,
      trend: dashboardStats.sessionsBooked.trend
    },
    {
      title: "Hours Learned",
      value: dashboardStats.hoursLearned.value.toString(),
      description: dashboardStats.hoursLearned.description,
      icon: Clock,
      trend: dashboardStats.hoursLearned.trend
    },
    {
      title: "Mentors Connected",
      value: dashboardStats.mentorsConnected.value.toString(),
      description: dashboardStats.mentorsConnected.description,
      icon: Users,
      trend: dashboardStats.mentorsConnected.trend
    }
  ] : []

  return (
    <div className="space-y-8">
      {/* Welcome Section with gradient styling */}
      <WelcomeSection 
        userName={session?.user?.name}
        onExploreClick={() => onSectionChange?.('explore')}
      />

      {/* Stats Grid with Origin UI styling */}
      <StatsGrid 
        stats={stats}
        loading={statsLoading}
      />

      {/* Sessions and Mentors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Sessions with modern cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Upcoming Sessions</h3>
              <p className="text-sm text-muted-foreground">Your scheduled mentoring sessions</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onSectionChange?.('sessions')}
              className="hover:bg-primary/5"
            >
              View All
            </Button>
          </div>
          <SessionsList
            sessions={upcomingSessions}
            loading={sessionsLoading}
            onSessionClick={(session) => console.log('Session clicked:', session)}
            onViewAllClick={() => onSectionChange?.('sessions')}
            onBookSessionClick={() => onSectionChange?.('explore')}
          />
        </div>

        {/* Recommended Mentors with modern cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Recommended Mentors</h3>
              <p className="text-sm text-muted-foreground">Top mentors based on your interests</p>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onSectionChange?.('explore')}
              className="hover:bg-primary/5"
            >
              Explore All
            </Button>
          </div>
          <MentorsList
            mentors={topMentors}
            loading={mentorsLoading}
            onMentorClick={(mentor) => onMentorSelect(mentor.id)}
            onExploreClick={() => onSectionChange?.('explore')}
          />
        </div>
      </div>

      {/* Quick Actions with gradient cards */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
          <p className="text-sm text-muted-foreground mb-4">Common tasks to accelerate your learning</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onSectionChange?.('explore')}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/90 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Find Mentors</span>
              <span className="text-xs text-muted-foreground">Connect with experts</span>
            </div>
          </button>
          
          <button
            onClick={() => onSectionChange?.('messages')}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/90 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Send Message</span>
              <span className="text-xs text-muted-foreground">Chat with mentors</span>
            </div>
          </button>
          
          <button
            onClick={() => onSectionChange?.('courses')}
            className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card hover:from-card hover:to-card/90 backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col items-center justify-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium">Learning Resources</span>
              <span className="text-xs text-muted-foreground">Explore courses</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
} 