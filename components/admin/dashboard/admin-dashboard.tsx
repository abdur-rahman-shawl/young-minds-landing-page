"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MentorItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  verificationStatus: string;
}

interface MenteeItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  currentRole: string | null;
  careerGoals: string | null;
}

export function AdminDashboard() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);
  const [mentees, setMentees] = useState<MenteeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [mRes, tRes] = await Promise.all([
        fetch("/api/admin/mentors", { credentials: "include" }),
        fetch("/api/admin/mentees", { credentials: "include" }),
      ]);
      const mJson = await mRes.json();
      const tJson = await tRes.json();
      if (mJson.success) setMentors(mJson.data);
      if (tJson.success) setMentees(tJson.data);
    } catch (e) {
      console.error("Admin dashboard fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (mentorId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/mentors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mentorId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setMentors((prev) =>
          prev.map((m) => (m.id === mentorId ? { ...m, verificationStatus: status } : m))
        );
      }
    } catch (e) {
      console.error("Status update error", e);
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen w-full">
        <main className="flex-1 p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Platform management and oversight</p>
              </div>
              <Badge variant="secondary">Administrator</Badge>
            </div>

            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground">+12% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Mentors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">156</div>
                  <p className="text-xs text-muted-foreground">+8% this month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Sessions</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2,847</div>
                  <p className="text-xs text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Admin Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Mentor Applications</CardTitle>
                  <CardDescription>Applications awaiting approval</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Admin functionality coming soon...
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Activity</CardTitle>
                  <CardDescription>Recent platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Activity monitoring coming soon...
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Mentors List */}
            <Card>
              <CardHeader>
                <CardTitle>All Mentors</CardTitle>
                <CardDescription>Manage mentor verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Name</th>
                        <th>Email</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentors.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{m.name}</td>
                          <td>{m.email}</td>
                          <td>{m.title}</td>
                          <td>
                            <Badge variant="outline">{m.verificationStatus}</Badge>
                          </td>
                          <td className="text-center">
                            <Select
                              defaultValue={m.verificationStatus}
                              onValueChange={(val) => updateStatus(m.id, val)}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                {[
                                  "YET_TO_APPLY",
                                  "IN_PROGRESS",
                                  "VERIFIED",
                                  "REJECTED",
                                  "REVERIFICATION",
                                ].map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Mentees List */}
            <Card>
              <CardHeader>
                <CardTitle>All Mentees</CardTitle>
                <CardDescription>List of mentee profiles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Name</th>
                        <th>Email</th>
                        <th>Current Role</th>
                        <th>Career Goals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentees.map((m) => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="py-2">{m.name}</td>
                          <td>{m.email}</td>
                          <td>{m.currentRole}</td>
                          <td>{m.careerGoals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 