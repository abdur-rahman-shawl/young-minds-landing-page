'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Edit2, Copy, Trash2, Reply } from 'lucide-react';
import { toast } from 'sonner';

interface MessageActionsMenuProps {
  messageId: string;
  messageContent: string;
  isOwnMessage: boolean;
  isEdited: boolean;
  messageAge: number; // in milliseconds
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onCopy: () => void;
}

const EDIT_TIME_LIMIT = 15 * 60 * 1000; // 15 minutes

export function MessageActionsMenu({
  messageId,
  messageContent,
  isOwnMessage,
  isEdited,
  messageAge,
  onEdit,
  onDelete,
  onReply,
  onCopy,
}: MessageActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const canEdit = isOwnMessage && messageAge < EDIT_TIME_LIMIT;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success('Message copied to clipboard');
    onCopy();
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onReply}>
            <Reply className="mr-2 h-4 w-4" />
            Reply
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </DropdownMenuItem>

          {isOwnMessage && (
            <>
              <DropdownMenuSeparator />
              
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}