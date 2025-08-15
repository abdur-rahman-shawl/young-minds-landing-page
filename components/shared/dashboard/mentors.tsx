import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Video, MessageCircle, Star } from "lucide-react"

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
      status: "available"
    },
    {
      id: 2,
      name: "Michael Chen",
      title: "Product Manager",
      company: "Microsoft",
      rating: 4.8,
      expertise: ["Product Strategy", "Leadership", "Analytics"],
      image: "/placeholder.svg?height=60&width=60",
      status: "busy"
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Mentors
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with industry experts and accelerate your growth
          </p>
        </div>

        <div className="grid gap-6">
          {mentors.map((mentor) => (
            <Card key={mentor.id} className="p-6">
              <div className="flex items-start gap-6">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={mentor.image} alt={mentor.name} />
                    <AvatarFallback>{mentor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    mentor.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {mentor.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {mentor.title} at {mentor.company}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{mentor.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {mentor.expertise.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2">
                      <Video className="w-4 h-4" />
                      Schedule Call
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Button>
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