"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
    Save,
    RotateCcw,
    Clock,
    Users,
    GraduationCap,
    DollarSign,
    RefreshCw,
    Loader2,
    Info,
} from "lucide-react";

interface Policy {
    key: string;
    value: string;
    type: string;
    description: string;
    defaultValue: string;
}

interface GroupedPolicies {
    menteeRules: Policy[];
    mentorRules: Policy[];
    refundRules: Policy[];
    rescheduleSettings: Policy[];
}

// Human-readable labels for policy keys
const POLICY_LABELS: Record<string, string> = {
    cancellation_cutoff_hours: "Cancellation Cutoff",
    reschedule_cutoff_hours: "Reschedule Cutoff",
    max_reschedules_per_session: "Max Reschedules",
    mentor_cancellation_cutoff_hours: "Cancellation Cutoff",
    mentor_reschedule_cutoff_hours: "Reschedule Cutoff",
    mentor_max_reschedules_per_session: "Max Reschedules",
    free_cancellation_hours: "Free Cancellation Window",
    partial_refund_percentage: "Partial Refund",
    late_cancellation_refund_percentage: "Late Cancellation Refund",
    require_cancellation_reason: "Require Reason",
    reschedule_request_expiry_hours: "Request Expiry",
    max_counter_proposals: "Max Counter Proposals",
};

// Units for numeric policies
const POLICY_UNITS: Record<string, string> = {
    cancellation_cutoff_hours: "hours before session",
    reschedule_cutoff_hours: "hours before session",
    max_reschedules_per_session: "times per session",
    mentor_cancellation_cutoff_hours: "hours before session",
    mentor_reschedule_cutoff_hours: "hours before session",
    mentor_max_reschedules_per_session: "times per session",
    free_cancellation_hours: "hours before session",
    partial_refund_percentage: "% of session rate",
    late_cancellation_refund_percentage: "% of session rate",
    reschedule_request_expiry_hours: "hours",
    max_counter_proposals: "proposals",
};

export function AdminPolicies() {
    const { toast } = useToast();

    // State
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [grouped, setGrouped] = useState<GroupedPolicies | null>(null);
    const [editedValues, setEditedValues] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Fetch policies
    const fetchPolicies = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/admin/policies");
            const data = await response.json();

            if (data.success) {
                setPolicies(data.data.policies);
                setGrouped(data.data.grouped);
                // Initialize edited values
                const initial: Record<string, string> = {};
                data.data.policies.forEach((p: Policy) => {
                    initial[p.key] = p.value;
                });
                setEditedValues(initial);
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch policies", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    // Check for changes
    const hasChanges = () => {
        return policies.some(p => editedValues[p.key] !== p.value);
    };

    // Get changed policies
    const getChangedPolicies = () => {
        return policies
            .filter(p => editedValues[p.key] !== p.value)
            .map(p => ({ key: p.key, value: editedValues[p.key] }));
    };

    // Save changes
    const handleSave = async () => {
        const changes = getChangedPolicies();
        if (changes.length === 0) return;

        setIsSaving(true);
        try {
            const response = await fetch("/api/admin/policies", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates: changes }),
            });

            const data = await response.json();

            if (data.success) {
                toast({ title: "Success", description: data.message });
                fetchPolicies(); // Refresh
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Reset to defaults
    const handleReset = async () => {
        setIsResetting(true);
        try {
            const response = await fetch("/api/admin/policies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset" }),
            });

            const data = await response.json();

            if (data.success) {
                toast({ title: "Success", description: data.message });
                setShowResetDialog(false);
                fetchPolicies(); // Refresh
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to reset policies", variant: "destructive" });
        } finally {
            setIsResetting(false);
        }
    };

    // Render policy input
    const renderPolicyInput = (policy: Policy) => {
        const label = POLICY_LABELS[policy.key] || policy.key;
        const unit = POLICY_UNITS[policy.key];
        const isModified = editedValues[policy.key] !== policy.value;

        if (policy.type === "boolean") {
            return (
                <div key={policy.key} className="flex items-center justify-between py-3">
                    <div className="space-y-0.5">
                        <Label className={isModified ? "text-blue-600 font-semibold" : ""}>
                            {label}
                            {isModified && <span className="ml-1 text-xs">*</span>}
                        </Label>
                        <p className="text-xs text-gray-500">{policy.description}</p>
                    </div>
                    <Switch
                        checked={editedValues[policy.key] === "true"}
                        onCheckedChange={(checked) =>
                            setEditedValues(prev => ({ ...prev, [policy.key]: checked ? "true" : "false" }))
                        }
                    />
                </div>
            );
        }

        return (
            <div key={policy.key} className="space-y-2 py-3">
                <div className="flex items-center justify-between">
                    <Label className={isModified ? "text-blue-600 font-semibold" : ""}>
                        {label}
                        {isModified && <span className="ml-1 text-xs">*</span>}
                    </Label>
                    {unit && <span className="text-xs text-gray-400">{unit}</span>}
                </div>
                <Input
                    type="number"
                    value={editedValues[policy.key] || ""}
                    onChange={(e) =>
                        setEditedValues(prev => ({ ...prev, [policy.key]: e.target.value }))
                    }
                    className={isModified ? "border-blue-300 focus:border-blue-500" : ""}
                    min={0}
                    max={policy.key.includes("percentage") ? 100 : undefined}
                />
                <p className="text-xs text-gray-500">{policy.description}</p>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Policies</h1>
                    <p className="text-gray-500 dark:text-gray-400">Configure cancellation, rescheduling, and refund rules</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowResetDialog(true)}
                        disabled={isSaving}
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset Defaults
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges() || isSaving}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Info Banner */}
            {hasChanges() && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800 dark:text-blue-200">
                        You have {getChangedPolicies().length} unsaved change(s)
                    </span>
                </div>
            )}

            {/* Policy Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Mentee Rules */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <CardTitle className="text-lg">Mentee Rules</CardTitle>
                        </div>
                        <CardDescription>Cancellation and rescheduling limits for mentees</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {grouped?.menteeRules.map(policy => renderPolicyInput(policy))}
                    </CardContent>
                </Card>

                {/* Mentor Rules */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-purple-500" />
                            <CardTitle className="text-lg">Mentor Rules</CardTitle>
                        </div>
                        <CardDescription>Cancellation and rescheduling limits for mentors</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {grouped?.mentorRules.map(policy => renderPolicyInput(policy))}
                    </CardContent>
                </Card>

                {/* Refund Rules */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-green-500" />
                            <CardTitle className="text-lg">Refund Rules</CardTitle>
                        </div>
                        <CardDescription>Refund percentages and cancellation windows</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {grouped?.refundRules.map(policy => renderPolicyInput(policy))}
                    </CardContent>
                </Card>

                {/* Reschedule Settings */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-orange-500" />
                            <CardTitle className="text-lg">Reschedule Settings</CardTitle>
                        </div>
                        <CardDescription>Request expiry and counter-proposal limits</CardDescription>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {grouped?.rescheduleSettings.map(policy => renderPolicyInput(policy))}
                    </CardContent>
                </Card>
            </div>

            {/* Reset Confirmation Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset All Policies?</DialogTitle>
                        <DialogDescription>
                            This will reset all session policies to their default values. This action is logged and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
                            {isResetting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Reset All Policies
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
