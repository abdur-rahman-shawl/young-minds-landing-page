'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  RotateCcw,
  ShieldQuestion,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type VerificationStatus =
  | 'YET_TO_APPLY'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REVERIFICATION';

type Mentor = {
  id: string;
  userId: string;
  name: string | null;
  fullName: string | null;
  email: string | null;
  image?: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  headline: string | null;
  about: string | null;
  experienceYears: number | null;
  expertise: string[];
  hourlyRate: string | null;
  currency: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  isAvailable: boolean | null;
  resumeUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  location: string;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type MentorAction = Extract<
  VerificationStatus,
  'VERIFIED' | 'REJECTED' | 'REVERIFICATION'
>;

type NoteDialogState = {
  mentor: Mentor;
  status: MentorAction;
  note: string;
  submitting: boolean;
};

const statusBadgeClass: Record<VerificationStatus, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  YET_TO_APPLY: 'bg-slate-100 text-slate-700',
  REJECTED: 'bg-red-100 text-red-700',
  REVERIFICATION: 'bg-purple-100 text-purple-700',
};

const statusCopy: Record<VerificationStatus, string> = {
  VERIFIED: 'Verified',
  IN_PROGRESS: 'In Review',
  YET_TO_APPLY: 'Draft',
  REJECTED: 'Rejected',
  REVERIFICATION: 'Needs Updates',
};

const actionSuccessCopy: Record<MentorAction, string> = {
  VERIFIED: 'Mentor approved successfully',
  REJECTED: 'Mentor application rejected',
  REVERIFICATION: 'Mentor flagged for re-verification',
};

const pendingStatuses: VerificationStatus[] = [
  'YET_TO_APPLY',
  'IN_PROGRESS',
  'REVERIFICATION',
];

