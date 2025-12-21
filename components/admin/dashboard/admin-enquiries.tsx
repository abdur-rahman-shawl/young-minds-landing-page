"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Inbox, Loader2, Search, ShieldCheck, ShieldX } from "lucide-react";

interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  consent: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  isResolved: boolean;
  createdAt: string | null;
}

type StatusFilter = "all" | "open" | "resolved";

export function AdminEnquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchEnquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/enquiries", { credentials: "include" });
      const json = await res.json().catch(() => ({ success: false, error: "Unable to parse response" }));

      if (!res.ok || !json?.success) {
        const message = json?.error || "Unable to load enquiries";
        if (res.status === 401 || res.status === 403) {
          setError(message);
          toast.error("Authentication required", { description: message });
          return;
        }
        setError(message);
        toast.error("Failed to fetch enquiries", { description: message });
        return;
      }

      setEnquiries(json.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast.error("Failed to fetch enquiries", { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const openCount = enquiries.filter((item) => !item.isResolved).length;
  const consentCount = enquiries.filter((item) => item.consent).length;

  const filteredEnquiries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return enquiries.filter((enquiry) => {
      if (statusFilter === "open" && enquiry.isResolved) return false;
      if (statusFilter === "resolved" && !enquiry.isResolved) return false;

      if (!term) return true;

      const haystack = [
        enquiry.name,
        enquiry.email,
        enquiry.subject,
        enquiry.message,
        enquiry.userAgent || "",
        enquiry.ipAddress || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [enquiries, search, statusFilter]);

  const formatRelativeDate = (value: string | null) =>
    value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "-";

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading enquiries...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center text-sm text-red-600">
        <Inbox className="h-6 w-6" />
        <p>We ran into a problem loading enquiries.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button size="sm" onClick={fetchEnquiries} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Enquiries inbox</CardTitle>
            <CardDescription>All contact form submissions with metadata.</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="flex w-full max-w-sm items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, subject, message..."
                className="h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "open" ? "default" : "outline"}
                onClick={() => setStatusFilter("open")}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "resolved" ? "default" : "outline"}
                onClick={() => setStatusFilter("resolved")}
              >
                Resolved
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Inbox className="h-3 w-3" />
              {enquiries.length} total
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              {consentCount} consented to follow up
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <ShieldX className="h-3 w-3 text-amber-600" />
              {openCount} open
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & contact</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Metadata</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No enquiries match that filter.
                  </TableCell>
                </TableRow>
              )}
              {filteredEnquiries.map((enquiry) => (
                <TableRow key={enquiry.id} className="align-top">
                  <TableCell className="w-[220px]">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900 dark:text-gray-50">{enquiry.name}</div>
                      <div className="text-xs text-muted-foreground">{enquiry.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Consent:{" "}
                        <span className={enquiry.consent ? "text-green-600" : "text-amber-600"}>
                          {enquiry.consent ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[180px]">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                      {enquiry.subject}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <div className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">
                      {enquiry.message}
                    </div>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <Badge variant={enquiry.isResolved ? "secondary" : "outline"}>
                      {enquiry.isResolved ? "Resolved" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[220px] text-xs text-muted-foreground">
                    <div className="space-y-1">
                      <div className="truncate">
                        UA: {enquiry.userAgent || "-"}
                      </div>
                      <div>IP: {enquiry.ipAddress || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="w-[150px] text-sm text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{formatRelativeDate(enquiry.createdAt)}</span>
                      {enquiry.createdAt && (
                        <span className="text-xs">
                          {new Date(enquiry.createdAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
