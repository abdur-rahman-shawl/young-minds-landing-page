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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CANCELLATION_REASONS, MENTOR_CANCELLATION_REASONS } from "@/lib/db/schema/session-policies";

interface CancelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: string;
    sessionTitle: string;
    userRole: "mentor" | "mentee";
    sessionRate?: number;
    scheduledAt?: Date;
    onSuccess?: () => void;
}

interface PolicyData {
    cancellationCutoffHours: number;
    freeCancellationHours: number;
    partialRefundPercentage: number;
    lateCancellationRefundPercentage: number;
}

export function CancelDialog({
    open,
    onOpenChange,
    sessionId,
    sessionTitle,
    userRole,
    sessionRate = 0,
    scheduledAt,
    onSuccess,
}: CancelDialogProps) {
    const [reasonCategory, setReasonCategory] = useState<string>("");
    const [reasonDetails, setReasonDetails] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [policyData, setPolicyData] = useState<PolicyData | null>(null);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const { toast } = useToast();

    // Normalize sessionRate to number (may come as string from db)
    const rate = typeof sessionRate === 'string' ? parseFloat(sessionRate) : (sessionRate || 0);

    // Select appropriate cancellation reasons based on role
    const cancellationReasons = userRole === "mentor" ? MENTOR_CANCELLATION_REASONS : CANCELLATION_REASONS;

    // Calculate refund preview
    const calculateRefundPreview = () => {
        if (!policyData || !scheduledAt) return { percentage: 0, amount: 0 };

        const now = new Date();
        const scheduled = new Date(scheduledAt);
        const hoursUntilSession = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Mentor cancels → always 100%
        if (userRole === "mentor") return { percentage: 100, amount: rate };

        // Session in the past
        if (hoursUntilSession <= 0) return { percentage: 0, amount: 0 };

        // Free cancellation window
        if (hoursUntilSession >= policyData.freeCancellationHours) {
            return { percentage: 100, amount: rate };
        }

        // Between free and cutoff
        if (hoursUntilSession >= policyData.cancellationCutoffHours) {
            const amount = (rate * policyData.partialRefundPercentage) / 100;
            return { percentage: policyData.partialRefundPercentage, amount };
        }

        // After cutoff (late cancellation)
        const amount = (rate * policyData.lateCancellationRefundPercentage) / 100;
        return { percentage: policyData.lateCancellationRefundPercentage, amount };
    };

    const refundPreview = calculateRefundPreview();

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

            const otherParty = userRole === "mentor" ? "mentee" : "mentor";
            const refundMessage = data.refundAmount > 0
                ? ` A refund of $${data.refundAmount.toFixed(2)} (${data.refundPercentage}%) will be processed.`
                : "";

            toast({
                title: "Session Cancelled",
                description: `The session has been cancelled successfully. The ${otherParty} has been notified.${refundMessage}`,
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
            setPolicyData(null);
        }
        onOpenChange(open);
    };

    const cutoffHours = policyData?.cancellationCutoffHours ?? (userRole === "mentor" ? 1 : 2);
    const otherPartyLabel = userRole === "mentor" ? "mentee" : "mentor";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Cancel Session
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel &quot;{sessionTitle}&quot;? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Refund Preview */}
                    {rate > 0 && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-sm text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 font-medium">
                                <DollarSign className="h-4 w-4" />
                                Refund Preview
                            </div>
                            {loadingPolicies ? (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Calculating...
                                </div>
                            ) : (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Session Rate:</div>
                                    <div className="font-medium">${rate.toFixed(2)}</div>
                                    <div className="text-muted-foreground">Refund:</div>
                                    <div className="font-medium">
                                        {refundPreview.percentage}% (${refundPreview.amount.toFixed(2)})
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                                {cancellationReasons.map((reason) => (
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
                        {loadingPolicies ? (
                            <div className="mt-1 flex items-center gap-2 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading policy...
                            </div>
                        ) : (
                            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                                <li>Free cancellation: {policyData?.freeCancellationHours ?? 24}+ hours before session (100% refund)</li>
                                <li>Partial refund: {cutoffHours}–{policyData?.freeCancellationHours ?? 24} hours before ({policyData?.partialRefundPercentage ?? 70}%)</li>
                                <li>The {otherPartyLabel} will be notified of the cancellation</li>
                            </ul>
                        )}
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
