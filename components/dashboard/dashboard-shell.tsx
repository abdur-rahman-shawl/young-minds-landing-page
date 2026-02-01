"use client"

import { useEffect, useState, Suspense } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion" // Import for animations
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
import { AlertTriangle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// --- UI Components for smoother loading ---
const WidgetLoader = ({ text }: { text: string }) => (
  <div className="flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
    <span className="mt-3 text-sm font-medium">{text}</span>
  </div>
)

// Lazy-load heavier dashboard widgets
const AdminAnalytics = dynamic(() => import("@/app/admins/analytics/page"), {
  ssr: false,
  loading: () => <WidgetLoader text="Loading analytics..." />,
})

const MentorScheduleView = dynamic(
  () =>
    import("@/components/booking/mentor-schedule-view").then(
      (mod) => mod.MentorScheduleView
    ),
  { ssr: false, loading: () => <WidgetLoader text="Loading schedule..." /> }
)

const MentorAvailabilityManager = dynamic(
  () =>
    import("@/components/mentor/availability/mentor-availability-manager").then(
      (mod) => mod.MentorAvailabilityManager
    ),
  { ssr: false, loading: () => <WidgetLoader text="Loading availability..." /> }
)

const MentorAnalyticsSection = dynamic(
  () =>
    import("@/components/mentor/dashboard/mentor-analytics-section").then(
      (mod) => mod.MentorAnalyticsSection
    ),
  { ssr: false, loading: () => <WidgetLoader text="Loading analytics..." /> }
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

  // --- Animation Configuration ---
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 },
  }

  const pageTransition = {
    type: "tween",
    ease: "circOut",
    duration: 0.3,
  }

  const renderDashboardContent = () => {
    let content

    if (isAdmin) {
      switch (activeSection) {
        case "mentors":
          content = <AdminMentors />
          break
        case "mentees":
          content = <AdminMentees />
          break
        case "analytics":
          content = <AdminAnalytics />
          break
        case "enquiries":
          content = <AdminEnquiries />
          break
        default:
          content = <AdminOverview />
      }
    } else if (isMentor) {
      switch (activeSection) {
        case "dashboard":
          content = <MentorOnlyDashboard user={session?.user} />
          break
        case "mentees":
          content = (
            <div className="p-4 md:p-8">
              <div className="mx-auto max-w-7xl">
                <MentorMentees />
              </div>
            </div>
          )
          break
        case "schedule":
          content = (
            <div className="p-4 md:p-8">
              <div className="mx-auto max-w-7xl">
                <MentorScheduleView />
              </div>
            </div>
          )
          break
        case "availability":
          content = (
            <div className="p-4 md:p-8">
              <div className="mx-auto max-w-6xl">
                <MentorAvailabilityManager />
              </div>
            </div>
          )
          break
        case "explore":
          content = <ExploreMentors onMentorSelect={handleMentorSelect} />
          break
        case "saved":
          content = <SavedItems onMentorSelect={handleMentorSelect} />
          break
        case "mentors":
          content = <Mentors onMentorSelect={handleMentorSelect} />
          break
        case "courses":
          content = <Courses />
          break
        case "my-courses":
          content = <MyLearning />
          break
        case "messages":
          content = <Messages />
          break
        case "sessions":
          content = (
            <div className="flex h-full flex-1 flex-col">
              <Sessions />
            </div>
          )
          break
        case "mentor-detail":
          content = (
            <MentorDetailView
              mentorId={selectedMentor}
              onBack={() => {
                setActiveSection("explore")
                setSelectedMentor(null)
                router.push("/dashboard?section=explore", { scroll: false })
              }}
            />
          )
          break
        case "content":
          content = <MentorContent />
          break
        case "analytics":
          content = <MentorAnalyticsSection />
          break
        case "profile":
          content = <MentorProfileEdit />
          break
        default:
          content = <MentorOnlyDashboard user={session?.user} />
      }
    } else {
      switch (activeSection) {
        case "dashboard":
          content = (
            <Dashboard
              onMentorSelect={handleMentorSelect}
              onSectionChange={handleSectionChange}
            />
          )
          break
        case "explore":
          content = <ExploreMentors onMentorSelect={handleMentorSelect} />
          break
        case "saved":
          content = <SavedItems onMentorSelect={handleMentorSelect} />
          break
        case "mentors":
          content = <Mentors onMentorSelect={handleMentorSelect} />
          break
        case "courses":
          content = <Courses />
          break
        case "my-courses":
          content = <MyLearning />
          break
        case "messages":
          content = <Messages />
          break
        case "sessions":
          content = (
            <div className="flex h-full flex-1 flex-col">
              <Sessions />
            </div>
          )
          break
        case "mentor-detail":
          content = (
            <MentorDetailView
              mentorId={selectedMentor}
              onBack={() => {
                setActiveSection("explore")
                setSelectedMentor(null)
                router.push("/dashboard?section=explore", { scroll: false })
              }}
            />
          )
          break
        case "profile":
          content = <MenteeProfile />
          break
        default:
          content = (
            <Dashboard
              onMentorSelect={handleMentorSelect}
              onSectionChange={handleSectionChange}
            />
          )
      }
    }

    return (
      <motion.div
        key={activeSection + (selectedMentor || "")}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="flex h-full flex-1 flex-col"
      >
        {content}
      </motion.div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-[#0B0D13]">
        {isAdmin ? (
          <AdminSidebar active={activeSection} onChange={handleSectionChange} />
        ) : isMentor ? (
          <MentorSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        ) : (
          <UserSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        )}

        <SidebarInset className="relative flex flex-1 flex-col overflow-hidden">
          <Header showSidebarTrigger onSearchClick={() => handleSectionChange("explore")} />

          <main className="flex flex-1 flex-col px-4 pb-6 pt-20 md:px-6 md:pt-24 lg:px-8">
            <AnimatePresence mode="wait">
              {isMentorWithIncompleteProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8"
                >
                  <Alert className="relative overflow-hidden border-amber-200 bg-amber-50/80 backdrop-blur-sm dark:border-amber-900/50 dark:bg-amber-900/20">
                    <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertDescription className="ml-2 text-amber-900 dark:text-amber-100">
                      <span className="font-semibold">Action Required:</span> Complete your mentor
                      profile to start accepting bookings.
                      <button
                        onClick={() => router.push("/auth/mentor-verification")}
                        className="group ml-3 inline-flex items-center font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                      >
                        Complete now
                        <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                      </button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {renderDashboardContent()}
            </AnimatePresence>
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