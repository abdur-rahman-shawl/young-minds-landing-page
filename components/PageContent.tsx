'use client'

import { useMemo } from "react"
import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/landing/hero-section"
import { StatsSection } from "@/components/landing/stats-section"
import { MentorSection } from "@/components/landing/mentor-section"
import { VideoCallSection } from "@/components/landing/video-call-section"
import { ChatSection } from "@/components/landing/chat-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { CollabExpertsSection } from "@/components/landing/collab-experts-section"
import { CaseStudySection } from "@/components/landing/case-study-section"
import { CTASection } from "@/components/landing/cta-section"
import { ServicesGrid } from "@/components/landing/services-grid"
import { FooterSection } from "@/components/landing/footer-section"
import { useAuth } from "@/contexts/auth-context"
import { AuthLoadingSkeleton } from "@/components/common/skeletons"
import { DashboardExperience } from "@/components/dashboard/dashboard-experience"

function LandingContent() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <MentorSection />
        <VideoCallSection />
        <TestimonialsSection />
        <CollabExpertsSection />
        <CaseStudySection />
        <CTASection />
        <FooterSection />
      </main>
    </div>
  )
}


export function PageContent() {
  const {
    isAuthenticated,
    isLoading,
  } = useAuth()
  const scopeByAudience = useMemo(
    () => ({
      admin: 'dashboard',
      mentor: 'dashboard',
      mentee: 'root',
    } as const),
    []
  )

  if (isLoading) {
    return <AuthLoadingSkeleton />
  }

  if (isAuthenticated) {
    return (
      <DashboardExperience
        routeBasePath="/"
        shellBackgroundClassName="bg-gray-50 dark:bg-gray-900"
        scopeByAudience={scopeByAudience}
      />
    )
  }

  return <LandingContent />
}
