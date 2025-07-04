"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { Search, Bell, Settings } from "lucide-react"

interface HeaderProps {
  isLoggedIn: boolean
  setIsLoggedIn: (value: boolean) => void
  onSearchClick?: () => void
}

export function Header({ isLoggedIn, setIsLoggedIn, onSearchClick }: HeaderProps) {
  const router = useRouter()

  const handleAuthClick = () => {
    if (isLoggedIn) {
      localStorage.removeItem("isLoggedIn")
      localStorage.removeItem("userEmail")
      setIsLoggedIn(false)
    } else {
      router.push("/auth")
    }
  }

  if (isLoggedIn) {
    // Dashboard Header
    return (
      <header className="h-16 w-full flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="text-lg font-bold">
            Young<span className="text-blue-500">Minds</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={onSearchClick}>
            <Search className="w-4 h-4" />
            Search
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleAuthClick}>
            Logout
          </Button>
        </div>
      </header>
    )
  }

  // Landing Page Header
  return (
    <header className="h-24 w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 xl:px-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-8">
        <div className="text-xl lg:text-2xl font-bold cursor-pointer" onClick={() => router.push("/")}>
          Young<span className="text-blue-500">Minds</span>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Library
          </a>
          <a
            href="#"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Pricing
          </a>
        </nav>
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <Button variant="ghost" className="hidden sm:inline-flex h-10 px-6" onClick={handleAuthClick}>
          Sign Up
        </Button>
        <Button
          className="bg-amber-100 text-gray-900 hover:bg-amber-200 dark:bg-amber-200 dark:text-gray-900 dark:hover:bg-amber-300 h-10 px-6"
          onClick={handleAuthClick}
        >
          Login
        </Button>
      </div>
    </header>
  )
}
