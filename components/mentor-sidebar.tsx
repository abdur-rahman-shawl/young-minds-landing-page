"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
  Video,
  Eye
} from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { useUserRoles } from "@/hooks/use-user-roles"

interface MentorSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function MentorSidebar({ activeSection, onSectionChange }: MentorSidebarProps) {
  const { data: session } = useSession()
  const { primaryRole, isLoading: rolesLoading } = useUserRoles()
  
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
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm mt-16">
      {/* Header with User Profile */}
      <SidebarHeader className="p-6 bg-white dark:bg-gray-900 border-b border-gray-200/60 dark:border-gray-800/60">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm ring-1 ring-gray-200/80 dark:ring-gray-700/40 border border-gray-100 dark:border-gray-700/50">
          <div className="space-y-4">
            {/* User Avatar and Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-white dark:ring-gray-800 shadow-md">
                  <AvatarImage src={session?.user?.image || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium text-sm">
                    {session?.user?.name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
              </div>
              
              {/* User Info */}
              <div className="space-y-0.5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                  {session?.user?.name || 'Mentor'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {rolesLoading ? 'Loading...' : (primaryRole?.displayName || 'Mentor')}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="w-full space-y-2 pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  Active Mentees
                </span>
                <span className="font-semibold text-blue-500 dark:text-blue-400">5</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Star className="w-3.5 h-3.5" />
                  Rating
                </span>
                <span className="font-semibold text-blue-500 dark:text-blue-400">4.9</span>
              </div>
            </div>

            {/* Growth Message */}
            <div className="w-full pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight">
                Help mentees achieve their goals and grow
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-4 py-4 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-800/20">
        <SidebarMenu className="space-y-2">
          {mentorMenuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton 
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 ease-out ${
                  activeSection === item.key 
                    ? 'bg-blue-500 text-white shadow-sm ring-1 ring-blue-500/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/20 hover:shadow-sm'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Action Button */}
      <SidebarFooter className="p-4 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-800/30 dark:to-transparent">
        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2 h-12 rounded-2xl font-medium text-sm transition-all duration-150 ease-out shadow-sm hover:shadow-md ring-1 ring-blue-500/20 hover:ring-blue-600/20">
          <Calendar className="w-4 h-4" />
          Schedule Session
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 