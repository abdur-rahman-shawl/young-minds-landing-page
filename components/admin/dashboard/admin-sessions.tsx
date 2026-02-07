"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    CalendarClock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    DollarSign,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    Ban,
    CheckSquare,
    CreditCard,
    Loader2,
} from "lucide-react";

// Types
interface SessionUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
}

interface Session {
    id: string;
    title: string;
    description: string | null;
    status: string;
    scheduledAt: string;
    duration: number | null;
    meetingType: string | null;
    rate: string | null;
    currency: string | null;
    cancelledBy: string | null;
    cancellationReason: string | null;
    rescheduleCount: number;
    mentorRescheduleCount: number;
    refundAmount: string | null;
    refundPercentage: number | null;
    refundStatus: string | null;
    wasReassigned: boolean;
    reassignmentStatus: string | null;
    pendingRescheduleBy: string | null;
    createdAt: string;
    mentor: SessionUser | null;
    mentee: SessionUser | null;
}

interface SessionStats {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowCount: number;
    noShowRate: number;
    avgSessionRating: number;
    totalRevenue: number;
    refundsIssued: number;
    netRevenue: number;
    sessionsToday: number;
    pendingReschedules: number;
    cancellationsByMentor: number;
    cancellationsByMentee: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// Status badge colors
const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export function AdminSessions() {
    const { toast } = useToast();

    // State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [stats, setStats] = useState<SessionStats | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Action dialogs
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [actionDialog, setActionDialog] = useState<string | null>(null);
    const [actionReason, setActionReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [refundAmount, setRefundAmount] = useState("");

    // Fetch sessions
    const fetchSessions = async (page = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });

            if (statusFilter && statusFilter !== "all") {
                params.set("status", statusFilter);
            }

            const response = await fetch(`/api/admin/sessions?${params}`);
            const data = await response.json();

            if (data.success) {
                setSessions(data.data.sessions);
                setPagination(data.data.pagination);
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to fetch sessions", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch stats
    const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
            const response = await fetch("/api/admin/sessions/stats");
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchSessions();
        fetchStats();
    }, []);

