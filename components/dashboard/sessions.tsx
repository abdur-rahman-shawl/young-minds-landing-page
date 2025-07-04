import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Clock, Video, MapPin } from "lucide-react"

export function Sessions() {
  const sessions = [
    {
      id: 1,
      title: "React Performance Optimization",
      mentor: "Sarah Johnson",
      mentorImage: "/placeholder.svg?height=40&width=40",
      date: "Today",
      time: "2:00 PM - 3:00 PM",
      status: "upcoming",
      type: "video",
      duration: "60 min"
    },
    {
      id: 2,
      title: "Product Strategy Deep Dive",
      mentor: "Michael Chen",
      mentorImage: "/placeholder.svg?height=40&width=40",
      date: "Tomorrow",
      time: "10:00 AM - 11:30 AM",
      status: "upcoming",
      type: "video",
      duration: "90 min"
    },
    {
      id: 3,
      title: "Design System Workshop",
      mentor: "Emily Rodriguez",
      mentorImage: "/placeholder.svg?height=40&width=40",
      date: "Jan 25",
      time: "3:00 PM - 4:00 PM",
      status: "completed",
      type: "video",
      duration: "60 min"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sessions
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your scheduled mentoring sessions and meetings
          </p>
        </div>

        <div className="grid gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={session.mentorImage} alt={session.mentor} />
                    <AvatarFallback>{session.mentor.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {session.title}
                      </h3>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      with {session.mentor}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{session.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{session.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Video className="w-4 h-4" />
                        <span>{session.duration}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {session.status === 'upcoming' && (
                        <>
                          <Button size="sm" className="gap-2">
                            <Video className="w-4 h-4" />
                            Join Session
                          </Button>
                          <Button size="sm" variant="outline">
                            Reschedule
                          </Button>
                        </>
                      )}
                      {session.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          View Recording
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 