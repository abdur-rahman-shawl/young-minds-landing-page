"use client";

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Book, FileText, Link as LinkIcon, CheckCircle2, XCircle, Search, 
  Eye, Clock, AlertCircle, ChevronDown, ChevronUp, Flag, Archive, 
  Trash2, RotateCw, ShieldAlert, MoreHorizontal, FileWarning
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  useAdminContentListQuery,
  useAdminContentReviewMutation,
  type AdminContentAction as AdminAction,
  type AdminContentItem,
} from '@/hooks/queries/use-admin-content-queries';

// Utility components
const getContentIcon = (type: string) => {
  switch (type) {
    case 'COURSE': return <Book className="h-4 w-4" />;
    case 'FILE': return <FileText className="h-4 w-4" />;
    case 'URL': return <LinkIcon className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: string) => {
  const map: Record<string, { className: string; label: string }> = {
    PENDING_REVIEW: { className: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending Review' },
    APPROVED: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
    REJECTED: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Rejected' },
    DRAFT: { className: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Draft' },
    ARCHIVED: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Archived' },
    FLAGGED: { className: 'bg-rose-100 text-rose-800 border-rose-200 shadow-[0_0_10px_rgba(225,29,72,0.2)]', label: 'Flagged' },
  };
  const badge = map[status] || { className: 'bg-gray-100 text-gray-800', label: status };
  return <Badge variant="outline" className={badge.className}>{badge.label}</Badge>;
};

// Content row component
function ContentRow({ 
  item, 
  onAction,
  onViewDetail 
}: {
  item: AdminContentItem;
  onAction: (id: string, action: AdminAction) => void;
  onViewDetail: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = item.content.status;

  // Determine allowed actions based on current status
  const canApprove = status === 'PENDING_REVIEW';
  const canReject = status === 'PENDING_REVIEW';
  const canFlag = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'].includes(status);
  const canUnflag = status === 'FLAGGED';
  const canForceApprove = ['DRAFT', 'REJECTED', 'FLAGGED'].includes(status);
  const canForceArchive = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED'].includes(status);
  const canRevokeApproval = status === 'APPROVED';
  const canDelete = true;

  return (
    <Card className={`mb-3 transition-colors ${status === 'FLAGGED' ? 'border-rose-200 bg-rose-50/10' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-9 w-9 ring-1 ring-border">
              <AvatarImage src={item.mentorImage || undefined} />
              <AvatarFallback className="bg-primary/5">{item.mentorName?.charAt(0) || 'M'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{getContentIcon(item.content.type)}</span>
                <h4 className="font-semibold text-sm truncate">{item.content.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>by <span className="font-medium text-foreground">{item.mentorName}</span></span>
                <span>·</span>
                <span>
                  {item.content.submittedForReviewAt
                    ? `Submitted ${formatDistanceToNow(new Date(item.content.submittedForReviewAt), { addSuffix: true })}`
                    : `Created ${formatDistanceToNow(new Date(item.content.createdAt), { addSuffix: true })}`
                  }
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <div className="flex gap-2">
              {getStatusBadge(item.content.status)}
              <Badge variant="secondary" className="bg-secondary/50">{item.content.type}</Badge>
            </div>
            
            <div className="flex items-center">
              {status === 'PENDING_REVIEW' && (
                <div className="flex gap-1 mr-2">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => onAction(item.content.id, 'APPROVE')}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onAction(item.content.id, 'REJECT')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canForceApprove && (
                    <DropdownMenuItem onClick={() => onAction(item.content.id, 'FORCE_APPROVE')}>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      Force Approve
                    </DropdownMenuItem>
                  )}
                  {canRevokeApproval && (
                    <DropdownMenuItem onClick={() => onAction(item.content.id, 'REVOKE_APPROVAL')}>
                      <XCircle className="mr-2 h-4 w-4 text-red-600" />
                      Revoke Approval
                    </DropdownMenuItem>
                  )}
                  {canFlag && (
                    <DropdownMenuItem onClick={() => onAction(item.content.id, 'FLAG')} className="text-rose-600 focus:text-rose-700">
                      <Flag className="mr-2 h-4 w-4" />
                      Flag for Violation
                    </DropdownMenuItem>
                  )}
                  {canUnflag && (
                    <DropdownMenuItem onClick={() => onAction(item.content.id, 'UNFLAG')}>
                      <RotateCw className="mr-2 h-4 w-4" />
                      Unflag Content
                    </DropdownMenuItem>
                  )}
                  {canForceArchive && (
                    <DropdownMenuItem onClick={() => onAction(item.content.id, 'FORCE_ARCHIVE')}>
                      <Archive className="mr-2 h-4 w-4" />
                      Force Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onViewDetail(item.content.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onAction(item.content.id, 'FORCE_DELETE')}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete (30-day Retention)
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 ml-1"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2">
            {item.content.description && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm bg-muted/30 p-3 rounded-md">{item.content.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.content.reviewNote && (
                <div className="flex flex-col p-3 bg-red-50/50 border border-red-100 rounded-md">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-800">Review Note</p>
                  </div>
                  <p className="text-sm text-red-700">{item.content.reviewNote}</p>
                </div>
              )}

              {item.content.flagReason && (
                <div className="flex flex-col p-3 bg-rose-50/50 border border-rose-100 rounded-md">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">Violation Flag Reason</p>
                  </div>
                  <p className="text-sm text-rose-700">{item.content.flagReason}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-md">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Created: {new Date(item.content.createdAt).toLocaleDateString()}
              </span>
              {item.content.submittedForReviewAt && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Submitted: {new Date(item.content.submittedForReviewAt).toLocaleDateString()}
                </span>
              )}
              {item.content.reviewedAt && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Reviewed: {new Date(item.content.reviewedAt).toLocaleDateString()}
                </span>
              )}
              {item.content.flaggedAt && (
                <span className="flex items-center gap-1.5 text-rose-600/80">
                  <Flag className="h-3.5 w-3.5" />
                  Flagged: {new Date(item.content.flaggedAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => onViewDetail(item.content.id)}>
                <Eye className="h-4 w-4 mr-2" />
                View Full Content
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main admin content component
export function AdminContent() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  
  // Dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<{ id: string, action: AdminAction } | null>(null);
  const [actionNote, setActionNote] = useState('');

  const { data, isLoading } = useAdminContentListQuery({ 
    status: activeTab, 
    page, 
    search: searchQuery || undefined,
    type: typeFilter
  });
  const reviewMutation = useAdminContentReviewMutation();

  const handleAction = useCallback((id: string, action: AdminAction) => {
    // Actions requiring a reason
    if (['REJECT', 'FLAG', 'REVOKE_APPROVAL', 'FORCE_DELETE'].includes(action)) {
      setCurrentAction({ id, action });
      setActionNote('');
      setActionDialogOpen(true);
      return;
    }

    if (action === 'APPROVE') {
      reviewMutation.mutate({ contentId: id, action });
      return;
    }

    if (action === 'FORCE_APPROVE') {
      if (confirm('Bypass review and force approve this content?')) {
        reviewMutation.mutate({ contentId: id, action });
      }
      return;
    }

    if (action === 'FORCE_ARCHIVE') {
      if (confirm('Force archive this content? It will be hidden from public view.')) {
        reviewMutation.mutate({ contentId: id, action });
      }
      return;
    }

    // Direct actions (UNFLAG)
    reviewMutation.mutate({ contentId: id, action });
  }, [reviewMutation]);

  const handleActionConfirm = useCallback(() => {
    if (!currentAction) return;
    
    if (!actionNote.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    
    reviewMutation.mutate(
      {
        contentId: currentAction.id,
        action: currentAction.action,
        note: actionNote,
      },
      {
        onSuccess: () => {
          setActionDialogOpen(false);
          setCurrentAction(null);
          setActionNote('');
        },
      }
    );
  }, [currentAction, actionNote, reviewMutation]);

  const handleViewDetail = useCallback((id: string) => {
    toast.info('Full detail view panel coming soon');
  }, []);

  const contentList = data?.data || [];
  const pagination = data?.pagination;

  // Render stats cards
  const renderStats = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">
              {/* Note: This would ideally come from a summary API, using current data for now if on ALL tab */}
              {activeTab === 'ALL' ? contentList.filter((c: AdminContentItem) => c.content.status === 'PENDING_REVIEW').length : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-800 flex items-center">
              <Flag className="h-4 w-4 mr-2" />
              Flagged Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">
              {activeTab === 'ALL' ? contentList.filter((c: AdminContentItem) => c.content.status === 'FLAGGED').length : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Total Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {activeTab === 'ALL' ? contentList.filter((c: AdminContentItem) => c.content.status === 'APPROVED').length : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
              <Book className="h-4 w-4 mr-2" />
              All Content Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {pagination?.totalCount || '-'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getActionDialogTitle = () => {
    switch (currentAction?.action) {
      case 'REJECT': return 'Reject Content';
      case 'FLAG': return 'Flag Content for Violation';
      case 'REVOKE_APPROVAL': return 'Revoke Approval';
      case 'FORCE_DELETE': return 'Delete Content (Soft Delete)';
      default: return 'Provide Reason';
    }
  };

  const getActionDialogDescription = () => {
    switch (currentAction?.action) {
      case 'REJECT': return 'Please provide a reason for rejection. This will be shown to the mentor so they can revise and resubmit.';
      case 'FLAG': return 'Explain why this content violates platform policies. It will be hidden from the public immediately.';
      case 'REVOKE_APPROVAL': return 'Why is this previously approved content having its approval revoked?';
      case 'FORCE_DELETE': return 'Provide a reason. This action soft-deletes content and schedules permanent purge after 30 days.';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Management Console</h1>
        <p className="text-muted-foreground mt-2">Platform-wide control over all mentor content submissions, states, and violations</p>
      </div>

      {renderStats()}

      <Card className="border-muted bg-muted/10 shadow-none">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content by title, description..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-background"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              className="flex h-10 w-full sm:w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="ALL">All Types</option>
              <option value="COURSE">Courses</option>
              <option value="FILE">Files</option>
              <option value="URL">URLs</option>
            </select>
            {/* Mentor filter could be added here in the future via an API lookup */}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }} className="w-full">
        <div className="border-b mb-6 overflow-x-auto pb-1 mt-4">
          <TabsList className="bg-transparent border-0 h-auto p-0 inline-flex w-max min-w-full justify-start space-x-6">
            <TabsTrigger 
              value="ALL"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              All Content
            </TabsTrigger>
            <TabsTrigger 
              value="PENDING_REVIEW"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Pending
            </TabsTrigger>
            <TabsTrigger 
              value="FLAGGED"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-rose-500 data-[state=active]:text-rose-600 data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              <Flag className="h-4 w-4 mr-1.5" />
              Flagged
            </TabsTrigger>
            <TabsTrigger 
              value="APPROVED"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Approved
            </TabsTrigger>
            <TabsTrigger 
              value="REJECTED"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Rejected
            </TabsTrigger>
            <TabsTrigger 
              value="DRAFT"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              Drafts
            </TabsTrigger>
            <TabsTrigger 
              value="ARCHIVED"
              className="px-2 py-2 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent data-[state=active]:bg-transparent pb-3"
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Archived
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0 outline-none">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-muted rounded w-20" />
                        <div className="h-8 bg-muted rounded w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contentList.length === 0 ? (
            <Card className="border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                {activeTab === 'PENDING_REVIEW' ? (
                  <>
                    <div className="h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Inbox Zero!</h3>
                    <p className="text-muted-foreground max-w-sm">There is no content waiting for review. You are all caught up here.</p>
                  </>
                ) : activeTab === 'FLAGGED' ? (
                  <>
                    <div className="h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                      <ShieldAlert className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Platform is Clean</h3>
                    <p className="text-muted-foreground max-w-sm">No flagged content items requiring attention.</p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-4">
                      <FileWarning className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Content Found</h3>
                    <p className="text-muted-foreground max-w-sm">
                      {searchQuery ? 'Your search returned no results. Try adjusting the keywords.' : `There are no content items in the ${activeTab.toLowerCase()} state.`}
                    </p>
                    {searchQuery && (
                      <Button variant="outline" className="mt-6" onClick={() => setSearchQuery('')}>Clear Search</Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {contentList.map((item: AdminContentItem) => (
                <ContentRow
                  key={item.content.id}
                  item={item}
                  onAction={handleAction}
                  onViewDetail={handleViewDetail}
                />
              ))}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-foreground">{Math.min(pagination.page * pagination.limit, pagination.totalCount)}</span> of <span className="text-foreground">{pagination.totalCount}</span> entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1.5 px-3">
                      <span className="text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Action reason dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className={currentAction?.action === 'FLAG' ? 'border-rose-200' : ''}>
          <DialogHeader>
            <DialogTitle className={currentAction?.action === 'FLAG' ? 'text-rose-600' : ''}>
              {getActionDialogTitle()}
            </DialogTitle>
            <DialogDescription>
              {getActionDialogDescription()}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="Type your reason here..."
            className="min-h-[120px]"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={
                currentAction?.action === 'FLAG' ||
                currentAction?.action === 'REJECT' ||
                currentAction?.action === 'REVOKE_APPROVAL' ||
                currentAction?.action === 'FORCE_DELETE'
                  ? 'destructive'
                  : 'default'
              } 
              onClick={handleActionConfirm}
              disabled={!actionNote.trim() || reviewMutation.isPending}
            >
              {reviewMutation.isPending ? 'Processing...' : 'Confirm Action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
