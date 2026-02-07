"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TimeSlotSelectorV2 } from "./time-slot-selector-v2";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  mentorId: string;
  currentDate: Date;
  currentDuration: number;
  userRole: "mentor" | "mentee";
  rescheduleCount?: number;
  onSuccess?: () => void;
}

interface PolicyData {
  cancellationCutoffHours: number;
  rescheduleCutoffHours: number;
  maxReschedules: number;
  freeCancellationHours: number;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  mentorId,
  currentDate,
  currentDuration,
  userRole,
  rescheduleCount = 0,
  onSuccess,
}: RescheduleDialogProps) {
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionData, setSessionData] = useState<{
    rescheduleCount: number;
    mentorRescheduleCount: number;
  } | null>(null);
  const [policyData, setPolicyData] = useState<PolicyData | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const { toast } = useToast();

  // Use fetched session data if available, otherwise use props
  const currentRescheduleCount = sessionData
    ? (userRole === "mentor" ? sessionData.mentorRescheduleCount : sessionData.rescheduleCount)
    : rescheduleCount;

  // Use fetched policy data if available, otherwise use defaults
  const maxReschedules = policyData?.maxReschedules ?? 2;
  const cutoffHours = policyData?.rescheduleCutoffHours ?? (userRole === "mentor" ? 2 : 4);

  const remainingReschedules = maxReschedules - currentRescheduleCount;
  const canReschedule = remainingReschedules > 0;
  const otherPartyLabel = userRole === "mentor" ? "mentee" : "mentor";

  // Fetch policies when dialog opens
  useEffect(() => {
    const fetchPolicies = async () => {
      if (!open) return;

      setLoadingPolicies(true);
      try {
        const response = await fetch(`/api/session-policies?role=${userRole}`);
        const data = await response.json();

        if (response.ok) {
          setPolicyData(data);
        }
      } catch (error) {
        console.error("Error fetching policies:", error);
      } finally {
        setLoadingPolicies(false);
      }
    };

    fetchPolicies();
  }, [open, userRole]);

  // Fetch session data when dialog opens to get accurate reschedule count
  useEffect(() => {
    const fetchSessionData = async () => {
      if (!open || !sessionId) return;

      setLoadingSession(true);
      try {
        const response = await fetch(`/api/bookings/${sessionId}`);
        const data = await response.json();

        if (response.ok && data.booking) {
          setSessionData({
            rescheduleCount: data.booking.rescheduleCount ?? 0,
            mentorRescheduleCount: data.booking.mentorRescheduleCount ?? 0,
          });
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      } finally {
        setLoadingSession(false);
      }
    };

    fetchSessionData();
  }, [open, sessionId]);

  const handleTimeSelected = (time: Date) => {
    setSelectedTime(time);
  };

  const handleReschedule = async () => {
    if (!selectedTime) {
      toast({
        title: "Error",
        description: "Please select a new time slot",
        variant: "destructive",
      });
      return;
    }

    if (selectedTime <= new Date()) {
      toast({
        title: "Error",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${sessionId}/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledAt: selectedTime.toISOString(),
          duration: currentDuration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reschedule session");
      }

      toast({
        title: "📅 Reschedule Request Sent",
        description: `Your request to reschedule to ${format(selectedTime, "MMMM d 'at' h:mm a")} has been sent to the ${otherPartyLabel} for approval.`,
        duration: 5000,
      });

      onOpenChange(false);
      setSelectedTime(null);
      onSuccess?.();
    } catch (error) {
      console.error("Error rescheduling session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedTime(null);
      setSessionData(null);
      setPolicyData(null);
    }
    onOpenChange(open);
  };

  const isLoadingData = loadingSession || loadingPolicies;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Reschedule Session
          </DialogTitle>
          <DialogDescription>
            Choose a new date and time for &quot;{sessionTitle}&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Reschedule Count Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Your reschedule allowance:
            </span>
            {isLoadingData ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge
                variant={remainingReschedules > 0 ? "secondary" : "destructive"}
                className="font-medium"
              >
                {currentRescheduleCount} / {maxReschedules} used
              </Badge>
            )}
          </div>

          {/* Warning if at limit */}
          {!canReschedule && !isLoadingData && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Reschedule limit reached</p>
                <p className="text-xs mt-1">
                  You have used all your reschedules for this session.
                  Please contact support if you need further assistance.
                </p>
              </div>
            </div>
          )}

          {/* Current Schedule */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm">
            <p className="font-medium text-gray-700 dark:text-gray-300">Current Schedule:</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {format(currentDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          {canReschedule && !isLoadingData && (
            <>
              {/* Time Slot Selector - uses mentor's availability */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 text-sm">
                  {userRole === "mentor"
                    ? "Select a new time from your availability:"
                    : "Select new time from mentor's availability:"}
                </h4>
                <TimeSlotSelectorV2
                  mentorId={mentorId}
                  onTimeSelected={handleTimeSelected}
                  initialSelectedTime={undefined}
                />
              </div>

              {/* Selected Time Confirmation */}
              {selectedTime && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">New selected time:</p>
                  <p className="mt-1">
                    {format(selectedTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Policy Notice */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Rescheduling Policy:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
              <li>Sessions cannot be rescheduled within {cutoffHours} hour(s) of the scheduled time</li>
              <li>The {otherPartyLabel} will be notified of the new schedule</li>
              <li>You can reschedule up to {maxReschedules} time(s) per session</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isLoading || !selectedTime || !canReschedule || isLoadingData}
          >
            {isLoading ? "Rescheduling..." : "Reschedule Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}