    useEffect(() => {
        fetchSessions(1);
    }, [statusFilter]);

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Handle action
    const handleAction = async () => {
        if (!selectedSession || !actionDialog) return;

        setActionLoading(true);
        try {
            let endpoint = "";
            let body: any = { reason: actionReason };

            switch (actionDialog) {
                case "cancel":
                    endpoint = `/api/admin/sessions/${selectedSession.id}/cancel`;
                    body.refundPercentage = 100;
                    break;
                case "complete":
                    endpoint = `/api/admin/sessions/${selectedSession.id}/complete`;
                    break;
                case "refund":
                    endpoint = `/api/admin/sessions/${selectedSession.id}/refund`;
                    body.amount = parseFloat(refundAmount);
                    body.refundType = "partial";
                    break;
                case "clearNoShow":
                    endpoint = `/api/admin/sessions/${selectedSession.id}/clear-no-show`;
                    body.restoreStatus = "completed";
                    break;
                default:
                    return;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.success) {
                toast({ title: "Success", description: data.message });
                setActionDialog(null);
                setSelectedSession(null);
                setActionReason("");
                setRefundAmount("");
                fetchSessions(pagination.page);
                fetchStats();
            } else {
                toast({ title: "Error", description: data.error, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Action failed", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage all platform sessions</p>
                </div>
                <Button variant="outline" onClick={() => { fetchSessions(pagination.page); fetchStats(); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-blue-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.totalSessions || 0}</p>
                                <p className="text-xs text-gray-500">Total Sessions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.completedSessions || 0}</p>
                                <p className="text-xs text-gray-500">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.cancelledSessions || 0}</p>
                                <p className="text-xs text-gray-500">Cancelled</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <div>
                                <p className="text-2xl font-bold">{stats?.noShowRate?.toFixed(1) || 0}%</p>
                                <p className="text-xs text-gray-500">No-Show Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            <div>
                                <p className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(0) || 0}</p>
                                <p className="text-xs text-gray-500">Total Revenue</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-purple-500" />
                            <div>
                                <p className="text-2xl font-bold">${stats?.refundsIssued?.toFixed(0) || 0}</p>
                                <p className="text-xs text-gray-500">Refunds</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search sessions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Sessions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Sessions</CardTitle>
                    <CardDescription>
                        Showing {sessions.length} of {pagination.total} sessions
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Session</TableHead>
                                        <TableHead>Mentor</TableHead>
                                        <TableHead>Mentee</TableHead>
                                        <TableHead>Scheduled</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium truncate max-w-[200px]">{session.title}</p>
                                                    <p className="text-xs text-gray-500">{session.id.slice(0, 8)}...</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={session.mentor?.image || undefined} />
                                                        <AvatarFallback>{session.mentor?.name?.charAt(0) || "M"}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate max-w-[100px]">{session.mentor?.name || "Unknown"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={session.mentee?.image || undefined} />
                                                        <AvatarFallback>{session.mentee?.name?.charAt(0) || "M"}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm truncate max-w-[100px]">{session.mentee?.name || "Unknown"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{formatDate(session.scheduledAt)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[session.status] || "bg-gray-100"}>
                                                    {session.status.replace("_", " ")}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">${session.rate || "0"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {session.status === "scheduled" && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedSession(session);
                                                                    setActionDialog("cancel");
                                                                }}
                                                                title="Force Cancel"
                                                            >
                                                                <Ban className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedSession(session);
                                                                    setActionDialog("complete");
                                                                }}
                                                                title="Force Complete"
                                                            >
                                                                <CheckSquare className="w-4 h-4 text-green-500" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {session.status === "no_show" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedSession(session);
                                                                setActionDialog("clearNoShow");
                                                            }}
                                                            title="Clear No-Show"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                                                        </Button>
                                                    )}
                                                    {session.status !== "cancelled" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedSession(session);
                                                                setRefundAmount(session.rate || "0");
                                                                setActionDialog("refund");
                                                            }}
                                                            title="Issue Refund"
                                                        >
                                                            <CreditCard className="w-4 h-4 text-purple-500" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-gray-500">
                                    Page {pagination.page} of {pagination.totalPages}
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page <= 1}
                                        onClick={() => fetchSessions(pagination.page - 1)}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() => fetchSessions(pagination.page + 1)}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Action Dialogs */}
            <Dialog open={actionDialog === "cancel"} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Force Cancel Session</DialogTitle>
                        <DialogDescription>
                            This will cancel the session and issue a 100% refund to the mentee.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Session</Label>
                            <p className="text-sm text-gray-600">{selectedSession?.title}</p>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason (required)</Label>
                            <Textarea
                                id="reason"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason for cancellation..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleAction}
                            disabled={!actionReason || actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Force Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === "complete"} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Force Complete Session</DialogTitle>
                        <DialogDescription>
                            Mark this session as completed. Use this for stuck sessions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Session</Label>
                            <p className="text-sm text-gray-600">{selectedSession?.title}</p>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason (required)</Label>
                            <Textarea
                                id="reason"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason for marking complete..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
                        <Button
                            onClick={handleAction}
                            disabled={!actionReason || actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Mark Complete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === "refund"} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue Manual Refund</DialogTitle>
                        <DialogDescription>
                            Issue a refund for this session outside the normal flow.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Session</Label>
                            <p className="text-sm text-gray-600">{selectedSession?.title}</p>
                        </div>
                        <div>
                            <Label htmlFor="amount">Refund Amount ($)</Label>
                            <Input
                                id="amount"
                                type="number"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason (required)</Label>
                            <Textarea
                                id="reason"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason for refund..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
                        <Button
                            onClick={handleAction}
                            disabled={!actionReason || !refundAmount || actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Issue Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={actionDialog === "clearNoShow"} onOpenChange={() => setActionDialog(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Clear No-Show Flag</DialogTitle>
                        <DialogDescription>
                            Remove the no-show status and restore this session to completed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Session</Label>
                            <p className="text-sm text-gray-600">{selectedSession?.title}</p>
                        </div>
                        <div>
                            <Label htmlFor="reason">Reason (required)</Label>
                            <Textarea
                                id="reason"
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter reason for clearing no-show flag..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
                        <Button
                            onClick={handleAction}
                            disabled={!actionReason || actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Clear No-Show
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
