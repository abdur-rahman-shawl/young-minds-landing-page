import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  MessageCircle, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock,
  Video,
  Star
} from "lucide-react"

export function Dashboard() {
  const recentActivity = [
    {
      type: "session",
      title: "React Performance session with Sarah Johnson",
      time: "2 hours ago",
      icon: Video
    },
    {
      type: "message",
      title: "New message from Michael Chen",
      time: "4 hours ago",
      icon: MessageCircle
    },
    {
      type: "saved",
      title: "Saved 'Career Growth in Tech Industry'",
      time: "1 day ago",
      icon: BookOpen
    }
  ]

  const upcomingSessions = [
    {
      mentor: "Sarah Johnson",
      topic: "System Design Deep Dive",
      time: "Today, 2:00 PM",
      avatar: "/placeholder.svg?height=32&width=32"
    },
    {
      mentor: "Michael Chen",
      topic: "Product Strategy Review",
      time: "Tomorrow, 10:00 AM",
      avatar: "/placeholder.svg?height=32&width=32"
    }
  ]

  const stats = [
    {
      label: "Sessions This Month",
      value: "12",
      change: "+3 from last month",
      trend: "up",
      icon: Calendar
    },
    {
      label: "Messages",
      value: "24",
      change: "+8 this week",
      trend: "up",
      icon: MessageCircle
    },
    {
      label: "Mentors Connected",
      value: "8",
      change: "+2 new connections",
      trend: "up",
      icon: Users
    },
    {
      label: "Items Saved",
      value: "47",
      change: "+12 this week",
      trend: "up",
      icon: BookOpen
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, John! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Here's what's happening with your mentoring journey today.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-5 h-5 text-blue-600" />
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-xs text-green-600">
                  {stat.change}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Sessions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Sessions
              </h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {upcomingSessions.map((session, index) => (
                <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.avatar} alt={session.mentor} />
                    <AvatarFallback>{session.mentor.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {session.topic}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      with {session.mentor}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{session.time}</span>
                    </div>
                  </div>
                  <Button size="sm" className="gap-2">
                    <Video className="w-4 h-4" />
                    Join
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h3>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <activity.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 