"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MentorAvailabilityManager } from '@/components/mentor/availability/mentor-availability-manager';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

const DynamicMentorSidebar = dynamic(() => import('@/components/mentor/sidebars/mentor-sidebar').then(mod => mod.MentorSidebar), {
  ssr: false,
  loading: () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
});


export default function MentorAvailabilityPage() {
  const { session, mentorProfile, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && mounted) {
      // Redirect if not authenticated
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      // Check if user is a mentor
      if (!mentorProfile) {
        router.push('/become-expert');
        return;
      }
    }
  }, [session, mentorProfile, isLoading, router, mounted]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <SidebarProvider defaultOpen={false}>
          <div className="flex min-h-screen w-full">
            <DynamicMentorSidebar
              activeSection="availability"
              onSectionChange={() => {}}
            />
            <SidebarInset className="flex flex-col flex-1">
              <Header />
              <main className="flex-1 p-6">
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    );
  }

  // Check verification status
  const isVerified = mentorProfile?.verificationStatus === 'VERIFIED';

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
        <SidebarProvider defaultOpen={false}>
          <div className="flex min-h-screen w-full">
            <DynamicMentorSidebar
              activeSection="availability"
              onSectionChange={(section) => {
                if (section === 'availability') return;
                router.push(`/dashboard?section=${section}`);
              }}
            />
            <SidebarInset className="flex flex-col flex-1">
              <Header showSidebarTrigger />
              <main className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <Lock className="w-12 h-12 text-amber-500" />
                        <div className="flex-1">
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white">
                            Verification Required
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            You need to be a verified mentor to manage your availability.
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            Current Status: <span className="font-medium">{mentorProfile?.verificationStatus}</span>
                          </p>
                          {mentorProfile?.verificationStatus === 'IN_PROGRESS' && (
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                              Your application is being reviewed. You'll be notified once approved.
                            </p>
                          )}
                          {mentorProfile?.verificationStatus === 'YET_TO_APPLY' && (
                            <Button className="mt-4" onClick={() => router.push('/mentor/profile')}>
                              Complete Your Profile
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full">
          <DynamicMentorSidebar
            activeSection="availability"
            onSectionChange={(section) => {
              if (section === 'availability') return;
              router.push(`/dashboard?section=${section}`);
            }}
          />
          <SidebarInset className="flex flex-col flex-1">
            <Header showSidebarTrigger />
            <main className="flex-1 p-6">
              <div className="max-w-6xl mx-auto">
                <MentorAvailabilityManager />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
