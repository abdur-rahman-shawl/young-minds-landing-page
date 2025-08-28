"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Star, 
  User,
  BookOpen,
  CalendarClock
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMentorDashboardStats } from "@/hooks/use-mentor-dashboard"
import { useMessaging } from "@/hooks/use-messaging-v2"
import { Badge } from "@/components/ui/badge"

interface MentorSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function MentorSidebar({ activeSection, onSectionChange }: MentorSidebarProps) {
  const { session, primaryRole, mentorProfile, isLoading } = useAuth()
  const { stats, isLoading: statsLoading } = useMentorDashboardStats()
  const { totalUnreadCount } = useMessaging(session?.user?.id)
  
  const mentorMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      key: "dashboard"
    },
    {
      title: "My Mentees",
      icon: Users,
      key: "mentees"
    },
    {
      title: "Schedule",
      icon: Calendar,
      key: "schedule"
    },
    {
      title: "Availability",
      icon: CalendarClock,
      key: "availability"
    },
    {
      title: "Messages",
      icon: MessageSquare,
      key: "messages"
    },
    {
      title: "Earnings",
      icon: DollarSign,
      key: "earnings"
    },
    {
      title: "Reviews",
      icon: Star,
      key: "reviews"
    },
    {
      title: "Analytics",
      icon: BarChart3,
      key: "analytics"
    },
    {
      title: "My Content",
      icon: BookOpen,
      key: "content"
    },
    {
      title: "Profile",
      icon: User,
      key: "profile"
    },
    {
      title: "Settings",
      icon: Settings,
      key: "settings"
    }
  ]

  return (
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 mt-16">
      {/* Header with User Profile */}
      <SidebarHeader className="p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col space-y-3">
            {/* User Avatar and Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={mentorProfile?.profileImageUrl || session?.user?.image || undefined} />
                  <AvatarFallback className="bg-blue-500 text-white font-medium">
                    {mentorProfile?.fullName?.charAt(0) || session?.user?.name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {mentorProfile?.fullName || session?.user?.name || 'Mentor'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {mentorProfile?.title || (isLoading ? 'Loading...' : (primaryRole?.displayName || 'Mentor'))}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex-1">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Users className="w-3 h-3" />
                  <span>Mentees</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{statsLoading ? '...' : (stats?.totalMentees || 0)}</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <Star className="w-3 h-3" />
                  <span>Rating</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{statsLoading ? '...' : (stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A')}</p>
              </div>
            </div>

            {/* Growth Message */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Empower your mentees
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-3 py-2">
        <SidebarMenu className="space-y-0.5">
          {mentorMenuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton 
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === item.key 
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${
                  activeSection === item.key ? 'text-blue-500' : ''
                }`} />
                <span className="truncate">{item.title}</span>
                {item.key === 'messages' && totalUnreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {totalUnreadCount}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Action Button */}
      <SidebarFooter className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2 h-10 rounded-lg font-medium text-sm transition-colors duration-200">
          <Calendar className="w-4 h-4" />
          Schedule Session
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 