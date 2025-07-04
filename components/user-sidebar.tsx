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
import { Eye, Users, Video, Bookmark, Users2, Mail, Calendar, LayoutDashboard } from "lucide-react"

interface UserSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function UserSidebar({ activeSection, onSectionChange }: UserSidebarProps) {
  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      key: "dashboard"
    },
    {
      title: "Explore Mentors",
      icon: Users,
      key: "explore"
    },
    {
      title: "Saved Items",
      icon: Bookmark,
      key: "saved"
    },
    {
      title: "My Mentors",
      icon: Users2,
      key: "mentors"
    },
    {
      title: "Messages",
      icon: Mail,
      key: "messages"
    },
    {
      title: "Sessions",
      icon: Calendar,
      key: "sessions"
    }
  ]

  return (
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm">
      {/* User Profile Header */}
      <SidebarHeader className="p-4 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-800/30 dark:to-transparent">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-800/50">
          <div className="flex flex-col items-center text-center space-y-3">
            {/* User Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm">
                <AvatarImage src="/placeholder.svg?height=48&width=48" alt="John Doe" />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-medium text-sm">JD</AvatarFallback>
              </Avatar>
              {/* Online Status */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
            </div>
            
            {/* User Info */}
            <div className="space-y-0.5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">John Doe</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Computer Science Student
              </p>
            </div>

            {/* Stats */}
            <div className="w-full space-y-2 pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Eye className="w-3.5 h-3.5" />
                  Profile views
                </span>
                <span className="font-semibold text-blue-500 dark:text-blue-400">24</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Users className="w-3.5 h-3.5" />
                  Connections
                </span>
                <span className="font-semibold text-blue-500 dark:text-blue-400">156</span>
              </div>
            </div>

            {/* Growth Message */}
            <div className="w-full pt-2 border-t border-gray-200/50 dark:border-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-500 leading-tight">
                Connect with mentors and grow your network
              </p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-4 py-4 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-800/20">
        <SidebarMenu className="space-y-2">
          {menuItems.map((item) => (
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

      {/* Footer with Video Call Button */}
      <SidebarFooter className="p-4 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-800/30 dark:to-transparent">
        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2 h-12 rounded-2xl font-medium text-sm transition-all duration-150 ease-out shadow-sm hover:shadow-md ring-1 ring-blue-500/20 hover:ring-blue-600/20">
          <Video className="w-4 h-4" />
          Start Video Call
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 