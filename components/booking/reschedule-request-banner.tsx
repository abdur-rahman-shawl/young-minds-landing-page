"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { RescheduleResponseDialog } from "./reschedule-response-dialog";

interface RescheduleRequestBannerProps {
    sessionId: string;
    sessionTitle: string;
    pendingRescheduleTime: Date;
    pendingRescheduleBy: "mentor" | "mentee";
    originalTime: Date;
    expiresAt?: Date;
    mentorId: string;
    userRole: "mentor" | "mentee";
    requestId: string;
    counterProposalCount?: number;
    onResponse?: () => void;
}

export function RescheduleRequestBanner({
    sessionId,
    sessionTitle,
    pendingRescheduleTime,
    pendingRescheduleBy,
    originalTime,
    expiresAt,
    mentorId,
    userRole,
    requestId,
    counterProposalCount = 0,
    onResponse,
}: RescheduleRequestBannerProps) {
    const [showResponseDialog, setShowResponseDialog] = useState(false);

    // Check if this banner is for the responder (not the initiator)
    const isResponder = pendingRescheduleBy !== userRole;
    const initiatorLabel = pendingRescheduleBy === "mentor" ? "Mentor" : "Mentee";

    // If user is the initiator, show a "waiting" banner instead
    if (!isResponder) {
        return (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                            Reschedule Request Pending
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                            Waiting for {userRole === "mentor" ? "mentee" : "mentor"} to respond to your reschedule request.
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-300">
                            <span>Proposed time:</span>
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900">
                                {format(new Date(pendingRescheduleTime), "MMM d 'at' h:mm a")}
                            </Badge>
                        </div>
                        {expiresAt && (
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                                Expires {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Show response banner for the other party
    return (
        <>
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="font-medium text-amber-800 dark:text-amber-200">
                                {counterProposalCount > 0 ? "Counter-Proposal Received" : "Reschedule Request"}
                            </p>
                            {counterProposalCount > 0 && (
                                <Badge variant="outline" className="text-xs">
                                    Round {counterProposalCount + 1}
                                </Badge>
                            )}
                        </div>

                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            {initiatorLabel} wants to reschedule &quot;{sessionTitle}&quot;
                        </p>

                        {/* Time comparison */}
                        <div className="flex items-center gap-2 mt-3 text-sm">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Current</span>
                                <span className="font-medium text-amber-800 dark:text-amber-200">
                                    {format(new Date(originalTime), "MMM d, h:mm a")}
                                </span>
                            </div>
                            <ArrowRight className="h-4 w-4 text-amber-500" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Proposed</span>
                                <span className="font-medium text-green-700 dark:text-green-400">
                                    {format(new Date(pendingRescheduleTime), "MMM d, h:mm a")}
                                </span>
                            </div>
                        </div>

                        {expiresAt && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                Please respond {formatDistanceToNow(new Date(expiresAt), { addSuffix: true })}
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-4">
                            <Button
                                size="sm"
                                onClick={() => setShowResponseDialog(true)}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                Respond Now
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Response Dialog */}
            <RescheduleResponseDialog
                open={showResponseDialog}
                onOpenChange={setShowResponseDialog}
                sessionId={sessionId}
                sessionTitle={sessionTitle}
                requestId={requestId}
                proposedTime={pendingRescheduleTime}
                originalTime={originalTime}
                initiatedBy={pendingRescheduleBy}
                userRole={userRole}
                mentorId={mentorId}
                counterProposalCount={counterProposalCount}
                onSuccess={() => {
                    setShowResponseDialog(false);
                    onResponse?.();
                }}
            />
        </>
    );
}
