'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

import { Header } from '@/components/layout/header';
import { HeroSection } from '@/components/landing/hero-section';
import { StatsSection } from '@/components/landing/stats-section';
import { MentorSection } from '@/components/landing/mentor-section';
import { VideoCallSection } from '@/components/landing/video-call-section';
import { ChatSection } from '@/components/landing/chat-section';
import { CollabExpertsSection } from '@/components/landing/collab-experts-section';
import { CaseStudySection } from '@/components/landing/case-study-section';
import { ServicesGrid } from '@/components/landing/services-grid';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserSidebar } from '@/components/mentee/sidebars/user-sidebar';
import { MentorSidebar } from '@/components/mentor/sidebars/mentor-sidebar';
import { AdminSidebar } from '@/components/admin/sidebars/admin-sidebar';
import { Dashboard } from '@/components/shared/dashboard/dashboard';
import { MentorOnlyDashboard } from '@/components/mentor/dashboard/mentor-only-dashboard';
import { ExploreMentors } from '@/components/shared/dashboard/explore';
import { SavedItems } from '@/components/mentee/dashboard/saved-items';
import { Mentors } from '@/components/shared/dashboard/mentors';
import { Messages } from '@/components/shared/dashboard/messages';
import { Sessions } from '@/components/shared/dashboard/sessions';
import { MentorDetailView } from '@/components/mentee/mentor-detail-view';
import { MenteeProfile } from '@/components/mentee/dashboard/mentee-profile';
import { MentorProfileEdit } from '@/components/mentor/dashboard/mentor-profile-edit';
import { MentorContent } from '@/components/mentor/content/content';
import { MentorMentees } from '@/components/mentor/dashboard/mentor-mentees';
import { Courses } from '@/components/shared/dashboard/courses';
import { MyLearning } from '@/components/mentee/dashboard/my-learning';
import { AdminMentors } from '@/components/admin/dashboard/admin-mentors';
import { AdminMentees } from '@/components/admin/dashboard/admin-mentees';
import { AdminOverview } from '@/components/admin/dashboard/admin-overview';
import { AdminEnquiries } from '@/components/admin/dashboard/admin-enquiries';
import { AdminSessions } from '@/components/admin/dashboard/admin-sessions';
import { AdminPolicies } from '@/components/admin/dashboard/admin-policies';
import { AdminSubscriptions } from '@/components/admin/dashboard/admin-subscriptions';
import { AdminContent } from '@/components/admin/dashboard/admin-content';
import { MentorSubscription } from '@/components/mentor/dashboard/mentor-subscription';
import { MentorReviewsSection } from '@/components/mentor/dashboard/mentor-reviews-section';
import { MenteeSubscription } from '@/components/mentee/dashboard/mentee-subscription';
import { AuthLoadingSkeleton } from '@/components/common/skeletons';
import { DashboardSectionFrame } from '@/components/dashboard/dashboard-section-frame';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  buildDashboardSectionUrl,
  resolveDashboardSection,
  type DashboardAudience,
  type DashboardNavigationScope,
  type DashboardRouteBasePath,
  type DashboardSectionKey,
} from '@/lib/dashboard/sections';
import {
  getDashboardShellClassNames,
  getDashboardShellMode,
} from '@/lib/dashboard/shell-mode';

const WidgetLoader = ({ text }: { text: string }) => (
  <div className='flex h-64 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50'>
    <div className='h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500' />
    <span className='mt-3 text-sm font-medium'>{text}</span>
  </div>
);

const AdminAnalytics = dynamic(() => import('@/app/admins/analytics/page'), {
  ssr: false,
  loading: () => <WidgetLoader text='Loading analytics...' />,
});

const MentorScheduleView = dynamic(
  () =>
    import('@/components/booking/mentor-schedule-view').then(
      (mod) => mod.MentorScheduleView
    ),
  { ssr: false, loading: () => <WidgetLoader text='Loading schedule...' /> }
);

const MentorAvailabilityManager = dynamic(
  () =>
    import('@/components/mentor/availability/mentor-availability-manager').then(
      (mod) => mod.MentorAvailabilityManager
    ),
  { ssr: false, loading: () => <WidgetLoader text='Loading availability...' /> }
);

const MentorAnalyticsSection = dynamic(
  () =>
    import('@/components/mentor/dashboard/mentor-analytics-section').then(
      (mod) => mod.MentorAnalyticsSection
    ),
  { ssr: false, loading: () => <WidgetLoader text='Loading analytics...' /> }
);

interface DashboardExperienceProps {
  routeBasePath: DashboardRouteBasePath;
  shellBackgroundClassName?: string;
  redirectUnauthenticatedTo?: string;
  scopeByAudience?: Partial<Record<DashboardAudience, DashboardNavigationScope>>;
}

const DEFAULT_SCOPE_BY_AUDIENCE: Record<
  DashboardAudience,
  DashboardNavigationScope
> = {
  admin: 'dashboard',
  mentor: 'dashboard',
  mentee: 'dashboard',
};

