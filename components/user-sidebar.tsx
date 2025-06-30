import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Users, Video, Bookmark, Users2, Mail, Calendar } from "lucide-react"
import Image from "next/image"

export function UserSidebar() {
  return (
    <div className="p-4 space-y-4 h-screen overflow-y-auto">
      {/* User Profile Card */}
      <Card className="p-6">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <Image
              src="/placeholder.svg?height=80&width=80"
              alt="John Doe"
              fill
              className="rounded-full object-cover"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">John Doe</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Computer Science Student | Aspiring Developer</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Eye className="w-4 h-4" />
              Profile views
            </span>
            <span className="font-semibold text-blue-600">24</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Users className="w-4 h-4" />
              Connections
            </span>
            <span className="font-semibold text-blue-600">156</span>
          </div>
          <div className="text-center pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Connect with mentors and grow your network</p>
          </div>
        </div>
      </Card>

      {/* Navigation Menu */}
      <Card className="p-4">
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300">
            <Bookmark className="w-4 h-4" />
            Saved Items
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300">
            <Users2 className="w-4 h-4" />
            My Mentors
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300">
            <Mail className="w-4 h-4" />
            Messages
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300">
            <Calendar className="w-4 h-4" />
            Sessions
          </Button>
        </nav>
      </Card>

      {/* Video Call Now Button */}
      <Button className="w-full bg-green-500 hover:bg-green-600 text-white gap-2">
        <Video className="w-4 h-4" />
        Start Video Call
      </Button>
    </div>
  )
}
