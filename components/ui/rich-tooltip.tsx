'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Play, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoMetadata {
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  channel?: string;
  platform?: 'youtube' | 'vimeo' | 'other';
}

interface RichTooltipProps {
  children: React.ReactNode;
  url: string;
  title?: string;
  description?: string;
  className?: string;
}

// Function to extract video metadata from URL
const extractVideoMetadata = async (url: string): Promise<VideoMetadata> => {
  // YouTube URL patterns
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const youtubeMatch = url.match(youtubeRegex);
  
  // Vimeo URL patterns  
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/;
  const vimeoMatch = url.match(vimeoRegex);

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      title: 'YouTube Video',
      description: 'Click to watch on YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      platform: 'youtube'
    };
  } else if (vimeoMatch) {
    return {
      title: 'Vimeo Video',
      description: 'Click to watch on Vimeo',
      thumbnail: '/placeholder-video.jpg', // Would need Vimeo API for actual thumbnail
      platform: 'vimeo'
    };
  } else {
    return {
      title: 'External Link',
      description: 'Click to open in new tab',
      platform: 'other'
    };
  }
};

export function RichTooltip({ children, url, title, description, className }: RichTooltipProps) {
  const [metadata, setMetadata] = useState<VideoMetadata>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const meta = await extractVideoMetadata(url);
        setMetadata(meta);
      } catch (error) {
        console.error('Error fetching video metadata:', error);
        setMetadata({
          title: 'External Link',
          description: 'Click to open in new tab',
          platform: 'other'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  const isVideo = metadata.platform === 'youtube' || metadata.platform === 'vimeo';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="center"
          className="p-0 border-0 bg-transparent shadow-lg"
          sideOffset={5}
        >
          <Card className="w-80 overflow-hidden shadow-xl border border-border/50">
            {/* Thumbnail/Header */}
            {isVideo && metadata.thumbnail ? (
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title || title || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if thumbnail fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  </div>
                </div>
                {metadata.platform && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs bg-black/70 text-white border-0"
                  >
                    {metadata.platform.charAt(0).toUpperCase() + metadata.platform.slice(1)}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="h-20 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-white" />
              </div>
            )}

            <CardContent className="p-4">
              <div className="space-y-2">
                {/* Title */}
                <h3 className="font-semibold text-sm line-clamp-2 text-foreground">
                  {title || metadata.title || 'External Link'}
                </h3>

                {/* Description */}
                {(description || metadata.description) && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {description || metadata.description}
                  </p>
                )}

                {/* URL display */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">
                    {new URL(url).hostname}
                  </span>
                </div>

                {/* Video metadata */}
                {isVideo && (
                  <div className="flex items-center gap-3 pt-1">
                    {metadata.duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{metadata.duration}</span>
                      </div>
                    )}
                    {metadata.views && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span>{metadata.views}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action hint */}
                <div className="text-xs text-muted-foreground/70 mt-2">
                  Click to open in new tab
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}