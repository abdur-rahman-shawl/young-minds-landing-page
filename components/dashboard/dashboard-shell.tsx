"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Header } from "@/components/layout/header"
import { UserSidebar } from "@/components/mentee/sidebars/user-sidebar"
import { MentorSidebar } from "@/components/mentor/sidebars/mentor-sidebar"
import { AdminSidebar } from "@/components/admin/sidebars/admin-sidebar"
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
import { MentorMentees } from "@/components/mentor/dashboard/mentor-mentees"
import { Courses } from "@/components/shared/dashboard/courses"
import { MyLearning } from "@/components/mentee/dashboard/my-learning"
import { AdminMentors } from "@/components/admin/dashboard/admin-mentors"
import { AdminMentees } from "@/components/admin/dashboard/admin-mentees"
import { AdminOverview } from "@/components/admin/dashboard/admin-overview"
import { AdminEnquiries } from "@/components/admin/dashboard/admin-enquiries"
import { AuthLoadingSkeleton } from "@/components/common/skeletons"
import { useAuth } from "@/contexts/auth-context"
import { AlertTriangle } from "lucide-react"

// Lazy-load heavier dashboard widgets to reduce the initial bundle
const AdminAnalytics = dynamic(() => import("@/app/admins/analytics/page"), {
  ssr: false,
  loading: () => <div className="p-6 text-center">Loading analytics...</div>,
})

const MentorBookingsCalendar = dynamic(
  () =>
    import("@/components/booking/mentor-bookings-calendar").then(
      (mod) => mod.MentorBookingsCalendar
    ),
  { ssr: false, loading: () => <div className="p-6 text-center">Loading calendar...</div> }
)

const MentorAvailabilityManager = dynamic(
  () =>
    import("@/components/mentor/availability/mentor-availability-manager").then(
      (mod) => mod.MentorAvailabilityManager
    ),
  { ssr: false, loading: () => <div className="p-6 text-center">Loading availability...</div> }
)

const MentorAnalyticsSection = dynamic(
  () =>
    import("@/components/mentor/dashboard/mentor-analytics-section").then(
      (mod) => mod.MentorAnalyticsSection
    ),
  { ssr: false, loading: () => <div className="p-6 text-center">Loading analytics...</div> }
)

export function DashboardShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    session,
    isAuthenticated,
    isLoading,
    isAdmin,
    isMentor,
    isMentorWithIncompleteProfile,
  } = useAuth()

  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const sectionFromUrl = searchParams.get("section") || "dashboard"
      const mentorFromUrl = searchParams.get("mentor")
      setActiveSection(sectionFromUrl)
      setSelectedMentor(mentorFromUrl)
    }
  }, [searchParams, isAuthenticated, isLoading])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth?callbackUrl=/dashboard")
      router.refresh()
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return <AuthLoadingSkeleton />
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    setSelectedMentor(null)
    router.push(`/dashboard?section=${section}`, { scroll: false })
  }

  const handleMentorSelect = (mentorId: string) => {
    setActiveSection("mentor-detail")
    setSelectedMentor(mentorId)
    router.push(`/dashboard?section=mentor-detail&mentor=${mentorId}`, { scroll: false })
  }

  const renderDashboardContent = () => {
    if (isAdmin) {
      switch (activeSection) {
        case "mentors":
          return <AdminMentors />
        case "mentees":
          return <AdminMentees />
        case "analytics":
          return <AdminAnalytics />
        case "enquiries":
          return <AdminEnquiries />
        default:
          return <AdminOverview />
      }
    }

    if (isMentor) {
      switch (activeSection) {
        case "dashboard":
          return <MentorOnlyDashboard user={session?.user} />
        case "mentees":
          return (
            <div className="p-8">
              <div className="mx-auto max-w-7xl">
                <MentorMentees />
              </div>
            </div>
          )
        case "schedule":
          return (
            <div className="p-8">
              <div className="mx-auto max-w-7xl">
                <MentorBookingsCalendar />
              </div>
            </div>
          )
        case "availability":
          return (
            <div className="p-8">
              <div className="mx-auto max-w-6xl">
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
          return (
            <div className="flex h-full flex-1 flex-col">
              <Sessions />
            </div>
          )
        case "mentor-detail":
          return (
            <MentorDetailView
              mentorId={selectedMentor}
              onBack={() => {
                setActiveSection("explore")
                setSelectedMentor(null)
                router.push("/dashboard?section=explore", { scroll: false })
              }}
            />
          )
        case "content":
          return <MentorContent />
        case "analytics":
          return <MentorAnalyticsSection />
        case "profile":
          return <MentorProfileEdit />
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
        return (
          <div className="flex h-full flex-1 flex-col">
            <Sessions />
          </div>
        )
      case "mentor-detail":
        return (
          <MentorDetailView
            mentorId={selectedMentor}
            onBack={() => {
              setActiveSection("explore")
              setSelectedMentor(null)
              router.push("/dashboard?section=explore", { scroll: false })
            }}
          />
        )
      case "profile":
        return <MenteeProfile />
      default:
        return <Dashboard onMentorSelect={handleMentorSelect} onSectionChange={handleSectionChange} />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50 dark:bg-gray-900">
        {isAdmin ? (
          <AdminSidebar active={activeSection} onChange={handleSectionChange} />
        ) : isMentor ? (
          <MentorSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        ) : (
          <UserSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        )}

        <SidebarInset className="flex-1">
          <Header showSidebarTrigger onSearchClick={() => handleSectionChange("explore")} />
          <main className="flex flex-1 flex-col px-4 pb-4 pt-24">
            {isMentorWithIncompleteProfile && (
              <Alert className="mb-6 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Complete your mentor profile!</strong> Your application is in progress.
                  <button
                    onClick={() => router.push("/auth/mentor-verification")}
                    className="ml-2 underline hover:no-underline"
                  >
                    Complete now →
                  </button>
                </AlertDescription>
              </Alert>
            )}
            {renderDashboardContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export function DashboardShellWithSuspense() {
  return (
    <Suspense fallback={<AuthLoadingSkeleton />}>
      <DashboardShell />
    </Suspense>
  )
}
