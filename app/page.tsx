// @ts-nocheck
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { UserSidebar } from "@/components/sidebars/user-sidebar"
import { MentorSidebar } from "@/components/sidebars/mentor-sidebar"
import { HeroSection } from "@/components/landing/hero-section"
import { StatsSection } from "@/components/landing/stats-section"
import { MentorSection } from "@/components/landing/mentor-section"
import { VideoCallSection } from "@/components/landing/video-call-section"
import { ChatSection } from "@/components/landing/chat-section"
import { CollabExpertsSection } from "@/components/landing/collab-experts-section"
import { CaseStudySection } from "@/components/landing/case-study-section"
import { ServicesGrid } from "@/components/landing/services-grid"
import { RightSidebar } from "@/components/layout/right-sidebar"
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
import { MentorProfileEdit } from "@/components/dashboard/mentor-profile-edit"
import { MentorContent } from "@/components/dashboard/mentor/content"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { AdminDashboard } from "@/components/dashboard/admin-dashboard"
import { AdminSidebar } from "@/components/sidebars/admin-sidebar"
import { AdminMentors } from "@/components/dashboard/admin-mentors"
import { AdminMentees } from "@/components/dashboard/admin-mentees"
import { AdminOverview } from "@/components/dashboard/admin-overview"
import { AuthLoadingSkeleton } from "@/components/common/skeletons"

function PageContent() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { 
    session, 
    isAuthenticated, 
    isLoading,
    roles, 
    isAdmin,
    isMentor,
    isMentee,
    isMentorWithIncompleteProfile 
  } = useAuth()

  useEffect(() => {
    // Get section and mentor from URL on page load
    if (isAuthenticated && !isLoading) {
      const sectionFromUrl = searchParams.get("section") || "dashboard"
      const mentorFromUrl = searchParams.get("mentor")
      setActiveSection(sectionFromUrl)
      setSelectedMentor(mentorFromUrl ? parseInt(mentorFromUrl) : null)
    }
  }, [searchParams, isAuthenticated, isLoading])

  // Show loading state while authentication is being checked
  if (isLoading) {
    return <AuthLoadingSkeleton />;
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
    // Admin dashboard
    if(isAdmin){
      switch(activeSection){
        case 'mentors': return <AdminMentors />;
        case 'mentees': return <AdminMentees />;
        default: return <AdminOverview />;
      }
    }

    // Mentor dashboard (regardless of whether they also have mentee role)
    if (isMentor) {
      switch (activeSection) {
        case "dashboard":
          return <MentorOnlyDashboard user={session?.user} />
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
        case "content":
          return <MentorContent />
        case "profile":
          return isMentor ? <MentorProfileEdit /> : <Profile />
        default:
          return <MentorOnlyDashboard user={session?.user} />
      }
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

  if (isAuthenticated) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex w-full">
          {/* Conditional Sidebar based on user role */}
          {isAdmin ? (
            <AdminSidebar active={activeSection} onChange={handleSectionChange} />
          ) : isMentor ? (
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
              isLoggedIn={isAuthenticated} 
              setIsLoggedIn={() => {}} // This will be handled by AuthContext
            />
            <main className="flex-1 pt-24 px-6 pb-6">
              {/* Incomplete Profile Alert */}
              {isMentorWithIncompleteProfile && (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Complete your mentor profile!</strong> Your application is in progress. 
                    <button 
                      onClick={() => router.push('/auth/mentor-verification')}
                      className="ml-2 underline hover:no-underline"
                    >
                      Complete now →
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              {renderLoggedInContent()}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isLoggedIn={isAuthenticated} setIsLoggedIn={() => {}} />
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
