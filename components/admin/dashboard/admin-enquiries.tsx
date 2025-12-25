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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Inbox,
  Loader2,
  Search,
  ShieldCheck,
  ShieldX,
  Eye,
  Mail,
  Calendar,
  Monitor,
  Globe,
  CheckCircle2,
} from "lucide-react";

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
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/enquiries");
      const json = await res.json().catch(() => ({ success: false }));
      if (!res.ok || !json?.success) throw new Error(json?.error || "Error");
      setEnquiries(json.data ?? []);
    } catch (err) {
      toast.error("Failed to load enquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const filteredEnquiries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return enquiries.filter((enquiry) => {
      if (statusFilter === "open" && enquiry.isResolved) return false;
      if (statusFilter === "resolved" && !enquiry.isResolved) return false;
      if (!term) return true;
      return [enquiry.name, enquiry.email, enquiry.subject].some((field) =>
        field.toLowerCase().includes(term)
      );
    });
  }, [enquiries, search, statusFilter]);

  // Helper to get initials for Avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enquiries</h2>
          <p className="text-muted-foreground">
            Manage and respond to contact form submissions.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Status Filters */}
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            {(["all", "open", "resolved"] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/40 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sender or subject..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground hidden md:block">
              Showing {filteredEnquiries.length} results
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[300px]">Sender</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[150px]">Status</TableHead>
                <TableHead className="w-[150px] text-right">Received</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No enquiries found.
                  </TableCell>
                </TableRow>
              )}
              {filteredEnquiries.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/30 group transition-colors"
                  onClick={() => setSelectedEnquiry(item)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid gap-0.5">
                        <span className="font-medium leading-none text-sm">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 max-w-[400px]">
                      <span className="font-medium text-sm truncate">
                        {item.subject}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.message}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.isResolved ? "secondary" : "default"}
                      className={
                        !item.isResolved
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : ""
                      }
                    >
                      {item.isResolved ? "Resolved" : "Open"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {item.createdAt
                      ? formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* READING PANE (SHEET) */}
      <Sheet
        open={!!selectedEnquiry}
        onOpenChange={(open) => !open && setSelectedEnquiry(null)}
      >
        <SheetContent className="sm:max-w-xl w-full flex flex-col gap-0 p-0">
          {selectedEnquiry && (
            <>
              {/* Header */}
              <SheetHeader className="px-6 py-6 border-b bg-muted/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SheetTitle className="text-xl leading-snug">
                      {selectedEnquiry.subject}
                    </SheetTitle>
                    <SheetDescription className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {selectedEnquiry.createdAt
                          ? new Date(selectedEnquiry.createdAt).toLocaleString()
                          : "-"}
                      </span>
                    </SheetDescription>
                  </div>
                  <Badge
                    className="shrink-0"
                    variant={
                      selectedEnquiry.isResolved ? "secondary" : "outline"
                    }
                  >
                    {selectedEnquiry.isResolved ? "Resolved" : "Open"}
                  </Badge>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-8">
                  {/* Sender Card */}
                  <div className="flex items-center gap-4 rounded-lg border p-4 bg-card shadow-sm">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="text-lg">
                        {getInitials(selectedEnquiry.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold">{selectedEnquiry.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <a
                          href={`mailto:${selectedEnquiry.email}`}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {selectedEnquiry.email}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* The Actual Message - Focused Readability */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Message
                    </h3>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap rounded-md bg-muted/30 p-4 leading-relaxed text-foreground border-l-2 border-primary/50">
                      {selectedEnquiry.message}
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4" /> Technical Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          IP Address
                        </p>
                        <p className="font-mono bg-background px-2 py-1 rounded border inline-block">
                          {selectedEnquiry.ipAddress || "Unknown"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Consent</p>
                        <div className="flex items-center gap-2">
                          {selectedEnquiry.consent ? (
                            <Badge
                              variant="outline"
                              className="text-green-600 border-green-600/30 bg-green-50 dark:bg-green-900/20"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Granted
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Denied
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          User Agent
                        </p>
                        <p className="text-xs text-muted-foreground break-all bg-background p-2 rounded border">
                          {selectedEnquiry.userAgent || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer Actions */}
              <div className="p-6 border-t bg-background mt-auto flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedEnquiry(null)}>
                  Close
                </Button>
                <Button>
                  <Mail className="mr-2 h-4 w-4" /> Reply via Email
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}