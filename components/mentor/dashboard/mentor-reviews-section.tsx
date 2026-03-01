'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle2, ClipboardCheck, MessageSquareText, Star } from 'lucide-react';
import { SessionRating } from '@/components/booking/SessionRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMentorPendingReviews } from '@/hooks/use-mentor-dashboard';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

type PendingSession = {
  sessionId: string;
  sessionTitle: string;
  sessionEndedAt: string;
  mentee: {
    id: string;
    name: string;
    avatar?: string | null;
  };
};

type SubmittedReview = {
  id: string;
  sessionId: string;
  feedback: string | null;
  finalScore: string;
  createdAt: string;
  sessionTitle: string | null;
  sessionEndedAt: string | null;
  mentee: {
    id: string | null;
    name: string | null;
    image: string | null;
  };
  ratings: Array<{
    questionText: string;
    rating: number;
  }>;
};

type CourseComment = {
  id: string;
  feedbackType: 'course' | 'content-item';
  courseId: string;
  courseTitle: string | null;
  contentItemId: string;
  contentItemTitle: string | null;
  rating: number;
  title: string | null;
  review: string | null;
  helpfulVotes: number;
  createdAt: string;
  instructorResponse: string | null;
  instructorRespondedAt: string | null;
  reviewerName: string | null;
  reviewerImage: string | null;
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch reviews');
  }

  return response.json() as Promise<{ reviews: SubmittedReview[] }>;
};

const courseCommentsFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch course comments');
  }

  return response.json() as Promise<{ hasAccess: boolean; hasComments?: boolean; comments: CourseComment[] }>;
};

function ReviewCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingReviewList({
  sessionsToReview,
  onReviewComplete,
}: {
  sessionsToReview: PendingSession[];
  onReviewComplete: () => void;
}) {
  const [selectedSession, setSelectedSession] = useState<PendingSession | null>(null);

  return (
    <>
      <Card className="border-amber-200/70 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
                Pending Feedback
              </CardTitle>
              <CardDescription>
                Complete feedback for sessions that still need your review.
              </CardDescription>
            </div>
            <Badge variant="secondary">{sessionsToReview.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsToReview.map((session) => (
            <div
              key={session.sessionId}
              className="flex flex-col gap-4 rounded-xl border border-amber-200/70 bg-white/90 p-4 dark:border-amber-900/40 dark:bg-slate-950/40 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border">
                  <AvatarImage src={session.mentee.avatar ?? undefined} alt={session.mentee.name} />
                  <AvatarFallback>
                    {(session.mentee.name || 'Mentee').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{session.sessionTitle || 'Untitled session'}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.mentee.name} · Session ended{' '}
                    {session.sessionEndedAt
                      ? formatDistanceToNow(new Date(session.sessionEndedAt), { addSuffix: true })
                      : 'recently'}
                  </p>
                </div>
              </div>
              <Button type="button" onClick={() => setSelectedSession(session)}>
                Add Feedback
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={selectedSession !== null} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden border-0 bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Session feedback</DialogTitle>
            <DialogDescription>Submit mentor feedback for the selected mentee session.</DialogDescription>
          </DialogHeader>
          {selectedSession ? (
            <div className="overflow-y-auto px-4 py-6 sm:px-6">
              <SessionRating
                sessionId={selectedSession.sessionId}
                reviewee={{
                  id: selectedSession.mentee.id,
                  name: selectedSession.mentee.name,
                  avatar: selectedSession.mentee.avatar ?? null,
                  role: 'mentee',
                }}
                onComplete={() => {
                  setSelectedSession(null);
                  onReviewComplete();
                }}
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MentorReviewsSection() {
  const [activeTab, setActiveTab] = useState<'submitted' | 'pending'>('submitted');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const { session } = useAuth();
  const {
    sessionsToReview,
    isLoading: pendingLoading,
    error: pendingError,
    mutate: mutatePendingReviews,
  } = useMentorPendingReviews(session?.user);
  const { data, error, isLoading, mutate } = useSWR('/api/mentor/reviews', fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
  const {
    data: courseCommentsData,
    error: courseCommentsError,
    isLoading: courseCommentsLoading,
    mutate: mutateCourseComments,
  } = useSWR('/api/mentor/course-comments', courseCommentsFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });

  const submittedReviews = data?.reviews ?? [];
  const hasCourseCommentsAccess = courseCommentsData?.hasAccess ?? false;
  const hasCourseComments = courseCommentsData?.hasComments ?? false;
  const courseComments = courseCommentsData?.comments ?? [];
  const shouldShowCourseCommentsSection = 
    courseCommentsLoading || courseComments.length > 0 || (hasCourseCommentsAccess && hasCourseComments);

  const handleReplySave = async (comment: CourseComment) => {
    const response = (replyDrafts[comment.id] ?? comment.instructorResponse ?? '').trim();
    if (!response) {
      toast.error('Reply cannot be empty.');
      return;
    }

    setSavingReplyId(comment.id);
    try {
      const res = await fetch(`/api/mentor/course-comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: comment.feedbackType,
          response,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save reply');
      }

      toast.success('Reply saved');
      setReplyDrafts((prev) => ({ ...prev, [comment.id]: response }));
      mutateCourseComments();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save reply';
      toast.error(message);
    } finally {
      setSavingReplyId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reviews</h1>
            <p className="text-sm text-muted-foreground">
              View the feedback you have shared with mentees after each session.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={activeTab === 'submitted' ? 'default' : 'outline'}
              className="h-9 px-3"
              onClick={() => setActiveTab('submitted')}
            >
              {submittedReviews.length} submitted
            </Button>
            <Button
              type="button"
              variant={activeTab === 'pending' ? 'default' : 'outline'}
              className="h-9 px-3"
              onClick={() => setActiveTab('pending')}
            >
              {sessionsToReview.length} pending
            </Button>
          </div>
        </div>

        {activeTab === 'pending' ? (
          pendingLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map((item) => (
                  <Skeleton key={item} className="h-24 w-full rounded-xl" />
                ))}
              </CardContent>
            </Card>
          ) : pendingError ? (
            <Card className="border-destructive/30">
              <CardContent className="flex items-center gap-3 p-5 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">Failed to load pending feedback items.</p>
              </CardContent>
            </Card>
          ) : sessionsToReview.length > 0 ? (
            <PendingReviewList
              sessionsToReview={sessionsToReview}
              onReviewComplete={() => {
                mutatePendingReviews();
                mutate();
              }}
            />
          ) : (
            <Card className="border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-foreground">All completed sessions have mentor feedback recorded.</p>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Submitted Session Feedback</CardTitle>
                    <CardDescription>
                      Feedback and ratings you have already sent to mentees.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => mutate()}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <>
                    <ReviewCardSkeleton />
                    <ReviewCardSkeleton />
                  </>
                ) : error ? (
                  <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 text-center">
                    <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
                    <p className="font-medium">Could not load submitted reviews</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Try refreshing the page. If the issue persists, check the mentor reviews API response.
                    </p>
                  </div>
                ) : submittedReviews.length === 0 ? (
                  <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
                    <MessageSquareText className="mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="font-medium">No feedback submitted yet</p>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      Once you complete session reviews for mentees, they will appear here with scores and written feedback.
                    </p>
                  </div>
                ) : (
                  submittedReviews.map((review) => (
                    <Card key={review.id} className="border-border/70">
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 border">
                              <AvatarImage src={review.mentee.image ?? undefined} alt={review.mentee.name ?? 'Mentee'} />
                              <AvatarFallback>
                                {(review.mentee.name || 'Mentee').slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-2">
                              <div>
                                <p className="font-semibold text-foreground">{review.mentee.name || 'Unknown mentee'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {review.sessionTitle || 'Untitled session'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                  <Calendar className="h-3 w-3" />
                                  Submitted {format(new Date(review.createdAt), 'MMM d, yyyy')}
                                </span>
                                {review.sessionEndedAt ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                    Session ended {format(new Date(review.sessionEndedAt), 'MMM d, yyyy')}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="w-fit gap-1 self-start px-3 py-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                            {Number(review.finalScore).toFixed(1)}/5
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-xl bg-muted/40 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Written feedback</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">
                            {review.feedback || 'No written feedback was added for this review.'}
                          </p>
                        </div>

                        {review.ratings.length > 0 ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {review.ratings.map((rating, index) => (
                              <div key={`${review.id}-${index}`} className="rounded-lg border bg-background p-3">
                                <p className="text-sm text-foreground">{rating.questionText}</p>
                                <div className="mt-2 flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-4 w-4 ${
                                        star <= rating.rating
                                          ? 'fill-yellow-500 text-yellow-500'
                                          : 'text-muted-foreground/30'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>

            {shouldShowCourseCommentsSection ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Course Comments</CardTitle>
                      <CardDescription>
                        Comments left by mentees on your courses and lesson items. Reply from here.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => mutateCourseComments()}>
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courseCommentsLoading ? (
                    <>
                      <ReviewCardSkeleton />
                      <ReviewCardSkeleton />
                    </>
                  ) : courseCommentsError ? (
                    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 text-center">
                      <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
                      <p className="font-medium">Could not load course comments</p>
                    </div>
                  ) : (
                    courseComments.map((comment) => (
                      <Card key={`${comment.feedbackType}-${comment.id}`} className="border-border/70">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12 border">
                                <AvatarImage src={comment.reviewerImage ?? undefined} alt={comment.reviewerName ?? 'Reviewer'} />
                                <AvatarFallback>
                                  {(comment.reviewerName || 'U').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="space-y-2">
                                <div>
                                  <p className="font-semibold text-foreground">{comment.reviewerName || 'Anonymous'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {comment.courseTitle || 'Untitled course'}
                                    {comment.feedbackType === 'content-item' && comment.contentItemTitle
                                      ? ` · ${comment.contentItemTitle}`
                                      : ''}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                    {comment.feedbackType === 'course' ? 'Course comment' : 'Lesson comment'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                    Helpful {comment.helpfulVotes}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="w-fit gap-1 self-start px-3 py-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                              {comment.rating}/5
                            </Badge>
                          </div>

                          <div className="rounded-xl bg-muted/40 p-4">
                            {comment.title ? (
                              <p className="text-sm font-semibold text-foreground">{comment.title}</p>
                            ) : null}
                            <p className="mt-1 text-sm leading-6 text-foreground">
                              {comment.review || 'No comment text provided.'}
                            </p>
                          </div>

                          <div className="space-y-3 rounded-xl border p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-foreground">Your reply</p>
                              {comment.instructorRespondedAt ? (
                                <span className="text-xs text-muted-foreground">
                                  Updated {format(new Date(comment.instructorRespondedAt), 'MMM d, yyyy')}
                                </span>
                              ) : null}
                            </div>
                            <Textarea
                              rows={3}
                              value={replyDrafts[comment.id] ?? comment.instructorResponse ?? ''}
                              placeholder="Write a reply to this mentee comment..."
                              onChange={(event) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [comment.id]: event.target.value,
                                }))
                              }
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                onClick={() => handleReplySave(comment)}
                                disabled={savingReplyId === comment.id}
                              >
                                {savingReplyId === comment.id
                                  ? 'Saving...'
                                  : comment.instructorResponse
                                    ? 'Update Reply'
                                    : 'Post Reply'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
