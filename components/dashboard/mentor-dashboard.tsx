"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Calendar, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { ErrorBoundary, AuthErrorBoundary } from "@/components/common/error-boundary";

interface MentorDashboardProps {
  user: any;
}

export function MentorDashboard({ user }: MentorDashboardProps) {
  const [mentorStatus, setMentorStatus] = useState<"pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    // In a real app, you'd fetch this from your database
    // For now, we'll simulate the verification status
    setMentorStatus("pending"); // Could be "approved" or "rejected"
  }, []);

  if (mentorStatus === "pending") {
    return (
      <AuthErrorBoundary>
      <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <SidebarProvider defaultOpen={false}>
          <div className="flex min-h-screen w-full">
            <SidebarInset className="flex flex-col flex-1">
              <Header />
              <main className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md w-full space-y-6">
                  <div className="text-center">
                    <Clock className="mx-auto h-16 w-16 text-orange-500" />
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                      Application Under Review
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      Welcome {user?.name}! Your mentor application is being processed.
                    </p>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        Verification Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <Badge variant="outline" className="mb-3">Pending Review</Badge>
                        <p className="text-sm text-orange-800">
                          Our team is reviewing your mentor application. This typically takes 2-3 business days.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">What's happening?</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Application submitted successfully
                          </li>
                          <li className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            Background verification in progress
                          </li>
                          <li className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            Awaiting final approval
                          </li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-4">
                      Questions? Contact us at{" "}
                      <a href="mailto:mentors@youngminds.com" className="text-blue-600 hover:underline">
                        mentors@youngminds.com
                      </a>
                    </p>
                    <Button variant="outline" onClick={() => window.location.href = "/"}>
                      Return to Homepage
                    </Button>
                  </div>
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
      </ErrorBoundary>
      </AuthErrorBoundary>
    );
  }

  // If approved, show full mentor dashboard
  return (
    <AuthErrorBoundary>
    <ErrorBoundary>
    <div className="min-h-screen bg-gray-50">
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full">
          <SidebarInset className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 p-6">
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
                  <p className="text-gray-600">Welcome back, {user?.name}!</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Mentees</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">5</div>
                      <p className="text-xs text-muted-foreground">+2 this month</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sessions This Week</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">8</div>
                      <p className="text-xs text-muted-foreground">+12% from last week</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Messages</CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">23</div>
                      <p className="text-xs text-muted-foreground">3 unread</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Rating</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">4.9</div>
                      <p className="text-xs text-muted-foreground">Based on 47 reviews</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Main content area - you can add more mentor-specific components here */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Sessions</CardTitle>
                      <CardDescription>Your next mentoring sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">No upcoming sessions scheduled</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Messages</CardTitle>
                      <CardDescription>Latest messages from mentees</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">No new messages</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
    </ErrorBoundary>
    </AuthErrorBoundary>
  );
} 