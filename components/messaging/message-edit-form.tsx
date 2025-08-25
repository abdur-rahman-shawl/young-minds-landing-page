'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';

interface MessageEditFormProps {
  originalContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export function MessageEditForm({ originalContent, onSave, onCancel }: MessageEditFormProps) {
  const [content, setContent] = useState(originalContent);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select all text when entering edit mode
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleSave = async () => {
    if (!content.trim() || content.trim() === originalContent.trim()) {
      onCancel();
      return;
    }

    setIsSaving(true);
    await onSave(content.trim());
    setIsSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] resize-none"
        placeholder="Type your message..."
        disabled={isSaving}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isSaving || !content.trim() || content.trim() === originalContent.trim()}
            className="h-7 px-2"
          >
            <Check className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={isSaving}
            className="h-7 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
        <span className="ml-auto">
          Press Esc to cancel, Ctrl+Enter to save
        </span>
      </div>
    </div>
  );
}