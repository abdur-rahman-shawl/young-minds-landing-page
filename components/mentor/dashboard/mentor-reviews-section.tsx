'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareText,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';

import { SessionRating } from '@/components/booking/SessionRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useMentorPendingReviews } from '@/hooks/use-mentor-dashboard';
import {
  useMentorCourseCommentsQuery,
  useMentorReviewsQuery,
  useReplyMentorCourseCommentMutation,
} from '@/hooks/queries/use-mentor-queries';
import {
  getMentorFeatureDecision,
  MENTOR_FEATURE_KEYS,
} from '@/lib/mentor/access-policy';
import { MentorFeaturePageGate } from '@/components/mentor/verification/mentor-verification-state';

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
  const [selectedSession, setSelectedSession] = useState<PendingSession | null>(
    null
  );

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
                  <AvatarImage
                    src={session.mentee.avatar ?? undefined}
                    alt={session.mentee.name}
                  />
                  <AvatarFallback>
                    {(session.mentee.name || 'Mentee').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {session.sessionTitle || 'Untitled session'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.mentee.name} · Session ended{' '}
                    {session.sessionEndedAt
                      ? formatDistanceToNow(new Date(session.sessionEndedAt), {
                          addSuffix: true,
                        })
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

      <Dialog
        open={selectedSession !== null}
        onOpenChange={(open) => !open && setSelectedSession(null)}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden border-0 bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Session feedback</DialogTitle>
            <DialogDescription>
              Submit mentor feedback for the selected mentee session.
            </DialogDescription>
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
  const [activeTab, setActiveTab] = useState<'submitted' | 'pending'>(
    'submitted'
  );
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const { session, mentorProfile, mentorAccess } = useAuth();
  const reviewsAccess = getMentorFeatureDecision(
    mentorAccess,
    MENTOR_FEATURE_KEYS.reviewsManage
  );
  const canManageReviews = Boolean(reviewsAccess?.allowed);
  const {
    sessionsToReview,
    isLoading: pendingLoading,
    error: pendingError,
    mutate: mutatePendingReviews,
  } = useMentorPendingReviews(session?.user, canManageReviews);
  const {
    data: reviewsData,
    error: reviewsError,
    isLoading: reviewsLoading,
    refetch: refetchReviews,
  } = useMentorReviewsQuery(!!session?.user?.id && canManageReviews);
  const {
    data: courseCommentsData,
    error: courseCommentsError,
    isLoading: courseCommentsLoading,
    refetch: refetchCourseComments,
  } = useMentorCourseCommentsQuery(!!session?.user?.id && canManageReviews);
  const replyToCourseCommentMutation = useReplyMentorCourseCommentMutation();

  const submittedReviews = (reviewsData?.reviews ?? []) as SubmittedReview[];
  const hasCourseCommentsAccess = courseCommentsData?.hasAccess ?? false;
  const hasCourseComments = courseCommentsData?.hasComments ?? false;
  const courseComments = (courseCommentsData?.comments ?? []) as CourseComment[];
  const shouldShowCourseCommentsSection =
    courseCommentsLoading ||
    courseComments.length > 0 ||
    (hasCourseCommentsAccess && hasCourseComments);

  if (!canManageReviews) {
    return (
      <div className="p-4 md:p-8">
        <MentorFeaturePageGate
          feature={MENTOR_FEATURE_KEYS.reviewsManage}
          access={reviewsAccess}
          mentorProfile={mentorProfile}
          routeBasePath='/dashboard'
          userName={session?.user?.name}
        />
      </div>
    );
  }

  const handleReplySave = async (comment: CourseComment) => {
    const response = (
      replyDrafts[comment.id] ??
      comment.instructorResponse ??
      ''
    ).trim();

    if (!response) {
      toast.error('Reply cannot be empty.');
      return;
    }

    setSavingReplyId(comment.id);
    try {
      await replyToCourseCommentMutation.mutateAsync({
        commentId: comment.id,
        feedbackType: comment.feedbackType,
        response,
      });
      toast.success('Reply saved');
      setReplyDrafts((prev) => ({ ...prev, [comment.id]: response }));
      void refetchCourseComments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save reply'
      );
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
                <p className="text-sm">
                  Failed to load pending feedback items.
                </p>
              </CardContent>
            </Card>
          ) : sessionsToReview.length > 0 ? (
            <PendingReviewList
              sessionsToReview={sessionsToReview}
              onReviewComplete={() => {
                void mutatePendingReviews();
                void refetchReviews();
              }}
            />
          ) : (
            <Card className="border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-foreground">
                  All completed sessions have mentor feedback recorded.
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">
                      Submitted Session Feedback
                    </CardTitle>
                    <CardDescription>
                      Feedback and ratings you have already sent to mentees.
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => void refetchReviews()}>
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewsLoading ? (
                  <>
                    <ReviewCardSkeleton />
                    <ReviewCardSkeleton />
                  </>
                ) : reviewsError ? (
                  <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to load submitted reviews.
                  </div>
                ) : submittedReviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No submitted reviews yet.
                    </p>
                  </div>
                ) : (
                  submittedReviews.map((review) => (
                    <Card
                      key={review.id}
                      className="overflow-hidden border border-border/80"
                    >
                      <CardContent className="space-y-5 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-11 w-11 border">
                              <AvatarImage
                                src={review.mentee.image ?? undefined}
                                alt={review.mentee.name ?? 'Mentee'}
                              />
                              <AvatarFallback>
                                {(review.mentee.name || 'Mentee')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <h3 className="font-semibold text-foreground">
                                {review.mentee.name || 'Unknown mentee'}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>
                                  {review.sessionTitle || 'Session review'}
                                </span>
                                {review.sessionEndedAt ? (
                                  <span>
                                    · {format(new Date(review.sessionEndedAt), 'PPP')}
                                  </span>
                                ) : null}
                                <span>
                                  · Submitted{' '}
                                  {formatDistanceToNow(new Date(review.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                            <Star className="h-4 w-4 fill-current" />
                            {review.finalScore}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {review.ratings.map((rating) => (
                            <div
                              key={`${review.id}-${rating.questionText}`}
                              className="rounded-xl border bg-muted/30 p-3"
                            >
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {rating.questionText}
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {rating.rating}/5
                              </p>
                            </div>
                          ))}
                        </div>

                        {review.feedback ? (
                          <div className="rounded-xl bg-muted/30 p-4">
                            <p className="mb-2 text-sm font-medium text-foreground">
                              Written feedback
                            </p>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {review.feedback}
                            </p>
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
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <MessageSquareText className="h-5 w-5 text-primary" />
                      Course Feedback
                    </CardTitle>
                    <CardDescription>
                      Learner comments from courses and lesson content.
                    </CardDescription>
                  </div>
                  {courseComments.length > 0 ? (
                    <Badge variant="secondary">{courseComments.length}</Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  {courseCommentsLoading ? (
                    <>
                      <ReviewCardSkeleton />
                      <ReviewCardSkeleton />
                    </>
                  ) : courseCommentsError ? (
                    <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Failed to load course comments.
                    </div>
                  ) : courseComments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        No course comments yet.
                      </p>
                    </div>
                  ) : (
                    courseComments.map((comment) => {
                      const draftValue =
                        replyDrafts[comment.id] ??
                        comment.instructorResponse ??
                        '';
                      const isSaving =
                        savingReplyId === comment.id ||
                        replyToCourseCommentMutation.isPending;

                      return (
                        <Card
                          key={comment.id}
                          className="overflow-hidden border border-border/80"
                        >
                          <CardContent className="space-y-5 p-5">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-11 w-11 border">
                                  <AvatarImage
                                    src={comment.reviewerImage ?? undefined}
                                    alt={comment.reviewerName ?? 'Reviewer'}
                                  />
                                  <AvatarFallback>
                                    {(comment.reviewerName || 'Learner')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-foreground">
                                      {comment.reviewerName || 'Learner'}
                                    </h3>
                                    <Badge
                                      variant="outline"
                                      className="capitalize"
                                    >
                                      {comment.feedbackType === 'course'
                                        ? 'Course'
                                        : 'Lesson'}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span>
                                      {comment.courseTitle || 'Untitled course'}
                                    </span>
                                    {comment.feedbackType === 'content-item' ? (
                                      <span>
                                        ·{' '}
                                        {comment.contentItemTitle ||
                                          'Untitled lesson'}
                                      </span>
                                    ) : null}
                                    <span>
                                      ·{' '}
                                      {formatDistanceToNow(
                                        new Date(comment.createdAt),
                                        {
                                          addSuffix: true,
                                        }
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-current text-amber-500" />
                                  <span className="font-medium text-foreground">
                                    {comment.rating}/5
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(comment.createdAt), 'PPP')}
                                </div>
                              </div>

                              {comment.title ? (
                                <p className="text-base font-medium text-foreground">
                                  {comment.title}
                                </p>
                              ) : null}

                              {comment.review ? (
                                <p className="text-sm leading-6 text-muted-foreground">
                                  {comment.review}
                                </p>
                              ) : null}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`reply-${comment.id}`}>
                                Your reply
                              </Label>
                              <Textarea
                                id={`reply-${comment.id}`}
                                value={draftValue}
                                onChange={(event) =>
                                  setReplyDrafts((prev) => ({
                                    ...prev,
                                    [comment.id]: event.target.value,
                                  }))
                                }
                                rows={4}
                                placeholder="Reply to the learner"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                              <div className="text-sm text-muted-foreground">
                                {comment.instructorRespondedAt ? (
                                  <>
                                    Last updated{' '}
                                    {formatDistanceToNow(
                                      new Date(comment.instructorRespondedAt),
                                      { addSuffix: true }
                                    )}
                                  </>
                                ) : (
                                  'No reply yet'
                                )}
                              </div>
                              <Button
                                type="button"
                                onClick={() => void handleReplySave(comment)}
                                disabled={isSaving}
                              >
                                {isSaving ? 'Saving...' : 'Save Reply'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
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
