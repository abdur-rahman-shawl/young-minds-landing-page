"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface MentorItem {
  id: string;
  name: string;
  email: string;
  title: string | null;
  verificationStatus: string;
}

export function AdminMentors() {
  const [mentors, setMentors] = useState<MentorItem[]>([]);

  const fetchList = async () => {
    const res = await fetch("/api/admin/mentors", { credentials: "include" });
    const json = await res.json();
    if (json.success) setMentors(json.data);
  };

  useEffect(() => { fetchList(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/admin/mentors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mentorId: id, status }),
    });
    const j = await res.json();
    if (j.success) setMentors(prev=>prev.map(m=>m.id===id?{...m,verificationStatus:status}:m));
  };

  return (
    <Card className="m-6">
      <CardHeader>
        <CardTitle>Mentors</CardTitle>
        <CardDescription>Approve or reject mentor applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Name</th><th>Email</th><th>Title</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {mentors.map(m=> (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="py-2">{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.title}</td>
                  <td><Badge variant="outline">{m.verificationStatus}</Badge></td>
                  <td>
                    <Select defaultValue={m.verificationStatus} onValueChange={(v)=>updateStatus(m.id,v)}>
                      <SelectTrigger className="w-36 h-8 text-xs"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {["IN_PROGRESS","VERIFIED","REJECTED","REVERIFICATION"].map(s=>(
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
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
  );
} 