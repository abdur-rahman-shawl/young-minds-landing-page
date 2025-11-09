// @ts-nocheck
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Header } from "@/components/layout/header"
import { UserSidebar } from "@/components/mentee/sidebars/user-sidebar"
import { MentorSidebar } from "@/components/mentor/sidebars/mentor-sidebar"
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
import { Dashboard } from "@/components/shared/dashboard/dashboard"
import { MentorOnlyDashboard } from "@/components/mentor/dashboard/mentor-only-dashboard"
import { ExploreMentors } from "@/components/shared/dashboard/explore"
import { SavedItems } from "@/components/mentee/dashboard/saved-items"
import { Mentors } from "@/components/shared/dashboard/mentors"
import { Messages } from "@/components/shared/dashboard/messages"
import { Sessions } from "@/components/shared/dashboard/sessions"
import { MentorDetailView } from "@/components/mentee/mentor-detail-view"
import { MenteeProfile } from "@/components/mentee/dashboard/mentee-profile"
import { MentorProfileEdit } from "@/components/mentor/dashboard/mentor-profile-edit"
import { MentorContent } from "@/components/mentor/content/content"
import { MentorBookingsCalendar } from "@/components/booking/mentor-bookings-calendar"
import { MentorAvailabilityManager } from "@/components/mentor/availability/mentor-availability-manager"
import { MentorMentees } from "@/components/mentor/dashboard/mentor-mentees"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard"
import { AdminSidebar } from "@/components/admin/sidebars/admin-sidebar"
import { AdminMentors } from "@/components/admin/dashboard/admin-mentors"
import { AdminMentees } from "@/components/admin/dashboard/admin-mentees"
import { AdminOverview } from "@/components/admin/dashboard/admin-overview"
import { AuthLoadingSkeleton } from "@/components/common/skeletons"
import { Courses } from "@/components/shared/dashboard/courses"
import { MyLearning } from "@/components/mentee/dashboard/my-learning"
import { MentorAnalyticsSection } from "@/components/mentor/dashboard/mentor-analytics-section"

function PageContent() {
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)
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
      setSelectedMentor(mentorFromUrl)
    }
  }, [searchParams, isAuthenticated, isLoading])

  // Show loading state while authentication is being checked
  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  const handleSectionChange = (section: string) => {
    console.log('🌟 MAIN PAGE handleSectionChange called with:', section);
    
    setActiveSection(section)
    setSelectedMentor(null)
    
    // Update URL without page refresh for all sections - everything stays inline now
    const newUrl = `/?section=${section}`
    router.push(newUrl, { scroll: false })
  }

  const handleMentorSelect = (mentorId: string) => {
    console.log('🚀 app/page.tsx handleMentorSelect called with:', mentorId)
    setActiveSection("mentor-detail")
    setSelectedMentor(mentorId)
    // Update URL without page refresh
    const newUrl = `/?section=mentor-detail&mentor=${mentorId}`
    console.log('🚀 app/page.tsx setting URL to:', newUrl)
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
        case "mentees":
          return (
            <div className="p-8">
              <div className="max-w-7xl mx-auto">
                <MentorMentees />
              </div>
            </div>
          )
        case "schedule":
          return (
            <div className="p-8">
              <div className="max-w-7xl mx-auto">
                <MentorBookingsCalendar />
              </div>
            </div>
          )
        case "availability":
          return (
            <div className="p-8">
              <div className="max-w-6xl mx-auto">
                <MentorAvailabilityManager />
              </div>
            </div>
          )
        case "explore":
          return <ExploreMentors onMentorSelect={handleMentorSelect} />
        case "saved":
          return <SavedItems onMentorSelect={handleMentorSelect} />
        case "mentors":
          return <Mentors onMentorSelect={handleMentorSelect} />
        case "courses":
          return <Courses />
        case "my-courses":
          return <MyLearning />
        case "messages":
          return <Messages />
        case "sessions":
          return <div className="h-full flex flex-col flex-1"><Sessions /></div>
        case "mentor-detail":
          return (
            <MentorDetailView
              mentorId={selectedMentor}
              onBack={() => {
                setActiveSection("explore")
                setSelectedMentor(null)
                router.push("/?section=explore", { scroll: false })
              }}
            />
          )
        case "content":
          return <MentorContent />
        case "analytics":
          return <MentorAnalyticsSection />
        case "profile":
          return isMentor ? <MentorProfileEdit /> : <MenteeProfile />
        default:
          return <MentorOnlyDashboard user={session?.user} />
      }
    }

    switch (activeSection) {
      case "dashboard":
        return <Dashboard onMentorSelect={handleMentorSelect} onSectionChange={handleSectionChange} />
      case "explore":
        return <ExploreMentors onMentorSelect={handleMentorSelect} />
      case "saved":
        return <SavedItems onMentorSelect={handleMentorSelect} />
      case "mentors":
        return <Mentors onMentorSelect={handleMentorSelect} />
      case "courses":
        return <Courses />
      case "my-courses":
        return <MyLearning />
      case "messages":
        return <Messages />
      case "sessions":
        return <div className="h-full flex flex-col flex-1"><Sessions /></div>
      case "mentor-detail":
        return (
          <MentorDetailView
            mentorId={selectedMentor}
            onBack={() => {
              setActiveSection("explore")
              setSelectedMentor(null)
              router.push("/?section=explore", { scroll: false })
            }}
          />
        )
      case "profile":
        return <MenteeProfile />
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
            <Header onSearchClick={() => handleSectionChange("explore")} />
            <main className="flex-1 pt-24 px-4 pb-4 flex flex-col">
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
      <Header />
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
