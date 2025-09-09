"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/providers/theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { Search, Bell, Settings } from "lucide-react"
import { useState, useEffect } from "react"
// Use centralized auth context for logout and auth state
import { SignInPopup } from "@/components/auth/sign-in-popup"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/contexts/auth-context"

interface HeaderProps {
  onSearchClick?: () => void
}

export function Header({ onSearchClick }: HeaderProps) {
  const router = useRouter()
  const { roles, signOut: authSignOut, isAuthenticated } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showSignInPopup, setShowSignInPopup] = useState(false)
  
  // Check if user is already a mentor
  const isMentor = roles.some(role => role.name === 'mentor')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAuthClick = async () => {
    if (isAuthenticated) {
      try {
        // Use AuthContext signOut to clear session and caches
        await authSignOut()
        // Navigate to landing and refresh app/router state
        router.replace("/")
        router.refresh()
      } catch (error) {
        console.error("Logout error:", error)
        // Fallback: just update state and redirect
        router.replace("/")
        router.refresh()
      }
    } else {
      setShowSignInPopup(true)
    }
  }

  const handleLogoClick = () => {
    router.push("/")
  }

  const headerClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled 
      ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm' 
      : 'bg-white dark:bg-gray-900'
  } border-b border-gray-200 dark:border-gray-800`

  return (
    <>
      {isAuthenticated ? (
        // Dashboard Header
        <header className={`${headerClasses} h-16 flex items-center justify-between px-6`}>
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <div 
              className="text-lg font-bold cursor-pointer transition-colors"
              onClick={handleLogoClick}
            >
              Sharing<span className="text-blue-500">Minds</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {!isMentor && (
              <Button
                variant="outline"
                className="font-semibold border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => router.push('/become-expert')}
              >
                Become an Expert
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onSearchClick}>
              <Search className="w-4 h-4" />
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleAuthClick}>
              Logout
            </Button>
          </div>
        </header>
      ) : (
        // Landing Page Header
        <header className={`${headerClasses} h-24 flex items-center justify-between px-6 sm:px-8 lg:px-12 xl:px-16`}>
          <div className="flex items-center space-x-8">
            <div 
              className="text-xl lg:text-2xl font-bold cursor-pointer hover:text-blue-500 transition-colors" 
              onClick={handleLogoClick}
            >
              Sharing<span className="text-blue-500">Minds</span>
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
            <Button
              variant="outline"
              className="font-semibold border-green-500 text-green-600 hover:bg-green-50"
              onClick={() => router.push('/become-expert')}
            >
              Become an Expert
            </Button>
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
      )}

      {/* Sign In Popup */}
      <SignInPopup 
        isOpen={showSignInPopup} 
        onClose={() => setShowSignInPopup(false)} 
      />
    </>
  )
}
