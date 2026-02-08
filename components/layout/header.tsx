"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Search, Settings, LogOut, SunMoon, MoreVertical, User, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RadialThemeToggle } from "@/components/providers/radial-theme-toggle"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SignInPopup } from "@/components/auth/sign-in-popup"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onSearchClick?: () => void
  showSidebarTrigger?: boolean
  isDashboard?: boolean
}

const NAV_LINKS = [
  { label: "How it works", href: "#" },
  { label: "Library", href: "#" },
  { label: "Pricing", href: "#" },
]

export function Header({ onSearchClick, showSidebarTrigger = false, isDashboard = false }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { signOut: authSignOut, isAuthenticated, isMentor: authIsMentor, isLoading, user } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [showSignInPopup, setShowSignInPopup] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isMentor = authIsMentor

  // Determine if we are on a dashboard page based on path or prop
  // Ideally this component should receive this as a prop but checking path as fallback
  const isDashboardPage = isDashboard || pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/mentee') || pathname.startsWith('/mentor');
  const isLanding = !isDashboardPage && pathname === "/";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleAuthClick = async () => {
    if (isAuthenticated) {
      try {
        await authSignOut()
        router.replace("/")
        router.refresh()
      } catch (error) {
        router.replace("/")
        router.refresh()
      }
    } else {
      setShowSignInPopup(true)
    }
  }

  const handleLogoClick = () => router.push("/")
  const handleGoToDashboard = () => router.push("/dashboard?section=dashboard")

  const headerClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
    ? "bg-background/80 backdrop-blur-xl shadow-subtle border-b border-border"
    : "bg-background/95 backdrop-blur-sm border-b border-transparent"
    }`

  const NavLinks = () => (
    <nav className="hidden lg:flex space-x-8">
      {NAV_LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {link.label}
        </a>
      ))}
    </nav>
  )

  const MobileNavLinks = () => (
    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
      {NAV_LINKS.map((link) => (
        <button
          key={link.label}
          className="text-left hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {link.label}
        </button>
      ))}
    </div>
  )

  const ThemeRow = () => (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SunMoon className="h-4 w-4" />
        <span>Theme</span>
      </div>
      <RadialThemeToggle />
    </div>
  )

  // MAIN SPLIT: LANDING VS DASHBOARD HEADER

  if (isLanding) {
    return (
      <>
        <header className={`${headerClasses} flex items-center justify-between gap-3 px-4 h-16 sm:h-20 sm:px-8 lg:px-12 xl:px-16`}>
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-8">
            <div
              className="text-lg sm:text-xl lg:text-2xl font-bold cursor-pointer hover:text-blue-500 transition-colors"
              onClick={handleLogoClick}
            >
              Sharing<span className="text-blue-500">Minds</span>
            </div>
            <NavLinks />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </>
            ) : isAuthenticated ? (
              <>
                <div className="hidden lg:flex items-center gap-2 sm:gap-3">
                  <Button variant="default" size="sm" className="font-semibold" onClick={handleGoToDashboard}>
                    Go to dashboard
                  </Button>
                  {!isMentor && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-semibold border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() => router.push("/become-expert")}
                    >
                      Become an Expert
                    </Button>
                  )}
                  <RadialThemeToggle />
                  <Button variant="outline" size="sm" onClick={handleAuthClick}>
                    Logout
                  </Button>
                </div>
                {/* Mobile Menu for Landing */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Button variant="default" size="sm" className="font-semibold" onClick={handleGoToDashboard}>
                    Go to dashboard
                  </Button>
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 sm:w-96">
                      <SheetHeader>
                        <SheetTitle>SharingMinds</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 flex flex-col gap-3">
                        <MobileNavLinks />
                        <div className="h-px w-full bg-border" />
                        <Button variant="default" onClick={() => { handleGoToDashboard(); setIsMobileMenuOpen(false) }}>
                          Go to dashboard
                        </Button>
                        {!isMentor && (
                          <Button variant="outline" onClick={() => { router.push("/become-expert"); setIsMobileMenuOpen(false) }}>
                            Become an Expert
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => { setIsMobileMenuOpen(false); handleAuthClick(); }}>
                          Logout
                        </Button>
                        <ThemeRow />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            ) : (
              <>
                <div className="hidden lg:flex items-center gap-2 sm:gap-3">
                  <RadialThemeToggle />
                  <Button
                    size="sm"
                    className="bg-amber-100 text-gray-900 hover:bg-amber-200 dark:bg-amber-200 dark:text-gray-900 dark:hover:bg-amber-300 px-4"
                    onClick={handleAuthClick}
                  >
                    Login / Sign Up
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => router.push("/become-expert")}
                  >
                    Become an Expert
                  </Button>
                </div>
                {/* Mobile Menu for Landing (Guest) */}
                <div className="flex items-center gap-2 lg:hidden">
                  <Button
                    size="sm"
                    className="bg-amber-100 text-gray-900 hover:bg-amber-200 dark:bg-amber-200 dark:text-gray-900 dark:hover:bg-amber-300 px-4"
                    onClick={handleAuthClick}
                  >
                    Login / Sign Up
                  </Button>
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 sm:w-96">
                      <SheetHeader>
                        <SheetTitle>SharingMinds</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 flex flex-col gap-3">
                        <MobileNavLinks />
                        <div className="h-px w-full bg-border" />
                        <Button variant="default" onClick={() => { handleAuthClick(); setIsMobileMenuOpen(false) }}>
                          Login / Sign Up
                        </Button>
                        <Button variant="outline" onClick={() => { router.push("/become-expert"); setIsMobileMenuOpen(false) }}>
                          Become an Expert
                        </Button>
                        <ThemeRow />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
        </header>

        <SignInPopup isOpen={showSignInPopup} onClose={() => setShowSignInPopup(false)} />
      </>
    )
  }

  // DASHBOARD HEADER (Inner Pages)
  return (
    <>
      <header className={`${headerClasses} flex items-center justify-between gap-3 px-4 h-16 sm:px-6`}>
        {/* Left Side: Sidebar Trigger & Logo */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          {showSidebarTrigger && <SidebarTrigger />}
          <div
            className="text-lg font-bold cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
            onClick={handleLogoClick}
          >
            Sharing<span className="text-blue-500">Minds</span>
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* Always Visible: Search (if enabled) & Notifications & Theme */}
          {onSearchClick && (
            <Button variant="ghost" size="icon" onClick={onSearchClick} className="h-9 w-9">
              <Search className="w-4 h-4" />
            </Button>
          )}

          <NotificationBell />

          <div className="hidden sm:inline-flex">
            <RadialThemeToggle />
          </div>
          {/* Mobile Theme Toggle (visible only on mobile) */}
          <div className="sm:hidden">
            <RadialThemeToggle />
          </div>


          {/* Desktop Only Actions */}
          <div className="hidden md:flex items-center gap-2">
            {!isMentor && (
              <Button
                variant="outline"
                size="sm"
                className="font-semibold border-green-500 text-green-600 hover:bg-green-50 ml-2"
                onClick={() => router.push('/become-expert')}
              >
                Become an Expert
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleAuthClick}>
              Logout
            </Button>
          </div>

          {/* Mobile Dropdown Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!isMentor && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/become-expert')} className="text-green-600 focus:text-green-700">
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Become an Expert</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAuthClick} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>
      </header>

      <SignInPopup isOpen={showSignInPopup} onClose={() => setShowSignInPopup(false)} />
    </>
  )
}
