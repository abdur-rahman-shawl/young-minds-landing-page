'use client';

import {
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
  MediaDurationDisplay,
  MediaPosterImage,
  MediaLoadingIndicator,
} from 'media-chrome/react';
import type { ComponentProps, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type VideoPlayerProps = ComponentProps<typeof MediaController> & {
  src: string;
  poster?: string;
  className?: string;
};

const variables = {
  '--media-primary-color': 'hsl(var(--primary))',
  '--media-secondary-color': 'hsl(var(--secondary))',
  '--media-text-color': 'hsl(var(--foreground))',
  '--media-background-color': 'hsl(var(--background))',
  '--media-control-background': 'rgba(0, 0, 0, 0.7)',
  '--media-control-hover-background': 'hsl(var(--accent))',
  '--media-font-family': 'var(--font-sans)',
  '--media-range-track-background': 'hsl(var(--border))',
  '--media-range-thumb-background': 'hsl(var(--primary))',
  '--media-range-bar-color': 'hsl(var(--primary))',
  '--media-font-size': '14px',
  '--media-font-weight': '500',
} as CSSProperties;

export const VideoPlayer = ({ 
  src, 
  poster, 
  className, 
  style, 
  children,
  ...props 
}: VideoPlayerProps) => (
  <MediaController
    className={cn("w-full rounded-lg overflow-hidden bg-black", className)}
    style={{
      ...variables,
      ...style,
    }}
    {...props}
  >
    <video
      slot="media"
      src={src}
      poster={poster}
      playsInline
      className="w-full h-full object-cover"
    />
    
    {poster && (
      <MediaPosterImage
        slot="poster"
        src={poster}
        className="w-full h-full object-cover"
      />
    )}

    <MediaLoadingIndicator slot="centered-chrome" className="text-white" />

    {children}
  </MediaController>
);

export const VideoPlayerControlBar = ({ className, children, ...props }: ComponentProps<typeof MediaControlBar>) => (
  <MediaControlBar 
    className={cn("absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4", className)}
    {...props}
  >
    {children}
  </MediaControlBar>
);

export const VideoPlayerTimeRange = ({ className, ...props }: ComponentProps<typeof MediaTimeRange>) => (
  <MediaTimeRange 
    className={cn("w-full mb-3 h-2 cursor-pointer", className)}
    {...props}
  />
);

export const VideoPlayerPlayButton = ({ className, ...props }: ComponentProps<typeof MediaPlayButton>) => (
  <MediaPlayButton 
    className={cn("w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors", className)}
    {...props}
  />
);

export const VideoPlayerSeekBackwardButton = ({ className, ...props }: ComponentProps<typeof MediaSeekBackwardButton>) => (
  <MediaSeekBackwardButton 
    seekOffset={10}
    className={cn("w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors", className)}
    {...props}
  />
);

export const VideoPlayerSeekForwardButton = ({ className, ...props }: ComponentProps<typeof MediaSeekForwardButton>) => (
  <MediaSeekForwardButton 
    seekOffset={10}
    className={cn("w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors", className)}
    {...props}
  />
);

export const VideoPlayerMuteButton = ({ className, ...props }: ComponentProps<typeof MediaMuteButton>) => (
  <MediaMuteButton 
    className={cn("w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors", className)}
    {...props}
  />
);

export const VideoPlayerVolumeRange = ({ className, ...props }: ComponentProps<typeof MediaVolumeRange>) => (
  <MediaVolumeRange 
    className={cn("w-16 h-1 cursor-pointer", className)}
    {...props}
  />
);

export const VideoPlayerTimeDisplay = ({ className, ...props }: ComponentProps<typeof MediaTimeDisplay>) => (
  <MediaTimeDisplay 
    className={cn("text-white text-sm tabular-nums", className)}
    {...props}
  />
);

export const VideoPlayerDurationDisplay = ({ className, ...props }: ComponentProps<typeof MediaDurationDisplay>) => (
  <MediaDurationDisplay 
    className={cn("text-white text-sm tabular-nums", className)}
    {...props}
  />
);

export const VideoPlayerFullscreenButton = ({ className, ...props }: ComponentProps<typeof MediaFullscreenButton>) => (
  <MediaFullscreenButton 
    className={cn("w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors", className)}
    {...props}
  />
);

// Complete Video Player with Default Controls
export const VideoPlayerComplete = ({ src, poster, className, ...props }: VideoPlayerProps) => (
  <VideoPlayer src={src} poster={poster} className={className} {...props}>
    <VideoPlayerControlBar>
      {/* Progress bar */}
      <VideoPlayerTimeRange />

      {/* Control buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <VideoPlayerPlayButton />
          <VideoPlayerSeekBackwardButton />
          <VideoPlayerSeekForwardButton />
          
          <div className="flex items-center space-x-2 ml-4">
            <VideoPlayerMuteButton />
            <VideoPlayerVolumeRange />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <VideoPlayerTimeDisplay />
            <span className="text-white text-sm">/</span>
            <VideoPlayerDurationDisplay />
          </div>
          <VideoPlayerFullscreenButton />
        </div>
      </div>
    </VideoPlayerControlBar>
  </VideoPlayer>
);