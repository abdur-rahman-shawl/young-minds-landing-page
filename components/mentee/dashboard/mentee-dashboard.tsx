"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { UserSidebar } from "@/components/mentee/sidebars/user-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Dashboard components
import { Dashboard } from "@/components/shared/dashboard/dashboard";
import { ExploreMentors } from "@/components/shared/dashboard/explore";
import { SavedItems } from "@/components/mentee/dashboard/saved-items";
import { Mentors } from "@/components/shared/dashboard/mentors";
import { Messages } from "@/components/shared/dashboard/messages";
import { Sessions } from "@/components/shared/dashboard/sessions";
import { MentorDetailView } from "@/components/mentee/mentor-detail-view";

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
    // Update URL without causing a full page reload
    const url = new URL(window.location.href);
    url.searchParams.set("section", section);
    url.searchParams.delete("mentor");
    window.history.pushState({}, "", url.toString());
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
    const newUrl = `/?section=mentor-detail&mentor=${mentorId}`;
    console.log('🚀 New URL will be:', newUrl);
    
    router.replace(newUrl, undefined, { shallow: true });
    
    console.log('🚀 URL updated using router.replace, navigation should happen now');
  };

  const handleBackToExplore = () => {
    console.log('🚀 handleBackToExplore called');
    setSelectedMentor(null);
    setActiveSection("explore");
    
    // Update URL using Next.js router
    const newUrl = `/?section=explore`;
    console.log('🚀 Navigating back to:', newUrl);
    router.replace(newUrl, undefined, { shallow: true });
  };

  const renderContent = () => {
    console.log('🚀 renderContent called with activeSection:', activeSection, 'selectedMentor:', selectedMentor);
    
    switch (activeSection) {
      case "dashboard":
        return <Dashboard onMentorSelect={handleMentorSelect} />;
      case "explore":
        return <ExploreMentors onMentorSelect={handleMentorSelect} />;
      case "saved":
        return <SavedItems onMentorSelect={handleMentorSelect} />;
      case "mentors":
        return <Mentors onMentorSelect={handleMentorSelect} />;
      case "messages":
        return <Messages />;
      case "sessions":
        return <Sessions />;
      case "mentor-detail":
        return (
          <MentorDetailView
            mentorId={selectedMentor}
            onBack={handleBackToExplore}
          />
        );
      default:
        return <Dashboard onMentorSelect={handleMentorSelect} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <UserSidebar 
            activeSection={activeSection} 
            onSectionChange={handleSectionChange}
            userRole="mentee"
          />
          <SidebarInset className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 p-6">
              {renderContent()}
            </main>
          </SidebarInset>
          <RightSidebar selectedMentor={selectedMentor} />
        </div>
      </SidebarProvider>
    </div>
  );
} 