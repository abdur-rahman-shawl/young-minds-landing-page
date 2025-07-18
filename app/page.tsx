"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { Header } from "@/components/header"
import { UserSidebar } from "@/components/user-sidebar"
import { MentorSidebar } from "@/components/mentor-sidebar"
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


// Dashboard components
import { Dashboard } from "@/components/dashboard/dashboard"
import { MentorOnlyDashboard } from "@/components/dashboard/mentor-only-dashboard"
import { ExploreMentors } from "@/components/dashboard/explore"
import { SavedItems } from "@/components/dashboard/saved-items"
import { Mentors } from "@/components/dashboard/mentors"
import { Messages } from "@/components/dashboard/messages"
import { Sessions } from "@/components/dashboard/sessions"
import { Profile } from "@/components/dashboard/profile"
import { useUserRoles } from "@/hooks/use-user-roles"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminMentors } from "@/components/dashboard/admin-mentors"
import { AdminMentees } from "@/components/dashboard/admin-mentees"
import { AdminOverview } from "@/components/dashboard/admin-overview"

function PageContent() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()
  const { roles } = useUserRoles()

  useEffect(() => {
    // Wait for session to be fully loaded
    if (!isPending) {
      const sessionIsLoggedIn = Boolean(session?.user)
      setIsLoggedIn(sessionIsLoggedIn)
      setIsSessionLoaded(true)

    // Get section and mentor from URL on page load
      if (sessionIsLoggedIn) {
        const sectionFromUrl = searchParams.get("section") || "dashboard"
      const mentorFromUrl = searchParams.get("mentor")
      setActiveSection(sectionFromUrl)
      setSelectedMentor(mentorFromUrl ? parseInt(mentorFromUrl) : null)
    }
    }
  }, [searchParams, session, isPending])

  // Show loading state while session is being checked
  if (isPending || !isSessionLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setSelectedMentor(null)
    // Update URL without page refresh
    const newUrl = `/?section=${section}`
    router.push(newUrl, { scroll: false })
  }

  const handleMentorSelect = (mentorId: number) => {
    setActiveSection("explore")
    setSelectedMentor(mentorId)
    // Update URL without page refresh
    const newUrl = `/?section=explore&mentor=${mentorId}`
    router.push(newUrl, { scroll: false })
  }

  const renderDashboardContent = () => {
    // Check if user is mentor-only (has mentor role but not mentee role)
    const isMentorOnly = roles.some(role => role.name === 'mentor') && 
                          !roles.some(role => role.name === 'mentee')

    const isAdmin = roles.some(r=>r.name==='admin');
    if(isAdmin){
      switch(activeSection){
        case 'mentors': return <AdminMentors />;
        case 'mentees': return <AdminMentees />;
        default: return <AdminOverview />;
      }
    }

    if (isMentorOnly) {
      return <MentorOnlyDashboard user={session?.user} />
    }

    switch (activeSection) {
      case "dashboard":
        return <Dashboard onMentorSelect={handleMentorSelect} />
      case "explore":
        return <ExploreMentors onMentorSelect={handleMentorSelect} />
      case "saved":
        return <SavedItems onMentorSelect={handleMentorSelect} />
      case "mentors":
        return <Mentors onMentorSelect={handleMentorSelect} />
      case "messages":
        return <Messages />
      case "sessions":
        return <Sessions />
      case "profile":
        return <Profile />
      default:
        return <Dashboard onMentorSelect={handleMentorSelect} />
    }
  }

  const renderLoggedInContent = () => {
    if (activeSection === "home") {
      // Show landing page content
      return (
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
      )
    } else {
      // Show dashboard content for other sections
      return renderDashboardContent()
    }
  }

  if (isLoggedIn) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex w-full">
          {/* Conditional Sidebar based on user role */}
          {roles.some(r=>r.name==='admin') ? (
            <AdminSidebar active={activeSection} onChange={handleSectionChange} />
          ) : roles.some(role => role.name === 'mentor') && !roles.some(role => role.name === 'mentee') ? (
            <MentorSidebar 
              activeSection={activeSection} 
              onSectionChange={handleSectionChange} 
            />
          ) : (
            <UserSidebar 
              activeSection={activeSection} 
              onSectionChange={handleSectionChange} 
            />
          )}
          
          {/* Main Content Area */}
          <SidebarInset className="flex-1">
            <Header 
              isLoggedIn={isLoggedIn} 
              setIsLoggedIn={setIsLoggedIn}
            />
            <main className="flex-1 pt-24 px-6 pb-6">
              {renderLoggedInContent()}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <main className="flex pt-24">
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

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  )
}
