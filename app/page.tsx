"use client"

import { useState, useEffect } from "react"
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

export default function Page() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    setIsLoggedIn(loggedIn)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <main className="flex">
        {/* Left Sidebar - User Dashboard (only show when logged in) */}
        {isLoggedIn && (
          <div className="hidden lg:block lg:w-80 xl:w-96 flex-shrink-0">
            <UserSidebar />
          </div>
        )}

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
