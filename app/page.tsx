"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { UserSidebar } from "@/components/user-sidebar"
import { HeroSection } from "@/components/hero-section"
import { StatsSection } from "@/components/stats-section"
import { MentorSection } from "@/components/mentor-section"
import { VideoCallSection } from "@/components/video-call-section"
import { ChatSection } from "@/components/chat-section"
import { CollabExpertsSection } from "@/components/collab-experts-section"
import { CaseStudySection } from "@/components/case-study-section"
import { ServicesGrid } from "@/components/services-grid"
import { RightSidebar } from "@/components/right-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SearchModal } from "@/components/search-modal"

// Dashboard components
import { Dashboard } from "@/components/dashboard/dashboard"
import { SavedItems } from "@/components/dashboard/saved-items"
import { Mentors } from "@/components/dashboard/mentors"
import { Messages } from "@/components/dashboard/messages"
import { Sessions } from "@/components/dashboard/sessions"

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    setIsLoggedIn(loggedIn)

    // Get section from URL on page load
    if (loggedIn) {
      const sectionFromUrl = searchParams.get("section") || "dashboard"
      setActiveSection(sectionFromUrl)
    }
  }, [searchParams])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    // Update URL without page refresh
    const newUrl = `/?section=${section}`
    router.push(newUrl, { scroll: false })
  }

  const handleSearchClick = () => {
    setIsSearchOpen(true)
  }

  const handleSearchClose = () => {
    setIsSearchOpen(false)
  }

  const renderDashboardContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />
      case "saved":
        return <SavedItems />
      case "mentors":
        return <Mentors />
      case "messages":
        return <Messages />
      case "sessions":
        return <Sessions />
      default:
        return <Dashboard />
    }
  }

  if (isLoggedIn) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex w-full">
          {/* Shadcn Sidebar with User Profile */}
          <UserSidebar 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange} 
          />
          
          {/* Main Content Area */}
          <SidebarInset className="flex-1">
            <Header 
              isLoggedIn={isLoggedIn} 
              setIsLoggedIn={setIsLoggedIn}
              onSearchClick={handleSearchClick}
            />
            <main className="flex-1">
              {renderDashboardContent()}
            </main>
          </SidebarInset>
          
          {/* Search Modal */}
          <SearchModal 
            isOpen={isSearchOpen} 
            onClose={handleSearchClose} 
          />
        </div>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <main className="flex">
        {/* Main Content */}
        <div className="flex-1 min-w-0 max-w-6xl mx-auto">
          <HeroSection />
          <div className="px-6 sm:px-8 lg:px-12 xl:px-16">
            <StatsSection />
            <MentorSection />
            <VideoCallSection />
            <ChatSection />
            <CollabExpertsSection />
            <CaseStudySection />
            <ServicesGrid />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="hidden xl:block xl:w-80 flex-shrink-0">
          <RightSidebar />
        </div>
      </main>
    </div>
  )
}
