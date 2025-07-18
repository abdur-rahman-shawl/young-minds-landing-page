"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth-client";
import { useUserRoles } from "@/hooks/use-user-roles";
import { LayoutDashboard, Users, GraduationCap, Settings } from "lucide-react";

interface AdminSidebarProps {
  active: string;
  onChange: (key: string) => void;
}

export function AdminSidebar({ active, onChange }: AdminSidebarProps) {
  const { data: session } = useSession();
  const { primaryRole, isLoading } = useUserRoles();

  const items = [
    { key: "dashboard", title: "Overview", icon: LayoutDashboard },
    { key: "mentors", title: "Mentors", icon: GraduationCap },
    { key: "mentees", title: "Mentees", icon: Users },
    { key: "settings", title: "Settings", icon: Settings },
  ];

  return (
    <Sidebar className="bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm mt-16">
      <SidebarHeader className="p-4 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-800/30 dark:to-transparent">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-800/50 text-center space-y-3">
          <div className="relative w-fit mx-auto">
            <Avatar className="w-14 h-14 ring-2 ring-white dark:ring-gray-800">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback>{session?.user?.name?.charAt(0) || "A"}</AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">
              {session?.user?.name || "Admin"}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isLoading ? "Loading..." : primaryRole?.displayName || "Admin"}
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-4 py-4 bg-gradient-to-b from-transparent to-gray-50/30 dark:to-gray-800/20">
        <SidebarMenu className="space-y-2">
          {items.map((it) => (
            <SidebarMenuItem key={it.key}>
              <SidebarMenuButton
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 ease-out ${
                  active === it.key
                    ? "bg-blue-500 text-white shadow-sm ring-1 ring-blue-500/20"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/20 hover:shadow-sm"
                }`}
                onClick={() => onChange(it.key)}
              >
                <it.icon className="w-4 h-4" />
                <span>{it.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
} 