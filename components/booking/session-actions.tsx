"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MoreVertical,
  Calendar,
  XCircle,
  UserX,
  Video,
} from "lucide-react";
import { CancelDialog } from "./cancel-dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import { useToast } from "@/hooks/use-toast";
import { isPast } from "date-fns";

interface ActionSession {
  id: string;
  title: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
  scheduledAt: Date;
  duration: number;
  mentorId: string;
  menteeId: string;
  meetingUrl?: string;
  meetingType?: string;
  rescheduleCount?: number;
  mentorRescheduleCount?: number;
  rate?: number;
}

interface SessionActionsProps {
  session: ActionSession;
  userId: string;
  userRole: "mentor" | "mentee";
  onUpdate?: () => void;
  onJoin?: (session: ActionSession) => void;
}

export function SessionActions({
  session,
  userId,
  userRole,
  onUpdate,
  onJoin,
}: SessionActionsProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const { toast } = useToast();

  const scheduledTime = new Date(session.scheduledAt);
  const now = new Date();
  const isPastSession = isPast(scheduledTime);
  const hoursUntilSession = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Role checks
  const isMentee = userRole === "mentee";
  const isMentor = userRole === "mentor";

  // Demo mode: allow mentors/mentees to jump into the lobby regardless of schedule timing
  const canJoin = session.status === "scheduled" || session.status === "in_progress";

  // Determine what actions are available
  // Mentor: 1hr cutoff for cancel, 2hr cutoff for reschedule (default policies)
  // Mentee: 2hr cutoff for cancel, 4hr cutoff for reschedule (default policies)
  const mentorCancelCutoff = 1;
  const menteeCancelCutoff = 2;
  const mentorRescheduleCutoff = 2;
  const menteeRescheduleCutoff = 4;

  const canCancel = session.status === "scheduled" && (
    (isMentee && hoursUntilSession >= menteeCancelCutoff) ||
    (isMentor && hoursUntilSession >= mentorCancelCutoff)
  );

  const canReschedule = session.status === "scheduled" && (
    (isMentee && hoursUntilSession >= menteeRescheduleCutoff) ||
    (isMentor && hoursUntilSession >= mentorRescheduleCutoff)
  );

  const canMarkNoShow = isMentor &&
    session.status === "scheduled" &&
    isPastSession &&
    (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60) <= 24;

  const handleJoinSession = () => {
    if (onJoin) {
      onJoin(session);
      return;
    }

    router.push(`/session/${session.id}`);
  };

  const handleMarkNoShow = async () => {
    try {
      const response = await fetch(`/api/bookings/${session.id}/no-show`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark as no-show");
      }

      toast({
        title: "Marked as No-Show",
        description: "The session has been marked as no-show.",
      });

      setShowNoShowDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error marking no-show:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as no-show",
        variant: "destructive",
      });
    }
  };

  if (session.status === "completed" || session.status === "cancelled" || session.status === "no_show") {
    return null; // No actions for completed/cancelled/no-show sessions
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canJoin && (
          <Button
            size="sm"
            onClick={handleJoinSession}
            className="bg-green-600 hover:bg-green-700"
          >
            <Video className="h-4 w-4 mr-1" />
            Join
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Session Options</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {canReschedule && (
              <DropdownMenuItem onClick={() => setShowRescheduleDialog(true)}>
                <Calendar className="mr-2 h-4 w-4" />
                Reschedule
              </DropdownMenuItem>
            )}

            {canCancel && (
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Session
              </DropdownMenuItem>
            )}

            {canMarkNoShow && (
              <DropdownMenuItem
                onClick={() => setShowNoShowDialog(true)}
                className="text-orange-600 focus:text-orange-600"
              >
                <UserX className="mr-2 h-4 w-4" />
                Mark as No-Show
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cancel Dialog */}
      <CancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        sessionId={session.id}
        sessionTitle={session.title}
        userRole={userRole}
        sessionRate={session.rate ?? 0}
        scheduledAt={scheduledTime}
        onSuccess={onUpdate}
      />

      {/* Reschedule Dialog */}
      <RescheduleDialog
        open={showRescheduleDialog}
        onOpenChange={setShowRescheduleDialog}
        sessionId={session.id}
        sessionTitle={session.title}
        mentorId={session.mentorId}
        currentDate={scheduledTime}
        currentDuration={session.duration}
        userRole={userRole}
        rescheduleCount={userRole === "mentor" ? (session.mentorRescheduleCount || 0) : (session.rescheduleCount || 0)}
        onSuccess={onUpdate}
      />

      {/* No-Show Confirmation */}
      <AlertDialog open={showNoShowDialog} onOpenChange={setShowNoShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Show?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark &quot;{session.title}&quot; as a no-show?
              This will notify the mentee and may affect their account standing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkNoShow}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Mark as No-Show
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
