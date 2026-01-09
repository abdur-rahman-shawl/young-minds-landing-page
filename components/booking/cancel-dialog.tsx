"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CANCELLATION_REASONS } from "@/lib/db/schema/session-policies";

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  onSuccess?: () => void;
}

export function CancelDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  onSuccess,
}: CancelDialogProps) {
  const [reasonCategory, setReasonCategory] = useState<string>("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    if (!reasonCategory) {
      toast({
        title: "Reason Required",
        description: "Please select a reason for cancellation.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/bookings/${sessionId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reasonCategory,
          reasonDetails: reasonDetails.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel session");
      }

      toast({
        title: "Session Cancelled",
        description: "The session has been cancelled successfully. The mentor has been notified.",
      });

      onOpenChange(false);
      setReasonCategory("");
      setReasonDetails("");
      onSuccess?.();
    } catch (error) {
      console.error("Error cancelling session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setReasonCategory("");
      setReasonDetails("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Cancel Session
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel "{sessionTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Reason Category (Required) */}
          <div className="grid gap-2">
            <Label htmlFor="reason-category">
              Reason for Cancellation <span className="text-red-500">*</span>
            </Label>
            <Select value={reasonCategory} onValueChange={setReasonCategory}>
              <SelectTrigger id="reason-category">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details (Optional) */}
          <div className="grid gap-2">
            <Label htmlFor="reason-details">Additional Details (Optional)</Label>
            <Textarea
              id="reason-details"
              placeholder="Please provide any additional context..."
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reasonDetails.length}/500 characters
            </p>
          </div>

          {/* Policy Notice */}
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">Cancellation Policy:</p>
            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
              <li>Sessions cannot be cancelled within 2 hours of the scheduled time</li>
              <li>The mentor will be notified of the cancellation</li>
              <li>Frequent cancellations may affect your account standing</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Keep Session
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isLoading || !reasonCategory}
          >
            {isLoading ? "Cancelling..." : "Cancel Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}