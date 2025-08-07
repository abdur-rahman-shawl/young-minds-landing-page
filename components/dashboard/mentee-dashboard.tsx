"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { UserSidebar } from "@/components/sidebars/user-sidebar";
import { RightSidebar } from "@/components/layout/right-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Dashboard components
import { Dashboard } from "@/components/dashboard/dashboard";
import { ExploreMentors } from "@/components/dashboard/explore";
import { SavedItems } from "@/components/dashboard/saved-items";
import { Mentors } from "@/components/dashboard/mentors";
import { Messages } from "@/components/dashboard/messages";
import { Sessions } from "@/components/dashboard/sessions";

interface MenteeDashboardProps {
  user: any;
}

export function MenteeDashboard({ user }: MenteeDashboardProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedMentor, setSelectedMentor] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get section and mentor from URL on page load
    const sectionFromUrl = searchParams.get("section") || "dashboard";
    const mentorFromUrl = searchParams.get("mentor");
    setActiveSection(sectionFromUrl);
    setSelectedMentor(mentorFromUrl ? parseInt(mentorFromUrl) : null);
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

  const handleMentorSelect = (mentorId: number) => {
    setSelectedMentor(mentorId);
    setActiveSection("mentor-profile");
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("section", "mentor-profile");
    url.searchParams.set("mentor", mentorId.toString());
    window.history.pushState({}, "", url.toString());
  };

  const renderContent = () => {
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