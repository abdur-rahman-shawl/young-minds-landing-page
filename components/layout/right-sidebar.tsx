import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Calendar, MessageCircle, Video, ExternalLink } from "lucide-react"
import { useMentorDetail } from "@/hooks/use-mentor-detail"
import Image from "next/image"

interface RightSidebarProps {
  selectedMentor?: string | null
}

export function RightSidebar({ selectedMentor }: RightSidebarProps) {
  const { mentor, loading } = useMentorDetail(selectedMentor)

  return (
    <aside className="p-4 space-y-6 h-screen overflow-y-auto">
      {/* Mentor Quick View */}
      {selectedMentor && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
              Selected Mentor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ) : mentor ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={mentor.image || undefined} alt={mentor.name || 'Mentor'} />
                    <AvatarFallback>
                      {mentor.name?.split(' ').map(n => n[0]).join('') || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {mentor.name || 'Anonymous Mentor'}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {mentor.title}{mentor.company && ` at ${mentor.company}`}
                    </p>
                    {mentor.city && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{mentor.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-end">
                  {mentor.hourlyRate && (
                    <span className="text-xs font-semibold text-blue-600">
                      ${mentor.hourlyRate}/hr
                    </span>
                  )}
                </div>

                {/* Expertise badges */}
                {mentor.expertiseArray && mentor.expertiseArray.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertiseArray.slice(0, 2).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                        {skill}
                      </Badge>
                    ))}
                    {mentor.expertiseArray.length > 2 && (
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        +{mentor.expertiseArray.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button size="sm" className="w-full text-xs gap-1">
                    <Calendar className="w-3 h-3" />
                    Book Session
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <MessageCircle className="w-3 h-3" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs gap-1">
                      <Video className="w-3 h-3" />
                      Call
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">Mentor not found</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Community Connect */}
      <Card className="p-6 bg-gray-100 dark:bg-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          <span className="text-purple-600 dark:text-purple-400 block">Community</span>
          Connect
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">a forum for networking</p>
      </Card>

      {/* Other content */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Counseling
            <br />
            <span className="font-bold">Study Abroad?</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            Get complete support system from application to admission into 250+ university in Europe & Asia
          </p>
          <div className="w-full h-48 rounded-b-full overflow-hidden shadow-lg">
            <Image
              src="/placeholder.svg?height=200&width=200"
              alt="Study abroad counseling"
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Start up <span className="font-bold">Eco-System</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            a cohort startup guide and mentors. Collab with the experts we have already achieved.
          </p>
        </div>

        <div>
          <h4 className="text-lg text-gray-900 dark:text-white mb-2">
            Working Professionals
            <br />
            <span className="font-bold">looking for mentorship?</span>
          </h4>
          <p className="text-gray-600 dark:text-gray-300 text-sm">Get a guide for lifetime.</p>
        </div>
      </div>
    </aside>
  )
}
