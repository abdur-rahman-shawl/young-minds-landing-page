"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, XCircle, Loader2, UserRoundX, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReassignmentResponseBannerProps {
    sessionId: string;
    sessionTitle: string;
    newMentorName: string;
    newMentorAvatar?: string;
    sessionRate?: number;
    onSuccess?: () => void;
}

/**
 * Banner shown to mentees when their session has been auto-reassigned
 * after the original mentor cancelled. Allows them to accept or reject.
 */
export function ReassignmentResponseBanner({
    sessionId,
    sessionTitle,
    newMentorName,
    newMentorAvatar,
    sessionRate = 0,
    onSuccess,
}: ReassignmentResponseBannerProps) {
    const [isAccepting, setIsAccepting] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const { toast } = useToast();

    const handleAccept = async () => {
        setIsAccepting(true);
        try {
            const response = await fetch(`/api/bookings/${sessionId}/accept-reassignment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to accept reassignment");
            }

            toast({
                title: "Session Confirmed!",
                description: data.message || `You've confirmed your session with ${newMentorName}.`,
            });

            onSuccess?.();
        } catch (error) {
            console.error("Error accepting reassignment:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to accept reassignment",
                variant: "destructive",
            });
        } finally {
            setIsAccepting(false);
        }
    };

    const handleReject = async () => {
        setIsRejecting(true);
        try {
            const response = await fetch(`/api/bookings/${sessionId}/reject-reassignment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason.trim() || undefined }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to cancel session");
            }

            toast({
                title: "Session Cancelled",
                description: data.message || `Your session has been cancelled. Full refund will be processed.`,
            });

            setShowRejectDialog(false);
            onSuccess?.();
        } catch (error) {
            console.error("Error rejecting reassignment:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to cancel session",
                variant: "destructive",
            });
        } finally {
            setIsRejecting(false);
        }
    };

    return (
        <>
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                                Your Mentor Changed
                            </h4>
                            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                                Your original mentor had to cancel. You've been assigned to:
                            </p>

                            {/* New Mentor Info */}
                            <div className="flex items-center gap-2 mt-3 p-2 bg-white dark:bg-amber-900/30 rounded-lg">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={newMentorAvatar} alt={newMentorName} />
                                    <AvatarFallback className="bg-amber-200 text-amber-800">
                                        {newMentorName?.charAt(0) || "M"}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-amber-900 dark:text-amber-100">
                                    {newMentorName}
                                </span>
                            </div>

                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-3">
                                Would you like to continue with this new mentor, or cancel for a full refund?
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                    onClick={handleAccept}
                                    disabled={isAccepting}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {isAccepting ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Continue with {newMentorName.split(' ')[0]}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowRejectDialog(true)}
                                    disabled={isAccepting}
                                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel (Full Refund)
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reject Confirmation Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <UserRoundX className="h-5 w-5 text-red-500" />
                            Cancel Session?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You're about to cancel "{sessionTitle}" because you don't want to continue with the new mentor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Refund Info */}
                    {sessionRate > 0 && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                                <DollarSign className="h-4 w-4" />
                                Full Refund Guaranteed
                            </div>
                            <p className="text-green-700 dark:text-green-300 mt-1">
                                You will receive a 100% refund of ${sessionRate.toFixed(2)} since your original mentor cancelled.
                            </p>
                        </div>
                    )}

                    {/* Optional Reason */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Reason (optional)
                        </label>
                        <Textarea
                            placeholder="Let us know why you're not comfortable with the new mentor..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="min-h-[80px]"
                            maxLength={500}
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRejecting}>
                            Keep Session
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleReject();
                            }}
                            disabled={isRejecting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isRejecting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                "Yes, Cancel Session"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
