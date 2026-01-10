"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { UserSidebar } from "@/components/mentee/sidebars/user-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AnimatePresence, motion } from "framer-motion"; // Added for animation

// Dashboard components
import { Dashboard } from "@/components/shared/dashboard/dashboard";
import { ExploreMentors } from "@/components/shared/dashboard/explore";
import { SavedItems } from "@/components/mentee/dashboard/saved-items";
import { Mentors } from "@/components/shared/dashboard/mentors";
import { Messages } from "@/components/shared/dashboard/messages";
import { Sessions } from "@/components/shared/dashboard/sessions";
import { MentorDetailView } from "@/components/mentee/mentor-detail-view";
import { SubscriptionPlans } from "@/components/mentee/subscriptions/subscription-plans";

interface MenteeDashboardProps {
  user: any;
}

export function MenteeDashboard({ user }: MenteeDashboardProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get section and mentor from URL on page load
    const sectionFromUrl = searchParams.get("section") || "dashboard";
    const mentorFromUrl = searchParams.get("mentor");

    console.log('🚀 useEffect triggered - URL params:', { sectionFromUrl, mentorFromUrl });
    console.log('🚀 Current state before update:', { activeSection, selectedMentor });

    // If mentor ID is present but section is still "explore", automatically set to mentor-detail
    if (mentorFromUrl && sectionFromUrl === "explore") {
      console.log('🚀 Mentor ID found with explore section, auto-setting to mentor-detail');
      setActiveSection("mentor-detail");
      setSelectedMentor(mentorFromUrl);
    } else {
      // Normal URL sync
      setActiveSection(sectionFromUrl);
      setSelectedMentor(mentorFromUrl);
    }

    console.log('🚀 useEffect completed - new state should be:', {
      activeSection: mentorFromUrl && sectionFromUrl === "explore" ? "mentor-detail" : sectionFromUrl,
      selectedMentor: mentorFromUrl
    });
  }, [searchParams]);

  const handleSectionChange = (section: string) => {
    console.log('🚀 handleSectionChange called with:', section);
    console.log('🚀 Current router:', router);
    setActiveSection(section);
    setSelectedMentor(null);

    // Handle courses navigation
    if (section === "courses") {
      console.log('🚀 Navigating to /courses via router.push');
      router.push("/courses");
      return;
    }

    // Handle my learning navigation
    if (section === "my-courses") {
      console.log('🚀 Navigating to /my-courses via router.push');
      router.push("/my-courses");
      return;
    }

    console.log('🚀 Updating URL for section:', section);
    router.push(`/dashboard?section=${section}`);
  };

  const handleMentorSelect = (mentorId: string) => {
    console.log('🚀 handleMentorSelect called with mentorId:', mentorId);
    console.log('🚀 Current activeSection:', activeSection);
    console.log('🚀 Current selectedMentor:', selectedMentor);

    setSelectedMentor(mentorId);
    setActiveSection("mentor-detail");

    console.log('🚀 Setting activeSection to: mentor-detail');
    console.log('🚀 Setting selectedMentor to:', mentorId);

    // Update URL using Next.js router
    const newUrl = `/dashboard?section=mentor-detail&mentor=${mentorId}`;
    console.log('🚀 New URL will be:', newUrl);

    router.replace(newUrl, undefined, { shallow: true });

    console.log('🚀 URL updated using router.replace, navigation should happen now');
  };

  const handleBackToExplore = () => {
    console.log('🚀 handleBackToExplore called');
    setSelectedMentor(null);
    setActiveSection("explore");

    // Update URL using Next.js router
    const newUrl = `/dashboard?section=explore`;
    console.log('🚀 Navigating back to:', newUrl);
    router.replace(newUrl, undefined, { shallow: true });
  };

  const renderContent = () => {
    console.log('🚀 renderContent called with activeSection:', activeSection, 'selectedMentor:', selectedMentor);

    let content;
    switch (activeSection) {
      case "dashboard":
        content = <Dashboard onMentorSelect={handleMentorSelect} />;
        break;
      case "explore":
        content = <ExploreMentors onMentorSelect={handleMentorSelect} />;
        break;
      case "saved":
        content = <SavedItems onMentorSelect={handleMentorSelect} />;
        break;
      case "mentors":
        content = <Mentors onMentorSelect={handleMentorSelect} />;
        break;
      case "messages":
        content = <Messages />;
        break;
      case "sessions":
        content = <Sessions />;
        break;
      case "mentor-detail":
        content = (
          <MentorDetailView
            mentorId={selectedMentor}
            onBack={handleBackToExplore}
          />
        );
        break;
      case "subscriptions":
        content = <SubscriptionPlans />;
        break;
      default:
        content = <Dashboard onMentorSelect={handleMentorSelect} />;
    }

    // Wrap content in animation
    return (
      <motion.div
        key={activeSection + (selectedMentor || "")}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="h-full"
      >
        {content}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <UserSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            userRole="mentee"
          />
          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <Header showSidebarTrigger />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
              <AnimatePresence mode="wait">
                {renderContent()}
              </AnimatePresence>
            </main>
          </SidebarInset>
          {/* Right sidebar is hidden on small screens usually, keeping your logic same */}
          <RightSidebar selectedMentor={selectedMentor} />
        </div>
      </SidebarProvider>
    </div>
  );
}