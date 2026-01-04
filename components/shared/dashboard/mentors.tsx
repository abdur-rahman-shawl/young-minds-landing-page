import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Video, MessageCircle, Star, MoreHorizontal, CalendarCheck, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface MentorsProps {
  onMentorSelect: (mentorId: string) => void
}

export function Mentors({ onMentorSelect }: MentorsProps) {
  const mentors = [
    {
      id: 1,
      name: "Sarah Johnson",
      title: "Senior Software Engineer",
      company: "Google",
      rating: 4.9,
      expertise: ["React", "Node.js", "System Design"],
      image: "/placeholder.svg?height=60&width=60",
      status: "available",
      nextSlot: "Tomorrow, 10:00 AM"
    },
    {
      id: 2,
      name: "Michael Chen",
      title: "Product Manager",
      company: "Microsoft",
      rating: 4.8,
      expertise: ["Product Strategy", "Leadership", "Analytics"],
      image: "/placeholder.svg?height=60&width=60",
      status: "busy",
      nextSlot: "Wed, 2:00 PM"
    }
  ]

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            My Mentors
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage your connections and schedule your next sessions.
          </p>
        </div>
        <Button variant="outline" className="self-start">Find New Mentor</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mentors.map((mentor) => (
          <Card key={mentor.id} className="group relative overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
            {/* Status Indicator Bar */}
            <div className={cn(
              "absolute top-0 left-0 w-1 h-full transition-colors",
              mentor.status === 'available' ? "bg-green-500" : "bg-amber-500"
            )} />

            <div className="p-6 pl-8">
              <div className="flex justify-between items-start mb-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-800 shadow-sm">
                    <AvatarImage src={mentor.image} alt={mentor.name} />
                    <AvatarFallback>{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {/* Pulsing Status Dot */}
                  <div className="absolute bottom-0 right-0">
                     <span className="relative flex h-4 w-4">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            mentor.status === 'available' ? "bg-green-400" : "bg-amber-400"
                        )}></span>
                        <span className={cn(
                            "relative inline-flex rounded-full h-4 w-4 border-2 border-white dark:border-slate-900",
                            mentor.status === 'available' ? "bg-green-500" : "bg-amber-500"
                        )}></span>
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors cursor-pointer" onClick={() => onMentorSelect(String(mentor.id))}>
                    {mentor.name}
                    </h3>
                    <div className="flex items-center text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                        <Star className="w-3 h-3 fill-amber-500 mr-1" /> {mentor.rating}
                    </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {mentor.title} at <span className="text-slate-800 dark:text-slate-200 font-medium">{mentor.company}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {mentor.expertise.map((skill) => (
                  <Badge key={skill} variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 mb-6 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                 <div className="p-2 bg-white dark:bg-slate-800 rounded-md shadow-sm">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                 </div>
                 <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Next Availability</p>
                    <p>{mentor.nextSlot}</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button size="sm" className="w-full gap-2 shadow-sm" onClick={() => onMentorSelect(String(mentor.id))}>
                  <Video className="w-4 h-4" />
                  Schedule
                </Button>
                <Button size="sm" variant="outline" className="w-full gap-2 border-slate-200 dark:border-slate-800">
                  <MessageCircle className="w-4 h-4" />
                  Chat
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}