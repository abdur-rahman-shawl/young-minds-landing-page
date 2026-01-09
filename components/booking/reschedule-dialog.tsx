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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  currentDate: Date;
  currentDuration: number;
  rescheduleCount?: number;
  maxReschedules?: number;
  onSuccess?: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  currentDate,
  currentDuration,
  rescheduleCount = 0,
  maxReschedules = 2,
  onSuccess,
}: RescheduleDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(currentDuration.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [apiRescheduleCount, setApiRescheduleCount] = useState<number | null>(null);
  const [apiMaxReschedules, setApiMaxReschedules] = useState<number | null>(null);
  const { toast } = useToast();

  // Use API values if available, otherwise use props
  const currentRescheduleCount = apiRescheduleCount ?? rescheduleCount;
  const currentMaxReschedules = apiMaxReschedules ?? maxReschedules;
  const remainingReschedules = currentMaxReschedules - currentRescheduleCount;
  const canReschedule = remainingReschedules > 0;

  const handleReschedule = async () => {
    if (!date || !time) {
      toast({
        title: "Error",
        description: "Please select both date and time",
        variant: "destructive",
      });
      return;
    }

    const scheduledAt = new Date(`${date}T${time}`);

    if (scheduledAt <= new Date()) {
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
          scheduledAt: scheduledAt.toISOString(),
          duration: parseInt(duration),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Update reschedule count from API response if available
        if (data.rescheduleCount !== undefined) {
          setApiRescheduleCount(data.rescheduleCount);
        }
        if (data.maxReschedules !== undefined) {
          setApiMaxReschedules(data.maxReschedules);
        }
        throw new Error(data.error || "Failed to reschedule session");
      }

      // Update counts from successful response
      if (data.rescheduleCount !== undefined) {
        setApiRescheduleCount(data.rescheduleCount);
      }
      if (data.maxReschedules !== undefined) {
        setApiMaxReschedules(data.maxReschedules);
      }

      toast({
        title: "Session Rescheduled",
        description: `The session has been rescheduled to ${format(scheduledAt, "EEEE, MMMM d 'at' h:mm a")}. The mentor has been notified.`,
      });

      onOpenChange(false);
      setDate("");
      setTime("");
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
      setDate("");
      setTime("");
    }
    onOpenChange(open);
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = format(tomorrow, "yyyy-MM-dd");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Reschedule Session
          </DialogTitle>
          <DialogDescription>
            Choose a new date and time for "{sessionTitle}"
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Reschedule Count Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reschedule allowance:</span>
            <Badge
              variant={remainingReschedules > 0 ? "secondary" : "destructive"}
              className="font-medium"
            >
              {currentRescheduleCount} / {currentMaxReschedules} used
            </Badge>
          </div>

          {/* Warning if at limit */}
          {!canReschedule && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-800 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Reschedule limit reached</p>
                <p className="text-xs mt-1">
                  This session has been rescheduled the maximum number of times allowed.
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

          {canReschedule && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="date">New Date</Label>
                <Input
                  id="date"
                  type="date"
                  min={minDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time">New Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (minutes)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Policy Notice */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">Rescheduling Policy:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
              <li>Sessions cannot be rescheduled within 4 hours of the scheduled time</li>
              <li>The mentor will be notified of the new schedule</li>
              <li>Each session can be rescheduled up to {currentMaxReschedules} times</li>
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
            disabled={isLoading || !date || !time || !canReschedule}
          >
            {isLoading ? "Rescheduling..." : "Reschedule Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}