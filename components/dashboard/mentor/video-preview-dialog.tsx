"use client";

import React from 'react';
import { Play, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/ui/kibo-video-player";

interface VideoPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title: string;
  description?: string;
}

export function VideoPreviewDialog({
  open,
  onOpenChange,
  videoUrl,
  title,
  description,
}: VideoPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Video Preview: {title}
              </DialogTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-4">
          {videoUrl ? (
            <div className="aspect-video w-full">
              <VideoPlayer
                src={videoUrl}
                className="w-full h-full"
                onTimeUpdate={(currentTime, duration) => {
                  // Optional: Track video progress for analytics
                  console.log(`Video progress: ${Math.round((currentTime / duration) * 100)}%`);
                }}
                onPlay={() => {
                  console.log('Video started playing');
                }}
                onPause={() => {
                  console.log('Video paused');
                }}
                onEnded={() => {
                  console.log('Video ended');
                }}
              />
            </div>
          ) : (
            <div className="aspect-video w-full bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Video not available</p>
              </div>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Tip:</strong> Use spacebar to play/pause, arrow keys to seek forward/backward, and 'f' for fullscreen.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}