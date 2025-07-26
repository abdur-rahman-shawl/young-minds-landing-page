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
  /* Video,
  Eye */
} from "lucide-react"
import { useSession } from "@/lib/auth-client"
import { useUserRoles } from "@/hooks/use-user-roles"

interface MentorSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function MentorSidebar({ activeSection, onSectionChange }: MentorSidebarProps) {
  const { data: session } = useSession()
  const { primaryRole, mentorProfile, isLoading: rolesLoading } = useUserRoles()
  
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
    <Sidebar className="bg-[#FFFFFF] border-r border-[#E6E6E6] mt-14">
      {/* Header with User Profile */}
      <SidebarHeader className="p-6 bg-[#FFFFFF] border-b border-[#E6E6E6]">
        <div className="bg-[#FFFFFF] rounded-lg p-6 shadow-sm border border-[#E6E6E6]">
          <div className="space-y-4">
            {/* User Avatar and Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-white shadow-md">
                  <AvatarImage src={mentorProfile?.profileImageUrl || session?.user?.image || undefined} />
                  <AvatarFallback className="bg-[#CCCCCC] text-white font-medium text-sm">
                    {mentorProfile?.fullName?.charAt(0) || session?.user?.name?.charAt(0) || 'M'}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
              </div>
              
              {/* User Info */}
              <div className="space-y-0.5">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                  {mentorProfile?.fullName || session?.user?.name || 'Mentor'}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {mentorProfile?.title || (rolesLoading ? 'Loading...' : (primaryRole?.displayName || 'Mentor'))}
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="w-full space-y-2 pt-2 border-t border-[#E6E6E6]">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  Active Mentees
                </span>
                <span className="font-semibold text-[#0A66C2]">5</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Star className="w-3.5 h-3.5" />
                  Rating
                </span>
                <span className="font-semibold text-[#0A66C2]">4.9</span>
              </div>
            </div>

            {/* Growth Message */}
            <div className="w-full pt-2 border-t border-[#E6E6E6]">
              <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight">
                Help mentees achieve their goals and grow
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-4 py-4 bg-[#FFFFFF]">
        <SidebarMenu className="space-y-2">
          {mentorMenuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton 
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ease-out ${
                  activeSection === item.key 
                    ? 'bg-[#0A66C2] text-white shadow-sm' 
                    : 'text-[#666666] hover:text-[#0A66C2] hover:bg-[#F3F2EF] hover:shadow-sm'
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
      <SidebarFooter className="p-4 bg-[#FFFFFF] border-t border-[#E6E6E6]">
        <Button className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white gap-2 py-2 rounded-full font-semibold text-sm transition-all duration-150 ease-out shadow-sm hover:shadow-md border border-[#0A66C2]">
          <Calendar className="w-4 h-4" />
          Schedule Session
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 