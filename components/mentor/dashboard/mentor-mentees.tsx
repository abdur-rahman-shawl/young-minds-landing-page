"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionMenteeCard } from "./session-mentee-card"
import { useMentorMenteeSessions } from "@/hooks/use-mentor-mentees-sessions"
import { useRouter } from "next/navigation"
import {
  Users,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
} from "lucide-react"

export function MentorMentees() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const { mentees, stats, isLoading, error, mutate } = useMentorMenteeSessions()

  const filteredMentees = mentees?.filter((mentee) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const name = mentee.mentee.name?.toLowerCase() || ""
    const email = mentee.mentee.email.toLowerCase()
    const firstName = mentee.mentee.firstName?.toLowerCase() || ""
    const lastName = mentee.mentee.lastName?.toLowerCase() || ""

    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower)
    )
  }).filter((mentee) => {
    switch (activeTab) {
      case 'active':
        return mentee.upcomingSessions > 0
      case 'past':
        return mentee.upcomingSessions === 0 && mentee.completedSessions > 0
      case 'all':
      default:
        return true
    }
  })

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Mentees</h3>
        <p className="text-muted-foreground text-center max-w-md text-sm">
          We couldn't load your mentees. Please try refreshing the page.
        </p>
        <Button onClick={() => mutate()} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Mentees</h1>
          <p className="text-sm text-muted-foreground">Manage your mentees and sessions</p>
        </div>
        <Button size="sm" onClick={() => router.push("/dashboard?section=schedule")}>
          <Calendar className="mr-2 h-4 w-4" />
          View Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Mentees</p>
                <div className="text-xl font-bold">{stats?.totalMentees || 0}</div>
              </div>
              <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Active</p>
                <div className="text-xl font-bold">{stats?.activeMentees || 0}</div>
              </div>
              <div className="h-8 w-8 rounded bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
                <div className="text-xl font-bold">{stats?.upcomingSessions || 0}</div>
              </div>
              <div className="h-8 w-8 rounded bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Attended</p>
                <div className="text-xl font-bold">{stats?.totalSessions || 0}</div>
              </div>
              <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search mentees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-xs px-3">
                  All
                  {stats?.totalMentees ? <span className="ml-1.5 opacity-70">{stats.totalMentees}</span> : null}
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs px-3">
                  Active
                  {stats?.activeMentees ? <span className="ml-1.5 opacity-70">{stats.activeMentees}</span> : null}
                </TabsTrigger>
                <TabsTrigger value="past" className="text-xs px-3">
                  Past
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMentees && filteredMentees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMentees.map((mentee) => (
              <SessionMenteeCard
                key={mentee.menteeId}
                mentee={mentee}
                onMessage={() => router.push(`/dashboard?section=messages`)}
                onSchedule={() => router.push(`/dashboard?section=schedule`)}
                onViewSessions={() => router.push(`/dashboard?section=sessions`)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">
              {searchTerm ? "No results found" : "No mentees yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              {searchTerm
                ? "Try adjusting your search terms"
                : activeTab === "all"
                  ? "Start mentoring to see your mentees here"
                  : "No mentees in this category"}
            </p>
            {!searchTerm && activeTab === "all" && (
              <Button size="sm" onClick={() => router.push("/dashboard?section=schedule")}>
                View Schedule
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