function DashboardHomeContent() {
  return (
    <div className='flex-1 min-w-0 w-full max-w-6xl mx-auto'>
      <HeroSection />
      <div className='px-6 sm:px-8 lg:px-12 xl:px-16'>
        <StatsSection />
        <MentorSection />
        <VideoCallSection />
        <ChatSection />
        <CollabExpertsSection />
        <CaseStudySection />
        <ServicesGrid />
      </div>
    </div>
  );
}

export function DashboardExperience({
  routeBasePath,
  shellBackgroundClassName = 'bg-slate-50/50 dark:bg-[#0B0D13]',
  redirectUnauthenticatedTo,
  scopeByAudience,
}: DashboardExperienceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    session,
    isAuthenticated,
    isLoading,
    isAdmin,
    isMentor,
    isMentorWithIncompleteProfile,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<DashboardSectionKey>('dashboard');
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [mentorSource, setMentorSource] = useState<string | null>(null);

  const currentAudience: DashboardAudience = isAdmin
    ? 'admin'
    : isMentor
      ? 'mentor'
      : 'mentee';
  const navigationScope =
    scopeByAudience?.[currentAudience] ?? DEFAULT_SCOPE_BY_AUDIENCE[currentAudience];
  const shellMode = getDashboardShellMode(activeSection);
  const shellClasses = getDashboardShellClassNames(shellMode);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const sectionFromUrl = resolveDashboardSection(
        searchParams.get('section'),
        currentAudience,
        navigationScope,
        'dashboard'
      );
      const mentorFromUrl = searchParams.get('mentor');
      setActiveSection(sectionFromUrl);
      setSelectedMentor(mentorFromUrl);
    }
  }, [searchParams, isAuthenticated, isLoading, currentAudience, navigationScope]);

  useEffect(() => {
    if (redirectUnauthenticatedTo && !isLoading && !isAuthenticated) {
      router.replace(redirectUnauthenticatedTo);
      router.refresh();
    }
  }, [isAuthenticated, isLoading, redirectUnauthenticatedTo, router]);

  const navigateToSection = (
    section: DashboardSectionKey,
    params?: Record<string, string | null | undefined>
  ) => {
    router.push(buildDashboardSectionUrl(routeBasePath, section, params), {
      scroll: false,
    });
  };

  const handleSectionChange = (section: string) => {
    const nextSection = resolveDashboardSection(
      section,
      currentAudience,
      navigationScope,
      'dashboard'
    );

    setActiveSection(nextSection);
    setSelectedMentor(null);
    setMentorSource(null);
    navigateToSection(nextSection);
  };

  const handleMentorSelect = (mentorId: string) => {
    setMentorSource(activeSection);
    setActiveSection('mentor-detail');
    setSelectedMentor(mentorId);
    navigateToSection('mentor-detail', {
      mentor: mentorId,
      from: activeSection === 'explore' ? 'explore' : null,
    });
  };

  const handleMentorBack = () => {
    setActiveSection('explore');
    setSelectedMentor(null);
    setMentorSource(null);
    navigateToSection('explore');
  };

  const handleSearchClick = () => {
    const searchSection = resolveDashboardSection(
      'explore',
      currentAudience,
      navigationScope,
      'dashboard'
    );
    handleSectionChange(searchSection);
  };

  const pageVariants = useMemo(
    () => ({
      initial: { opacity: 0, y: 10 },
      in: { opacity: 1, y: 0 },
      out: { opacity: 0, y: -10 },
    }),
    []
  );

  const pageTransition = useMemo(
    () => ({
      type: 'tween',
      ease: 'circOut',
      duration: 0.3,
    }),
    []
  );

  const renderDashboardContent = () => {
    if (activeSection === 'home') {
      return <DashboardHomeContent />;
    }

    if (isAdmin) {
      switch (activeSection) {
        case 'mentors':
          return <AdminMentors />;
        case 'mentees':
          return <AdminMentees />;
        case 'messages':
          return (
            <DashboardSectionFrame section={activeSection}>
              <Messages />
            </DashboardSectionFrame>
          );
        case 'sessions':
          return <AdminSessions />;
        case 'analytics':
          return <AdminAnalytics />;
        case 'enquiries':
          return <AdminEnquiries />;
        case 'subscriptions':
          return <AdminSubscriptions />;
        case 'content':
          return <AdminContent />;
        case 'settings':
          return <AdminPolicies />;
        default:
          return <AdminOverview />;
      }
    }

    if (isMentor) {
      switch (activeSection) {
        case 'dashboard':
          return <MentorOnlyDashboard user={session?.user} />;
        case 'mentees':
          return (
            <div className='p-4 md:p-8'>
              <div className='mx-auto max-w-7xl'>
                <MentorMentees />
              </div>
            </div>
          );
        case 'schedule':
          return (
            <div className='p-4 md:p-8'>
              <div className='mx-auto max-w-7xl'>
                <MentorScheduleView />
              </div>
            </div>
          );
        case 'availability':
          return (
            <div className='p-4 md:p-8'>
              <div className='mx-auto max-w-6xl'>
                <MentorAvailabilityManager />
              </div>
            </div>
          );
        case 'explore':
          return <ExploreMentors onMentorSelect={handleMentorSelect} />;
        case 'saved':
          return <SavedItems onMentorSelect={handleMentorSelect} />;
        case 'mentors':
          return <Mentors onMentorSelect={handleMentorSelect} />;
        case 'courses':
          return <Courses />;
        case 'my-courses':
          return <MyLearning />;
        case 'messages':
          return (
            <DashboardSectionFrame section={activeSection}>
              <Messages />
            </DashboardSectionFrame>
          );
        case 'sessions':
          return (
            <div className='flex h-full flex-1 flex-col'>
              <Sessions />
            </div>
          );
        case 'mentor-detail':
          return (
            <MentorDetailView
              mentorId={selectedMentor}
              bookingSource={mentorSource === 'explore' ? 'explore' : 'default'}
              onBack={handleMentorBack}
            />
          );
        case 'content':
          return <MentorContent />;
        case 'analytics':
          return <MentorAnalyticsSection />;
        case 'subscription':
          return (
            <div className='mx-auto w-full max-w-6xl'>
              <MentorSubscription />
            </div>
          );
        case 'reviews':
          return <MentorReviewsSection />;
        case 'profile':
          return <MentorProfileEdit />;
        default:
          return <MentorOnlyDashboard user={session?.user} />;
      }
    }

    switch (activeSection) {
      case 'dashboard':
        return (
          <Dashboard
            onMentorSelect={handleMentorSelect}
            onSectionChange={handleSectionChange}
          />
        );
      case 'explore':
        return <ExploreMentors onMentorSelect={handleMentorSelect} />;
      case 'saved':
        return <SavedItems onMentorSelect={handleMentorSelect} />;
      case 'mentors':
        return <Mentors onMentorSelect={handleMentorSelect} />;
      case 'courses':
        return <Courses />;
      case 'my-courses':
        return <MyLearning />;
      case 'messages':
        return (
          <DashboardSectionFrame section={activeSection}>
            <Messages />
          </DashboardSectionFrame>
        );
      case 'sessions':
        return (
          <div className='flex h-full flex-1 flex-col'>
            <Sessions />
          </div>
        );
      case 'mentor-detail':
        return (
          <MentorDetailView
            mentorId={selectedMentor}
            bookingSource={mentorSource === 'explore' ? 'explore' : 'default'}
            onBack={handleMentorBack}
          />
        );
      case 'profile':
        return <MenteeProfile />;
      case 'subscription':
        return (
          <div className='mx-auto w-full max-w-6xl'>
            <MenteeSubscription />
          </div>
        );
      default:
        return (
          <Dashboard
            onMentorSelect={handleMentorSelect}
            onSectionChange={handleSectionChange}
          />
        );
    }
  };

  if (isLoading || !isAuthenticated) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <SidebarProvider>
      <div
        className={cn('flex w-full', shellBackgroundClassName, shellClasses.shell)}
      >
        {isAdmin ? (
          <AdminSidebar
            active={activeSection}
            onChange={handleSectionChange}
            navigationScope={navigationScope}
          />
        ) : isMentor ? (
          <MentorSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            navigationScope={navigationScope}
          />
        ) : (
          <UserSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            navigationScope={navigationScope}
          />
        )}

        <SidebarInset
          className={cn(
            'relative flex flex-1 flex-col overflow-hidden',
            shellClasses.inset
          )}
        >
          <Header showSidebarTrigger onSearchClick={handleSearchClick} />

          <main
            className={cn(
              'flex min-h-0 flex-1 flex-col px-4 pb-6 pt-20 md:px-6 md:pt-24 lg:px-8',
              shellClasses.main
            )}
          >
            <AnimatePresence mode='wait'>
              {isMentorWithIncompleteProfile && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='mb-8'
                >
                  <Alert className='relative overflow-hidden border-amber-200 bg-amber-50/80 backdrop-blur-sm dark:border-amber-900/50 dark:bg-amber-900/20'>
                    <div className='absolute inset-y-0 left-0 w-1 bg-amber-500' />
                    <AlertTriangle className='h-5 w-5 text-amber-600' />
                    <AlertDescription className='ml-2 text-amber-900 dark:text-amber-100'>
                      <span className='font-semibold'>Action Required:</span>{' '}
                      Complete your mentor profile to start accepting bookings.
                      <button
                        onClick={() => router.push('/auth/mentor-verification')}
                        className='group ml-3 inline-flex items-center font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300'
                      >
                        Complete now
                        <span className='ml-1 transition-transform group-hover:translate-x-1'>
                          →
                        </span>
                      </button>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode='wait'>
              <motion.div
                key={activeSection + (selectedMentor || '')}
                initial='initial'
                animate='in'
                exit='out'
                variants={pageVariants}
                transition={pageTransition}
                className={cn('flex h-full flex-1 flex-col', shellClasses.content)}
              >
                {renderDashboardContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
