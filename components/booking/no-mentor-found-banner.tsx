"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { AlertTriangle, Users, XCircle, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NoMentorFoundBannerProps {
    sessionId: string;
    sessionTitle: string;
    sessionRate?: number;
    onSuccess?: () => void;
}

/**
 * Banner shown to mentees when their mentor cancelled but no auto-replacement
 * was found. Allows them to browse for a new mentor or cancel for a full refund.
 */
export function NoMentorFoundBanner({
    sessionId,
    sessionTitle,
    sessionRate = 0,
    onSuccess,
}: NoMentorFoundBannerProps) {
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    // Normalize sessionRate to number (may come as string from database)
    const rate = typeof sessionRate === 'string' ? parseFloat(sessionRate) : (sessionRate || 0);

    const handleCancel = async () => {
        setIsCancelling(true);
        try {
            const response = await fetch(`/api/bookings/${sessionId}/reject-reassignment`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: "No suitable mentor available" }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to cancel session");
            }

            toast({
                title: "✅ Session Cancelled",
                description: "Your session has been cancelled. A full refund will be processed.",
                duration: 5000,
            });

            onSuccess?.();
        } catch (error) {
            console.error("Error cancelling:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to cancel session",
                variant: "destructive",
            });
        } finally {
            setIsCancelling(false);
            setShowCancelDialog(false);
        }
    };

    return (
        <>
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                                Action Required - Your Mentor Cancelled
                            </h4>
                            <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                                Your mentor for <strong>"{sessionTitle}"</strong> has cancelled.
                                We couldn't find an immediate replacement.
                            </p>

                            <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                                You can browse other available mentors to continue with your session,
                                or cancel for a full refund.
                            </p>

                            {/* Refund Info */}
                            {rate > 0 && (
                                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm border border-green-200 dark:border-green-800 mt-3">
                                    <div className="flex items-center gap-2 font-medium text-green-800 dark:text-green-200">
                                        <DollarSign className="h-4 w-4" />
                                        Full Refund Guaranteed
                                    </div>
                                    <p className="text-green-700 dark:text-green-300 mt-1">
                                        If you cancel, you will receive a 100% refund of ${rate.toFixed(2)}.
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                    onClick={() => router.push(`/sessions/${sessionId}/select-mentor`)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Users className="h-4 w-4 mr-2" />
                                    Browse Available Mentors
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCancelDialog(true)}
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

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this session? You will receive a full refund of ${rate.toFixed(2)}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Keep Browsing</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleCancel();
                            }}
                            disabled={isCancelling}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isCancelling ? (
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
