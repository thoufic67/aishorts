"use client";

import { useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import { Play, Pause, Volume2, VolumeX, Maximize, Upload, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoComposition } from "@/components/video-editor/video-composition";
import { ExternalAudioPlayer } from "@/components/video-editor/external-audio-player";
import { VideoFramesPanel } from "@/components/video-editor/video-frames-panel";
import { FileUpload } from "@/components/ui/file-upload";
import { Loading } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import type { Video, VideoSegment } from "@/types/video";
import { useVideoEditor, useVideoPlayer } from "@/hooks/use-video-editor";
import { ScrollArea } from "../ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface VideoPlayerPanelProps {
  projectId: string;
  // Legacy props for backward compatibility (optional)
  video?: Video;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  totalDuration?: number;
  selectedFrameIndex?: number;
  onFrameSelect?: (index: number) => void;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (insertAfterIndex: number, newSegment: VideoSegment) => void;
}

export function VideoPlayerPanel({
  projectId,
  // Legacy props (fallbacks)
  video: legacyVideo,
  isPlaying: legacyIsPlaying,
  onPlayPause: legacyOnPlayPause,
  currentTime: legacyCurrentTime,
  onTimeUpdate: legacyOnTimeUpdate,
  totalDuration: legacyTotalDuration,
  selectedFrameIndex: legacySelectedFrameIndex,
  onFrameSelect: legacyOnFrameSelect,
  onSegmentUpdate: legacyOnSegmentUpdate,
  onSegmentInsert: legacyOnSegmentInsert,
}: VideoPlayerPanelProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cleanup function to prevent destroy errors
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          // Properly cleanup the player reference
          if (typeof playerRef.current.pause === 'function') {
            playerRef.current.pause();
          }
          playerRef.current = null;
        } catch (error) {
          console.warn("Error during player cleanup:", error);
        }
      }
    };
  }, []);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadSegmentId, setUploadSegmentId] = useState<string | null>(null);

  // Use the new video editor hooks
  const {
    video,
    isLoading,
    error,
    updateSegment,
    uploadSegmentFile,
    uploadBase64File,
    refreshVideo,
  } = useVideoEditor({ projectId });

  const {
    isPlaying,
    currentTime,
    selectedFrameIndex,
    totalDuration,
    currentSegmentInfo,
    togglePlayPause,
    updateCurrentTime,
    selectFrame,
  } = useVideoPlayer(video);

  // Use legacy props as fallbacks if video editor hooks fail
  const effectiveVideo = video || legacyVideo;
  const effectiveIsPlaying = video ? isPlaying : (legacyIsPlaying ?? false);
  const effectiveCurrentTime = video ? currentTime : (legacyCurrentTime ?? 0);
  const effectiveTotalDuration = video ? totalDuration : (legacyTotalDuration ?? 0);
  const effectiveSelectedFrameIndex = video ? selectedFrameIndex : (legacySelectedFrameIndex ?? 0);
  
  const effectiveOnPlayPause = video ? togglePlayPause : (legacyOnPlayPause ?? (() => {}));
  const effectiveOnTimeUpdate = video ? updateCurrentTime : (legacyOnTimeUpdate ?? (() => {}));
  const effectiveOnFrameSelect = video ? selectFrame : (legacyOnFrameSelect ?? (() => {}));

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <Loading size="lg" />
          <p className="text-foreground/70">Loading video project...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">Failed to load video project</p>
          <p className="text-foreground/70 text-sm">{error.message}</p>
          <Button onClick={refreshVideo} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!effectiveVideo) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground/70">No video project found</p>
          <Button onClick={refreshVideo} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Calculate frame number for display
  const fps = 30;
  const totalFrames = Math.max(1, Math.floor(effectiveTotalDuration * fps)); // Ensure at least 1 frame

  // Enhanced segment update handler
  const handleSegmentUpdate = async (index: number, updatedSegment: VideoSegment) => {
    if (video && updateSegment) {
      await updateSegment(index, updatedSegment);
    } else if (legacyOnSegmentUpdate) {
      legacyOnSegmentUpdate(index, updatedSegment);
    }
  };

  // File upload handler
  const handleFileUpload = (segmentId: string) => {
    setUploadSegmentId(segmentId);
    setShowFileUpload(true);
  };

  // Sync the Remotion player with our play/pause state
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.play === 'function') {
      if (effectiveIsPlaying) {
        try {
          playerRef.current.play();
        } catch (error) {
          console.warn("Failed to play Remotion player:", error);
        }
      } else {
        try {
          playerRef.current.pause();
        } catch (error) {
          console.warn("Failed to pause Remotion player:", error);
        }
      }
    }
  }, [effectiveIsPlaying]);

  // Update Remotion player time when currentTime changes (debounced)
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      const timeoutId = setTimeout(() => {
        try {
          const targetFrame = Math.round(effectiveCurrentTime * fps);
          playerRef.current.seekTo(targetFrame);
        } catch (error) {
          console.warn("Failed to seek Remotion player:", error);
        }
      }, 50); // Debounce seeks by 50ms

      return () => clearTimeout(timeoutId);
    }
  }, [effectiveCurrentTime, fps]);

  // Mute Remotion player since audio is handled externally
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.setVolume(0); // Always mute Remotion player
      } catch (error) {
        console.warn("Failed to set volume on Remotion player:", error);
      }
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Create a timer to update currentTime when playing
  useEffect(() => {
    if (!effectiveIsPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentFrame === 'function') {
        try {
          const frame = playerRef.current.getCurrentFrame() || 0;
          const newTime = frame / fps;
          if (newTime <= effectiveTotalDuration) {
            effectiveOnTimeUpdate(newTime);
          } else {
            // Video ended - pause playback and reset time
            effectiveOnPlayPause(); // This will set isPlaying to false, stopping all audio
            effectiveOnTimeUpdate(0);
          }
        } catch (error) {
          // Handle any potential player errors
          console.warn("Player time update error:", error);
        }
      }
    }, 1000 / 30); // Update at 30fps

    return () => clearInterval(interval);
  }, [effectiveIsPlaying, fps, effectiveTotalDuration]); // Remove function dependencies to prevent infinite loop

  const toggleFullscreen = () => {
    const doc = document as any;
    const isCurrentlyFullscreen =
      document.fullscreenElement != null || doc.webkitFullscreenElement != null;

    if (isCurrentlyFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      return;
    }

    const el = containerRef.current as any;
    if (!el) return;

    try {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen request failed", error);
    }
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {/* External Audio Player - Handles all audio playback */}
      <ExternalAudioPlayer
        segments={effectiveVideo.segments}
        isPlaying={effectiveIsPlaying}
        currentTime={effectiveCurrentTime}
        backgroundMusicUrl="/demo/temporex.mp3"
        volume={volume}
        isMuted={isMuted}
      />

      {/* Video Player Area */}
      <div className="mx-auto flex h-full flex-1 items-center justify-center p-4">
        <div className="relative mx-auto h-full">
          {/* Video Container */}
          <div
            ref={containerRef}
            className="relative aspect-[9/16] h-full max-h-[70vh] overflow-hidden rounded-2xl bg-black shadow-2xl"
          >
            {/* Remotion Player */}
            <Player
              className="h-80 w-full"
              ref={playerRef}
              component={VideoComposition}
              durationInFrames={totalFrames}
              compositionWidth={effectiveVideo.format.width}
              compositionHeight={effectiveVideo.format.height}
              fps={fps}
              style={{
                width: "100%",
                height: "100%",
              }}
              inputProps={{
                video: effectiveVideo,
              }}
              autoPlay={false}
              controls={false}
              loop={false}
              allowFullscreen
              doubleClickToFullscreen
              showVolumeControls={false}
              spaceKeyToPlayOrPause={false}
            />

            {/* Play/Pause overlay */}
            {!effectiveIsPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={effectiveOnPlayPause}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-background/20 p-0 text-background shadow-lg backdrop-blur-sm hover:bg-background/30"
                >
                  <Play className="ml-1 h-8 w-8" />
                </Button>
              </div>
            )}

            {/* Database status indicator */}
            {video && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  Database
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls and Segment Timeline */}
      <div className="mx-auto w-full p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={effectiveOnPlayPause}
                size="sm"
                variant="ghost"
                className="text-default hover:bg-default/20 h-10 w-10 rounded-full bg-white/10"
              >
                {effectiveIsPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" />
                )}
              </Button>

              <div className="text-default/70 flex items-center gap-2 text-sm">
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="ghost"
                  size="sm"
                  className="text-default/70 hover:text-default"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    setIsMuted(newVolume === 0);
                  }}
                  className="w-20 accent-blue-500"
                />
              </div>
            </div>

            {/* Time Display */}
            <div className="text-default/70 flex items-center gap-4 font-mono text-sm">
              <span>
                {formatTime(effectiveCurrentTime)} / {formatTime(effectiveTotalDuration)}
              </span>
              {currentSegmentInfo && (
                <Badge variant="outline" className="text-xs">
                  Segment {currentSegmentInfo.index + 1}
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-default/70 hover:text-default"
              onClick={toggleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="bg-default/20 h-1 w-full rounded-full">
              <div
                className="h-1 rounded-full bg-blue-500 transition-all duration-150"
                style={{ width: `${(effectiveCurrentTime / effectiveTotalDuration) * 100}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-blue-500 shadow-md"
              style={{ left: `${(effectiveCurrentTime / effectiveTotalDuration) * 100}%` }}
            />
          </div>

          {/* Horizontal Segment Panel */}
          <VideoFramesPanel
            segments={effectiveVideo.segments}
            selectedFrameIndex={effectiveSelectedFrameIndex}
            onFrameSelect={effectiveOnFrameSelect}
            currentTime={effectiveCurrentTime}
            totalDuration={effectiveTotalDuration}
            onSegmentUpdate={handleSegmentUpdate}
            onSegmentInsert={legacyOnSegmentInsert}
            orientation="horizontal"
            showHeader={false}
          />
        </div>
      </div>

      {/* File Upload Dialog */}
      <Dialog open={showFileUpload} onOpenChange={setShowFileUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          {uploadSegmentId && (
            <FileUpload
              projectId={projectId}
              segmentId={uploadSegmentId}
              onUploadComplete={(file) => {
                toast.success(`${file.originalName} uploaded successfully`);
                setShowFileUpload(false);
                setUploadSegmentId(null);
              }}
              onUploadError={(error) => {
                toast.error(`Upload failed: ${error}`);
              }}
              multiple={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
