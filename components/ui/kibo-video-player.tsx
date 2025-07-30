'use client';

import React, { forwardRef, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  poster?: string;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ 
    src, 
    poster, 
    className, 
    onTimeUpdate,
    onPlay,
    onPause,
    onEnded,
    ...props 
  }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleLoadedMetadata = () => {
        setDuration(video.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(video.currentTime, video.duration);
      };

      const handlePlay = () => {
        setIsPlaying(true);
        onPlay?.();
      };

      const handlePause = () => {
        setIsPlaying(false);
        onPause?.();
      };

      const handleEnded = () => {
        setIsPlaying(false);
        onEnded?.();
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('ended', handleEnded);
      };
    }, [onTimeUpdate, onPlay, onPause, onEnded]);

    const togglePlay = () => {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    };

    const toggleMute = () => {
      const video = videoRef.current;
      if (!video) return;

      video.muted = !video.muted;
      setIsMuted(video.muted);
    };

    const handleVolumeChange = (value: number[]) => {
      const video = videoRef.current;
      if (!video) return;

      const newVolume = value[0];
      video.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    };

    const handleSeek = (value: number[]) => {
      const video = videoRef.current;
      if (!video) return;

      const newTime = value[0];
      video.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const skipForward = () => {
      const video = videoRef.current;
      if (!video) return;

      video.currentTime = Math.min(video.currentTime + 10, video.duration);
    };

    const skipBackward = () => {
      const video = videoRef.current;
      if (!video) return;

      video.currentTime = Math.max(video.currentTime - 10, 0);
    };

    const toggleFullscreen = () => {
      const video = videoRef.current;
      if (!video) return;

      if (!document.fullscreenElement) {
        video.requestFullscreen();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    };

    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
      <div 
        className={cn(
          "relative group bg-black rounded-lg overflow-hidden",
          className
        )}
        onMouseMove={showControlsTemporarily}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (isPlaying) {
            setShowControls(false);
          }
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-cover"
          playsInline
          {...props}
        />

        {/* Play button overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <button
              onClick={togglePlay}
              className="w-16 h-16 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            >
              <Play className="w-8 h-8 ml-1" />
            </button>
          </div>
        )}

        {/* Controls */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress bar */}
          <div className="mb-4">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              {/* Skip buttons */}
              <button
                onClick={skipBackward}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              
              <button
                onClick={skipForward}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume controls */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors"
                >
                  {isMuted || volume === 0 ? 
                    <VolumeX className="w-4 h-4" /> : 
                    <Volume2 className="w-4 h-4" />
                  }
                </button>
                
                <div className="w-16">
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={handleVolumeChange}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Time display */}
              <div className="text-white text-sm tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded transition-colors"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export { VideoPlayer };
export type { VideoPlayerProps };