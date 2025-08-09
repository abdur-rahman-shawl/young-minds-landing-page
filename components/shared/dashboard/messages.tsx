import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, MoreVertical } from "lucide-react"

export function Messages() {
  const conversations = [
    {
      id: 1,
      name: "Sarah Johnson",
      lastMessage: "Thanks for the session! Really helpful insights on React performance.",
      timestamp: "2 min ago",
      unread: 2,
      image: "/placeholder.svg?height=40&width=40",
      online: true
    },
    {
      id: 2,
      name: "Michael Chen",
      lastMessage: "Let's schedule our next product strategy discussion.",
      timestamp: "1 hour ago",
      unread: 0,
      image: "/placeholder.svg?height=40&width=40",
      online: false
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      lastMessage: "I've shared the design system resources you requested.",
      timestamp: "Yesterday",
      unread: 1,
      image: "/placeholder.svg?height=40&width=40",
      online: true
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Messages
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your conversations with mentors and peers
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.image} alt={conversation.name} />
                    <AvatarFallback>{conversation.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  {conversation.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conversation.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      {conversation.unread > 0 && (
                        <Badge variant="default" className="bg-blue-600">
                          {conversation.unread}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
} 