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
    <Sidebar>
      {/* User Profile Header */}
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* User Avatar */}
          <div className="relative">
            <Avatar className="h-16 w-16">
              <AvatarImage src="/placeholder.svg?height=64&width=64" alt="John Doe" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            {/* Online Status */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background"></div>
          </div>
          
          {/* User Info */}
          <div className="space-y-1">
            <h3 className="font-semibold text-sidebar-foreground text-lg">John Doe</h3>
            <p className="text-sm text-sidebar-foreground/70 leading-relaxed">
              Computer Science Student | Aspiring Developer
            </p>
          </div>

          {/* Stats */}
          <div className="w-full space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-sidebar-foreground/70">
                <Eye className="w-4 h-4" />
                Profile views
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">24</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-sidebar-foreground/70">
                <Users className="w-4 h-4" />
                Connections
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">156</span>
            </div>
          </div>

          {/* Growth Message */}
          <div className="w-full pt-2 border-t border-sidebar-border/50">
            <p className="text-xs text-sidebar-foreground/50">
              Connect with mentors and grow your network
            </p>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton 
                onClick={() => onSectionChange(item.key)}
                className={`flex items-center gap-3 ${
                  activeSection === item.key 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : ''
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Video Call Button */}
      <SidebarFooter className="p-4">
        <Button className="w-full bg-green-500 hover:bg-green-600 text-white gap-2 h-10">
          <Video className="w-4 h-4" />
          Start Video Call
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 