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

interface MentorSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function MentorSidebar({ activeSection, onSectionChange }: MentorSidebarProps) {
  const { session, primaryRole, mentorProfile, isLoading } = useAuth()
  
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
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm mt-16">
      {/* Header with User Profile */}
      <SidebarHeader className="p-6">
        {/* Enlarged, centred profile card */}
        <Card className="p-3 flex flex-col items-center gap-2 text-center">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src={mentorProfile?.profileImageUrl || session?.user?.image || undefined} />
              <AvatarFallback className="text-lg">
                {mentorProfile?.fullName?.charAt(0) || session?.user?.name?.charAt(0) || 'M'}
              </AvatarFallback>
            </Avatar>
            {/* Online indicator */}
            <span className="absolute bottom-1 right-1 block h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
          </div>

          {/* Name & role */}
          <div className="space-y-0.5">
            <h3 className="text-base font-medium leading-none">
              {mentorProfile?.fullName || session?.user?.name || 'Mentor'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {mentorProfile?.title || (isLoading ? 'Loading...' : (primaryRole?.displayName || 'Mentor'))}
            </p>
          </div>

          <Separator className="w-full" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 w-full text-xs">
            <div className="space-y-0.5">
              <p className="text-lg font-semibold">5</p>
              <span className="text-muted-foreground">Mentees</span>
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-semibold">4.9</p>
              <span className="text-muted-foreground">Rating</span>
            </div>
          </div>
        </Card>
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