export function AdminMentors() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    status: MentorAction;
  } | null>(null);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('pending');

  const fetchMentors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/mentors', { credentials: 'include' });
      const json = await res
        .json()
        .catch(() => ({ success: false, error: 'Unable to parse response' }));

      if (!res.ok || !json?.success) {
        const message = json?.error || 'Unable to load mentors';
        if (res.status === 401 || res.status === 403) {
          setError(message);
          toast.error('Authentication required', { description: message });
          return;
        }
        setError(message);
        toast.error('Failed to fetch mentors', { description: message });
        return;
      }

      setMentors(json.data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      toast.error('Failed to fetch mentors', { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const pendingMentors = useMemo(
    () =>
      mentors.filter((mentor) =>
        pendingStatuses.includes(mentor.verificationStatus),
      ),
    [mentors],
  );

  const verifiedMentors = useMemo(
    () => mentors.filter((mentor) => mentor.verificationStatus === 'VERIFIED'),
    [mentors],
  );

  const rejectedMentors = useMemo(
    () => mentors.filter((mentor) => mentor.verificationStatus === 'REJECTED'),
    [mentors],
  );

  const stats = {
    total: mentors.length,
    pending: pendingMentors.length,
    verified: verifiedMentors.length,
    rejected: rejectedMentors.length,
  };

  const isProcessing = (mentorId: string) => pendingAction?.id === mentorId;

  const handleStatusChange = async (
    mentorId: string,
    status: MentorAction,
    notes?: string | null,
  ): Promise<boolean> => {
    setPendingAction({ id: mentorId, status });
    try {
      const res = await fetch('/api/admin/mentors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mentorId, status, notes }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const message = json?.error || 'Unable to update mentor status';
        if (res.status === 401 || res.status === 403) {
          toast.error('Authentication required', { description: message });
          return false;
        }
        toast.error('Update failed', { description: message });
        return false;
      }

      toast.success(actionSuccessCopy[status]);
      await fetchMentors();
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      toast.error('Update failed', { description: message });
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const openNoteDialog = (mentor: Mentor, status: MentorAction) => {
    setNoteDialog({
      mentor,
      status,
      note: mentor.verificationNotes ?? '',
      submitting: false,
    });
  };

  const handleNoteSubmit = async () => {
    if (!noteDialog) return;
    setNoteDialog((prev) => (prev ? { ...prev, submitting: true } : prev));
    const success = await handleStatusChange(
      noteDialog.mentor.id,
      noteDialog.status,
      noteDialog.note,
    );
    setNoteDialog((prev) => (prev ? { ...prev, submitting: false } : prev));
    if (success) {
      setNoteDialog(null);
    }
  };

  const handleRowClick = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setShowDetails(true);
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedMentor(null);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    mentor: Mentor,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick(mentor);
    }
  };

  const extractExpertise = (mentor: Mentor) =>
    Array.from(new Set((mentor.expertise || []).filter(Boolean)));

  const renderMentorList = (rows: Mentor[]) => {
    if (!rows.length) {
      return (
        <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 py-12 text-sm text-muted-foreground'>
          <ShieldQuestion className='h-6 w-6' />
          No mentors found for this view.
        </div>
      );
    }

    return (
      <TooltipProvider delayDuration={150}>
        <div className='space-y-3'>
          {rows.map((mentor) => {
            const displayName =
              mentor.name || mentor.fullName || 'Unknown mentor';
            const uniqueExpertise = extractExpertise(mentor);
            const expertisePreview = uniqueExpertise.slice(0, 4);
            const extraExpertise = uniqueExpertise.slice(
              expertisePreview.length,
            );
            const registered = mentor.createdAt
              ? format(new Date(mentor.createdAt), 'PP')
              : '?';

            const availabilityBadge =
              mentor.isAvailable === false ? (
                <Badge
                  variant='outline'
                  className='border-transparent text-xs text-red-600'
                >
                  Not accepting sessions
                </Badge>
              ) : mentor.isAvailable ? (
                <Badge
                  variant='outline'
                  className='border-transparent text-xs text-emerald-600'
                >
                  Accepting sessions
                </Badge>
              ) : (
                <Badge
                  variant='outline'
                  className='border-transparent text-xs text-muted-foreground'
                >
                  Availability unknown
                </Badge>
              );

            const handleButtonClick =
              (action: () => void | Promise<unknown>) =>
              (event: ReactMouseEvent) => {
                event.stopPropagation();
                void action();
              };

            return (
              <article
                key={mentor.id}
                role='button'
                tabIndex={0}
                aria-label={`View details for ${displayName}`}
                onClick={() => handleRowClick(mentor)}
                onKeyDown={(event) => handleRowKeyDown(event, mentor)}
                className='group relative flex flex-col gap-4 rounded-xl border border-border bg-card/95 p-4 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
              >
                <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                  <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <p className='text-base font-semibold leading-tight text-foreground'>
                        {displayName}
                      </p>
                      <Badge
                        variant='outline'
                        className={cn(
                          'border-transparent text-xs capitalize',
                          statusBadgeClass[mentor.verificationStatus],
                        )}
                      >
                        {statusCopy[mentor.verificationStatus]}
                      </Badge>
                      {availabilityBadge}
                    </div>
                    {mentor.headline && (
                      <p className='max-w-2xl text-sm text-muted-foreground'>
                        {mentor.headline}
                      </p>
                    )}
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                      <span>Joined {registered}</span>
                      {mentor.location && (
                        <span className='inline-flex items-center gap-1'>
                          <MapPin className='h-3 w-3 shrink-0' />
                          {mentor.location}
                        </span>
                      )}
                    </div>
                    {mentor.verificationNotes && (
                      <p className='text-xs text-muted-foreground line-clamp-2'>
                        Latest note: {mentor.verificationNotes}
                      </p>
                    )}
                  </div>
                  <div className='flex flex-col items-start gap-2 text-sm text-muted-foreground md:items-end'>
                    {mentor.email && (
                      <a
                        href={`mailto:${mentor.email}`}
                        onClick={(event) => event.stopPropagation()}
                        className='font-medium text-primary hover:underline'
                      >
                        {mentor.email}
                      </a>
                    )}
                    <div className='flex flex-wrap justify-end gap-2 text-xs'>
                      {mentor.linkedinUrl && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='gap-1.5'
                          asChild
                          onClick={(event) => event.stopPropagation()}
                        >
                          <a
                            href={mentor.linkedinUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            <ExternalLink className='h-3 w-3' />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                      {mentor.resumeUrl && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='gap-1.5'
                          asChild
                          onClick={(event) => event.stopPropagation()}
                        >
                          <a
                            href={mentor.resumeUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            <FileText className='h-3 w-3' />
                            Resume
                          </a>
                        </Button>
                      )}
                      {mentor.websiteUrl && (
                        <Button
                          variant='outline'
                          size='sm'
                          className='gap-1.5'
                          asChild
                          onClick={(event) => event.stopPropagation()}
                        >
                          <a
                            href={mentor.websiteUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                          >
                            <ExternalLink className='h-3 w-3' />
                            Website
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className='border-dashed border-border/60' />

                <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      Expertise
                    </p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      {expertisePreview.map((item, index) => (
                        <Tooltip key={`${mentor.id}-expertise-${index}`}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant='secondary'
                              className='max-w-[180px] truncate text-xs font-medium'
                            >
                              {item}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{item}</TooltipContent>
                        </Tooltip>
                      ))}
                      {extraExpertise.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant='outline'
                              className='text-xs font-medium'
                            >
                              +{extraExpertise.length} more
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className='max-w-xs'>
                            <ul className='space-y-1 text-xs'>
                              {extraExpertise.map((item, index) => (
                                <li key={`${mentor.id}-extra-${index}`}>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {!expertisePreview.length && (
                        <span className='text-xs text-muted-foreground'>
                          No expertise listed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className='flex flex-wrap justify-start gap-2 md:justify-end'>
                    <Button
                      size='sm'
                      className='gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700'
                      onClick={handleButtonClick(() =>
                        handleStatusChange(mentor.id, 'VERIFIED'),
                      )}
                      disabled={isProcessing(mentor.id)}
                    >
                      {isProcessing(mentor.id) &&
                      pendingAction?.status === 'VERIFIED' ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <CheckCircle2 className='h-4 w-4' />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant='secondary'
                      size='sm'
                      className='gap-1.5'
                      onClick={handleButtonClick(() =>
                        openNoteDialog(mentor, 'REVERIFICATION'),
                      )}
                      disabled={isProcessing(mentor.id)}
                    >
                      {isProcessing(mentor.id) &&
                      pendingAction?.status === 'REVERIFICATION' ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <RotateCcw className='h-4 w-4' />
                      )}
                      Request updates
                    </Button>
                    <Button
                      variant='destructive'
                      size='sm'
                      className='gap-1.5'
                      onClick={handleButtonClick(() =>
                        openNoteDialog(mentor, 'REJECTED'),
                      )}
                      disabled={isProcessing(mentor.id)}
                    >
                      {isProcessing(mentor.id) &&
                      pendingAction?.status === 'REJECTED' ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <XCircle className='h-4 w-4' />
                      )}
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };
  if (loading) {
    return (
      <div className='flex h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground'>
        <Loader2 className='h-6 w-6 animate-spin' />
        Loading mentor applications...
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-[70vh] flex-col items-center justify-center gap-3 text-center text-sm text-red-600'>
        <ShieldQuestion className='h-6 w-6' />
        <p>We ran into a problem loading mentors.</p>
        <p className='text-xs text-muted-foreground'>{error}</p>
        <Button size='sm' onClick={fetchMentors} className='mt-2'>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-6'>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total mentors</CardDescription>
            <CardTitle className='text-2xl'>{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Pending review</CardDescription>
            <CardTitle className='text-2xl text-amber-600'>
              {stats.pending}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Verified mentors</CardDescription>
            <CardTitle className='text-2xl text-emerald-600'>
              {stats.verified}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Rejected</CardDescription>
            <CardTitle className='text-2xl text-red-600'>
              {stats.rejected}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mentor verification</CardTitle>
          <CardDescription>Review and manage expert applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            <TabsList className='mb-4 w-full justify-start'>
              <TabsTrigger value='pending'>
                Pending review ({pendingMentors.length})
              </TabsTrigger>
              <TabsTrigger value='verified'>
                Verified ({verifiedMentors.length})
              </TabsTrigger>
              <TabsTrigger value='all'>All ({mentors.length})</TabsTrigger>
            </TabsList>
            <TabsContent value='pending'>
              {renderMentorList(pendingMentors)}
            </TabsContent>
            <TabsContent value='verified'>
              {renderMentorList(verifiedMentors)}
            </TabsContent>
            <TabsContent value='all'>
              {renderMentorList(mentors)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={!!noteDialog}
        onOpenChange={(open) => !open && setNoteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.status === 'REJECTED'
                ? 'Reject mentor application'
                : 'Request mentor updates'}
            </DialogTitle>
            <DialogDescription>
              {noteDialog?.status === 'REJECTED'
                ? 'Share a short note so the mentor understands why the application was rejected.'
                : 'Let the mentor know what needs to be updated before approval.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-3'>
            <div className='text-sm'>
              <span className='font-medium'>
                {noteDialog?.mentor.name || noteDialog?.mentor.fullName || 'Mentor'}
              </span>
            </div>
            <Textarea
              value={noteDialog?.note ?? ''}
              onChange={(event) =>
                setNoteDialog((prev) =>
                  prev ? { ...prev, note: event.target.value } : prev,
                )
              }
              placeholder='Provide context for this decision...'
              rows={4}
            />
          </div>
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setNoteDialog(null)}
              disabled={noteDialog?.submitting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant={noteDialog?.status === 'REJECTED' ? 'destructive' : 'default'}
              onClick={handleNoteSubmit}
              disabled={noteDialog?.submitting || !noteDialog?.note.trim()}
              className='gap-1.5'
            >
              {noteDialog?.submitting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : noteDialog?.status === 'REJECTED' ? (
                <XCircle className='h-4 w-4' />
              ) : (
                <RotateCcw className='h-4 w-4' />
              )}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={showDetails && !!selectedMentor}
        onOpenChange={(open) => {
          if (!open) {
            closeDetails();
          }
        }}
      >
        <DialogContent
          className='max-w-4xl space-y-6 overflow-hidden'
          aria-labelledby='mentor-detail-title'
          aria-describedby='mentor-detail-description'
        >
          <DialogHeader>
            <DialogTitle id='mentor-detail-title'>Mentor details</DialogTitle>
            <DialogDescription id='mentor-detail-description'>
              Detailed mentor application profile
            </DialogDescription>
          </DialogHeader>
          {selectedMentor && (
            <div className='space-y-6'>
              {(() => {
                const detailAvailabilityBadge =
                  selectedMentor.isAvailable === false ? (
                    <Badge
                      variant='outline'
                      className='border-transparent text-xs text-red-600'
                    >
                      Not accepting sessions
                    </Badge>
                  ) : selectedMentor.isAvailable ? (
                    <Badge
                      variant='outline'
                      className='border-transparent text-xs text-emerald-600'
                    >
                      Accepting sessions
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='border-transparent text-xs text-muted-foreground'
                    >
                      Availability unknown
                    </Badge>
                  );
                const detailExpertise = extractExpertise(selectedMentor);
                return (
                  <>
                    <section
                      aria-labelledby='mentor-overview-heading'
                      className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'
                    >
                      <div className='space-y-3'>
                        <h3
                          id='mentor-overview-heading'
                          className='text-xl font-semibold text-foreground'
                        >
                          {selectedMentor.name ||
                            selectedMentor.fullName ||
                            'Mentor'}
                        </h3>
                        {selectedMentor.headline && (
                          <p className='text-sm text-muted-foreground'>
                            {selectedMentor.headline}
                          </p>
                        )}
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge
                            variant='outline'
                            className={cn(
                              'border-transparent text-xs capitalize',
                              statusBadgeClass[selectedMentor.verificationStatus],
                            )}
                          >
                            {statusCopy[selectedMentor.verificationStatus]}
                          </Badge>
                          {detailAvailabilityBadge}
                          {selectedMentor.location && (
                            <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                              <MapPin className='h-3 w-3' />
                              {selectedMentor.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {selectedMentor.linkedinUrl && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='gap-1.5'
                            asChild
                          >
                            <a
                              href={selectedMentor.linkedinUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <ExternalLink className='h-3 w-3' />
                              LinkedIn
                            </a>
                          </Button>
                        )}
                        {selectedMentor.resumeUrl && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='gap-1.5'
                            asChild
                          >
                            <a
                              href={selectedMentor.resumeUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <FileText className='h-3 w-3' />
                              Resume
                            </a>
                          </Button>
                        )}
                        {selectedMentor.websiteUrl && (
                          <Button
                            variant='outline'
                            size='sm'
                            className='gap-1.5'
                            asChild
                          >
                            <a
                              href={selectedMentor.websiteUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <ExternalLink className='h-3 w-3' />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </section>

                    <Separator />

                    <section
                      aria-labelledby='mentor-summary-heading'
                      className='grid gap-6 md:grid-cols-2'
                    >
                      <div>
                        <h4
                          id='mentor-summary-heading'
                          className='text-sm font-semibold text-foreground'
                        >
                          Application summary
                        </h4>
                        <dl className='mt-3 space-y-3 text-sm text-muted-foreground'>
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='font-medium text-foreground'>Experience</dt>
                            <dd>
                              {selectedMentor.experienceYears
                                ? `${selectedMentor.experienceYears} years`
                                : 'Not provided'}
                            </dd>
                          </div>
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='font-medium text-foreground'>Rate</dt>
                            <dd>
                              {selectedMentor.hourlyRate
                                ? `${selectedMentor.currency ?? 'USD'} ${
                                    selectedMentor.hourlyRate
                                  }/hr`
                                : 'Not provided'}
                            </dd>
                          </div>
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='font-medium text-foreground'>Company</dt>
                            <dd className='max-w-[200px] break-words'>
                              {selectedMentor.company || 'Not provided'}
                            </dd>
                          </div>
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='font-medium text-foreground'>Industry</dt>
                            <dd className='max-w-[200px] break-words'>
                              {selectedMentor.industry || 'Not provided'}
                            </dd>
                          </div>
                          <div className='flex items-start justify-between gap-4'>
                            <dt className='font-medium text-foreground'>Joined</dt>
                            <dd>
                              {selectedMentor.createdAt
                                ? format(new Date(selectedMentor.createdAt), 'PP')
                                : 'Unknown'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4
                          id='mentor-contact-heading'
                          className='text-sm font-semibold text-foreground'
                        >
                          Contact
                        </h4>
                        <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                          {selectedMentor.email && (
                            <a
                              href={`mailto:${selectedMentor.email}`}
                              className='font-medium text-primary hover:underline'
                            >
                              {selectedMentor.email}
                            </a>
                          )}
                          {selectedMentor.city && (
                            <p>
                              City: <span className='font-medium'>{selectedMentor.city}</span>
                            </p>
                          )}
                          {selectedMentor.state && (
                            <p>
                              State: <span className='font-medium'>{selectedMentor.state}</span>
                            </p>
                          )}
                          {selectedMentor.country && (
                            <p>
                              Country:{' '}
                              <span className='font-medium'>{selectedMentor.country}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    <Separator />

                    <section
                      aria-labelledby='mentor-expertise-heading'
                      className='space-y-3'
                    >
                      <h4
                        id='mentor-expertise-heading'
                        className='text-sm font-semibold text-foreground'
                      >
                        Expertise
                      </h4>
                      <div className='flex flex-wrap gap-2'>
                        {detailExpertise.map((item, index) => (
                          <Badge
                            key={`${selectedMentor.id}-detail-expertise-${index}`}
                            variant='secondary'
                            className='text-xs'
                          >
                            {item}
                          </Badge>
                        ))}
                        {detailExpertise.length === 0 && (
                          <span className='text-sm text-muted-foreground'>
                            No expertise listed
                          </span>
                        )}
                      </div>
                    </section>

                    <Separator />

                    <section
                      aria-labelledby='mentor-about-heading'
                      className='space-y-3'
                    >
                      <h4
                        id='mentor-about-heading'
                        className='text-sm font-semibold text-foreground'
                      >
                        About
                      </h4>
                      <p className='whitespace-pre-line text-sm text-muted-foreground'>
                        {selectedMentor.about || 'No additional biography provided.'}
                      </p>
                    </section>

                    {selectedMentor.verificationNotes && (
                      <section
                        aria-labelledby='mentor-notes-heading'
                        className='space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-4 text-sm text-amber-800 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200'
                      >
                        <h4
                          id='mentor-notes-heading'
                          className='font-semibold text-amber-800 dark:text-amber-200'
                        >
                          Latest reviewer note
                        </h4>
                        <p className='whitespace-pre-line'>
                          {selectedMentor.verificationNotes}
                        </p>
                      </section>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
