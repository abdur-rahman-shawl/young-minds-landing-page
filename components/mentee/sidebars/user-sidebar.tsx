"use client"

import { motion } from "framer-motion"
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
import { Eye, Users, Video, Bookmark, Users2, Mail, Calendar, LayoutDashboard, Home, User, GraduationCap, BookOpen } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMessaging } from "@/hooks/use-messaging-v2"
import { Badge } from "@/components/ui/badge"

interface UserSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  userRole?: string
}

export function UserSidebar({ activeSection, onSectionChange, userRole }: UserSidebarProps) {
  const { session, primaryRole, isLoading } = useAuth()
  const { totalUnreadCount } = useMessaging(session?.user?.id)

  const menuItems = [
    {
      title: "Home",
      icon: Home,
      key: "home"
    },
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
      title: "Courses",
      icon: GraduationCap,
      key: "courses"
    },
    {
      title: "My Learning",
      icon: BookOpen,
      key: "my-courses"
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
    },
    {
      title: "Profile",
      icon: User,
      key: "profile"
    }
  ]

  const userName = session?.user?.name || 'User'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 mt-16">
      {/* User Profile Header */}
      <SidebarHeader className="p-3">
        <motion.div
          className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-gray-800 dark:via-gray-800 dark:to-indigo-950/20 p-4 shadow-sm border border-gray-200/80 dark:border-gray-700/60"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex flex-col space-y-3">
            {/* Avatar and User Info Row */}
            <div className="flex items-center gap-3.5">
              {/* Avatar Container */}
              <div className="relative flex-shrink-0">
                <Avatar className="h-14 w-14 ring-2 ring-white dark:ring-gray-700 shadow-md">
                  <AvatarImage src={session?.user?.image || undefined} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-base">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                {/* Pulsing Online Status */}
                <div className="absolute -bottom-0.5 -right-0.5">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-gray-700"></span>
                  </span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-[15px]">
                  {userName}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoading ? 'Loading...' : (primaryRole?.displayName || 'Mentee')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </SidebarHeader>

      {/* Navigation Menu */}
      <SidebarContent className="px-3 py-2">
        <SidebarMenu className="space-y-0.5">
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                onClick={() => {
                  console.log('Sidebar clicked:', item.key, 'onSectionChange exists:', !!onSectionChange);
                  onSectionChange(item.key);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeSection === item.key
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${activeSection === item.key ? 'text-blue-500' : ''
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

      {/* Footer with Video Call Button */}
      <SidebarFooter className="p-4 border-t border-gray-100 dark:border-gray-800">
        <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2 h-10 rounded-lg font-medium text-sm transition-colors duration-200">
          <Video className="w-4 h-4" />
          Start Video Call
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
} 