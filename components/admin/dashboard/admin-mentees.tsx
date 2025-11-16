"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search, Users } from "lucide-react";

interface Mentee {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  currentRole: string | null;
  currentCompany: string | null;
  careerGoals: string | null;
  interests: string[];
  skillsToLearn: string[];
  currentSkills: string[];
  education: string[];
  learningStyle: string | null;
  preferredMeetingFrequency: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export function AdminMentees() {
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchMentees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mentees', { credentials: 'include' });
      const json = await res.json().catch(() => ({ success: false, error: 'Unable to parse response' }));

      if (!res.ok || !json?.success) {
        const message = json?.error || 'Unable to load mentees';
        if (res.status === 401 || res.status === 403) {
          setError(message);
          toast.error('Authentication required', { description: message });
          return;
        }
        setError(message);
        toast.error('Failed to fetch mentees', { description: message });
        return;
      }

      setMentees(json.data ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to fetch mentees', { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, []);

  const filteredMentees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return mentees;
    return mentees.filter((mentee) => {
      const haystack = [
        mentee.name,
        mentee.email,
        mentee.currentRole,
        mentee.currentCompany,
        mentee.careerGoals,
        ...mentee.skillsToLearn,
        ...mentee.currentSkills,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [mentees, search]);

  const renderBadgeList = (items: string[]) => {
    if (!items.length) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 4).map((item) => (
          <Badge key={item} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
        {items.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{items.length - 4}
          </Badge>
        )}
      </div>
    );
  };

  const formatRelativeDate = (value: string | null) =>
    value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '—';

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading mentee profiles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center text-sm text-red-600">
        <Users className="h-6 w-6" />
        <p>We ran into a problem loading mentees.</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button size="sm" onClick={fetchMentees} className="mt-2">
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
            <CardTitle>Mentees directory</CardTitle>
            <CardDescription>All mentee profiles currently registered on the platform.</CardDescription>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, skills..."
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name & Contact</TableHead>
                <TableHead>Current role</TableHead>
                <TableHead>Focus areas</TableHead>
                <TableHead>Existing skills</TableHead>
                <TableHead>Learning style</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMentees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No mentees found for that search term.
                  </TableCell>
                </TableRow>
              )}
              {filteredMentees.map((mentee) => {
                const displayName = mentee.name || 'Unknown mentee';
                const currentRole = [mentee.currentRole, mentee.currentCompany]
                  .filter(Boolean)
                  .join(' @ ');
                return (
                  <TableRow key={mentee.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900 dark:text-gray-50">{displayName}</div>
                        {mentee.email && (
                          <div className="text-xs text-muted-foreground">{mentee.email}</div>
                        )}
                        {mentee.careerGoals && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {mentee.careerGoals}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {currentRole || '—'}
                    </TableCell>
                    <TableCell>{renderBadgeList(mentee.skillsToLearn)}</TableCell>
                    <TableCell>{renderBadgeList(mentee.currentSkills)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {mentee.learningStyle ? (
                          <div>Style: {mentee.learningStyle}</div>
                        ) : (
                          <div>Style: —</div>
                        )}
                        {mentee.preferredMeetingFrequency ? (
                          <div>Cadence: {mentee.preferredMeetingFrequency}</div>
                        ) : (
                          <div>Cadence: —</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeDate(mentee.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}









