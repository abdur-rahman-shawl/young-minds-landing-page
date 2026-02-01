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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, XCircle, Calendar, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { TimeSlotSelectorV2 } from "./time-slot-selector-v2";

interface RescheduleResponseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sessionId: string;
    sessionTitle: string;
    requestId: string;
    proposedTime: Date;
    originalTime: Date;
    initiatedBy: "mentor" | "mentee";
    userRole: "mentor" | "mentee";
    mentorId: string;
    counterProposalCount?: number;
    initialAction?: 'accept' | 'reject' | 'counter_propose' | 'cancel_session';
    onSuccess?: () => void;
}

export function RescheduleResponseDialog({
    open,
    onOpenChange,
    sessionId,
    sessionTitle,
    requestId,
    proposedTime,
    originalTime,
    initiatedBy,
    userRole,
    mentorId,
    counterProposalCount = 0,
    initialAction = 'accept',
    onSuccess,
}: RescheduleResponseDialogProps) {
    const [selectedTab, setSelectedTab] = useState<string>(initialAction === 'counter_propose' ? 'counter' : initialAction === 'cancel_session' ? 'cancel' : initialAction);
    const [counterTime, setCounterTime] = useState<Date | null>(null);
    const [cancellationReason, setCancellationReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const maxCounterProposals = 3;
    const canCounterPropose = counterProposalCount < maxCounterProposals;
    const isMentee = userRole === "mentee";

    const handleSubmit = async () => {
        let action: string;
        let body: Record<string, unknown> = { requestId };

        switch (selectedTab) {
            case "accept":
                action = "accept";
                break;
            case "counter":
                if (!counterTime) {
                    toast({
                        title: "Error",
                        description: "Please select a time to propose",
                        variant: "destructive",
                    });
                    return;
                }
                action = "counter_propose";
                body.counterProposedTime = counterTime.toISOString();
                break;
            case "cancel":
                action = "cancel_session";
                body.cancellationReason = cancellationReason || undefined;
                break;
            default:
                return;
        }

        body.action = action;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/bookings/${sessionId}/reschedule/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to process response");
            }

            let successMessage = "";
            switch (action) {
                case "accept":
                    successMessage = `Session rescheduled to ${format(new Date(proposedTime), "EEEE, MMMM d 'at' h:mm a")}`;
                    break;
                case "counter_propose":
                    successMessage = "Counter-proposal sent successfully";
                    break;
                case "cancel_session":
                    successMessage = "Session cancelled. Full refund will be processed.";
                    break;
            }

            toast({
                title: "Success",
                description: successMessage,
            });

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error("Response error:", error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to process response",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = (open: boolean) => {
        if (!open) {
            setSelectedTab("accept");
            setCounterTime(null);
            setCancellationReason("");
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        Respond to Reschedule Request
                    </DialogTitle>
                    <DialogDescription>
                        {initiatedBy === "mentor" ? "Your mentor" : "Your mentee"} wants to reschedule &quot;{sessionTitle}&quot;
                    </DialogDescription>
                </DialogHeader>

                {/* Time comparison */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Current Time</span>
                            <span className="font-medium">
                                {format(new Date(originalTime), "MMM d, yyyy")}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {format(new Date(originalTime), "h:mm a")}
                            </span>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Proposed Time</span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                                {format(new Date(proposedTime), "MMM d, yyyy")}
                            </span>
                            <span className="text-sm text-green-600 dark:text-green-400">
                                {format(new Date(proposedTime), "h:mm a")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Response options */}
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="accept" className="flex items-center gap-1">
                            <Check className="h-4 w-4" />
                            Accept
                        </TabsTrigger>
                        <TabsTrigger
                            value="counter"
                            disabled={!canCounterPropose}
                            className="flex items-center gap-1"
                        >
                            <Clock className="h-4 w-4" />
                            Suggest
                        </TabsTrigger>
                        {isMentee && (
                            <TabsTrigger value="cancel" className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                Cancel
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="accept" className="mt-4">
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
                            <p className="text-sm text-green-800 dark:text-green-200">
                                Accept the proposed time and confirm the reschedule. The session will be updated immediately.
                            </p>
                        </div>
                    </TabsContent>

                    <TabsContent value="counter" className="mt-4 space-y-4">
                        {!canCounterPropose ? (
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800 dark:text-red-200">
                                        Maximum counter-proposals reached
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                        Please accept the proposed time or cancel the session.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <Label>Select an alternative time:</Label>
                                    <Badge variant="outline">
                                        {counterProposalCount}/{maxCounterProposals} proposals used
                                    </Badge>
                                </div>
                                <TimeSlotSelectorV2
                                    mentorId={mentorId}
                                    onTimeSelected={(time) => setCounterTime(time)}
                                    initialSelectedTime={undefined}
                                />
                                {counterTime && (
                                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3">
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            Your proposal: {format(counterTime, "EEEE, MMMM d 'at' h:mm a")}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {isMentee && (
                        <TabsContent value="cancel" className="mt-4 space-y-4">
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4">
                                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                    Cancel this session entirely
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                    Since this is in response to a mentor&apos;s reschedule request, you will receive a <strong>100% refund</strong>.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cancel-reason">Reason (optional)</Label>
                                <Textarea
                                    id="cancel-reason"
                                    placeholder="Let the mentor know why..."
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    className="min-h-[80px]"
                                    maxLength={500}
                                />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || (selectedTab === "counter" && !counterTime && canCounterPropose)}
                        variant={selectedTab === "cancel" ? "destructive" : "default"}
                    >
                        {isLoading ? "Processing..." : (
                            selectedTab === "accept" ? "Accept & Confirm" :
                                selectedTab === "counter" ? "Send Proposal" :
                                    "Cancel Session"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
