"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SessionMenteeCard } from "./session-mentee-card"
import { useMentorMenteeSessions } from "@/hooks/use-mentor-mentees-sessions"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Video,
} from "lucide-react"

export function MentorMentees() {
  const router = useRouter()
  const { toast } = useToast()
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
    // Filter based on active tab
    switch(activeTab) {
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
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Mentees</h3>
        <p className="text-gray-600 text-center max-w-md">
          We couldn't load your mentees. Please try refreshing the page.
        </p>
        <Button onClick={() => mutate()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Mentees</h1>
          <p className="text-gray-600 mt-1">View and manage your mentees from booked sessions</p>
        </div>
        <Button onClick={() => router.push("/dashboard?section=schedule")}>
          <Calendar className="mr-2 h-4 w-4" />
          View Schedule
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mentees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMentees || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Mentees</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeMentees || 0}</div>
              <p className="text-xs text-muted-foreground">With upcoming sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.upcomingSessions || 0}</div>
              <p className="text-xs text-muted-foreground">Scheduled sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Video className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">All time sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search mentees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all">
            All Mentees
            {stats?.totalMentees ? (
              <Badge variant="secondary" className="ml-2">
                {stats.totalMentees}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            {stats?.activeMentees ? (
              <Badge variant="secondary" className="ml-2">
                {stats.activeMentees}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past
            {stats?.totalMentees && stats?.activeMentees ? (
              <Badge variant="secondary" className="ml-2">
                {stats.totalMentees - stats.activeMentees}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-64">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredMentees && filteredMentees.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <Card className="p-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? "No mentees found" : "No mentees yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : activeTab === "all"
                    ? "No mentees have booked sessions with you yet"
                    : activeTab === "active"
                    ? "No mentees with upcoming sessions"
                    : "No past mentees"}
                </p>
                {!searchTerm && activeTab === "all" && (
                  <Button onClick={() => router.push("/dashboard?section=schedule")}>
                    View Your Schedule
                  </Button>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
