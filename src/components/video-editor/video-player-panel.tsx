"use client";

import { useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoComposition } from "@/components/video-editor/video-composition";
import { VideoFramesPanel } from "@/components/video-editor/video-frames-panel";
import { FileUpload } from "@/components/ui/file-upload";
import { Loading } from "@/components/ui/loading";
import type { Video, VideoSegment } from "@/types/video";
import { useVideoEditor, useVideoPlayer } from "@/hooks/use-video-editor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface VideoPlayerPanelProps {
  projectId: string;
  // Optional handlers for segment operations
  onSegmentInsert?: (
    insertAfterIndex: number,
    newSegment: VideoSegment,
  ) => void;
}

export function VideoPlayerPanel({
  projectId,
  onSegmentInsert,
}: VideoPlayerPanelProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Cleanup function to prevent destroy errors
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          // Properly cleanup the player reference
          if (typeof playerRef.current.pause === "function") {
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <div className="space-y-4 text-center">
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
        <div className="space-y-4 text-center">
          <p className="text-destructive">Failed to load video project</p>
          <p className="text-sm text-foreground/70">{error.message}</p>
          <Button onClick={refreshVideo} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!video) {
    return (
      <div className="flex h-full w-full flex-1 items-center justify-center">
        <div className="space-y-4 text-center">
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
  const totalFrames = Math.max(1, Math.floor(totalDuration * fps)); // Ensure at least 1 frame

  // Enhanced segment update handler
  const handleSegmentUpdate = async (
    index: number,
    updatedSegment: VideoSegment,
  ) => {
    if (video && updateSegment) {
      await updateSegment(index, updatedSegment);
    }
  };

  // File upload handler
  const handleFileUpload = (segmentId: string) => {
    setUploadSegmentId(segmentId);
    setShowFileUpload(true);
  };

  // Create a timer to update currentTime when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentFrame === "function"
      ) {
        try {
          const frame = playerRef.current.getCurrentFrame() || 0;
          const newTime = frame / fps;
          if (newTime <= totalDuration) {
            updateCurrentTime(newTime);
          } else {
            // Video ended - pause playback and reset time
            togglePlayPause(); // This will set isPlaying to false, stopping all audio
            updateCurrentTime(0);
          }
        } catch (error) {
          // Handle any potential player errors
          console.warn("Player time update error:", error);
        }
      }
    }, 1000 / 30); // Update at 30fps

    return () => clearInterval(interval);
  }, [isPlaying, fps, totalDuration, updateCurrentTime, togglePlayPause]);

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {/* External Audio Player - Handles all audio playback */}
      {/* <ExternalAudioPlayer
        segments={video.segments}
        isPlaying={isPlaying}
        currentTime={currentTime}
        backgroundMusicUrl="/demo/temporex.mp3"
        volume={volume}
        isMuted={isMuted}
      /> */}

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
              compositionWidth={video.format.width}
              compositionHeight={video.format.height}
              fps={fps}
              style={{
                width: "100%",
                height: "100%",
              }}
              inputProps={{
                video: video,
              }}
              autoPlay={false}
              controls={true}
              loop={false}
              allowFullscreen
              doubleClickToFullscreen
              showVolumeControls={true}
              spaceKeyToPlayOrPause={false}
            />
            {/* Play/Pause overlay */}
            {/* {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={togglePlayPause}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-background/20 p-0 text-background shadow-lg backdrop-blur-sm hover:bg-background/30"
                >
                  <Play className="ml-1 h-8 w-8" />
                </Button>
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Bottom Controls and Segment Timeline */}
      <div className="mx-auto w-full p-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Playback Controls */}
          {/* <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                onClick={togglePlayPause}
                size="sm"
                variant="ghost"
                className="text-default hover:bg-default/20 h-10 w-10 rounded-full bg-white/10"
              >
                {isPlaying ? (
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

            <div className="text-default/70 flex items-center gap-4 font-mono text-sm">
              <span>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
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
          </div> */}

          {/* Progress Bar */}
          {/* <div className="relative">
            <div className="bg-default/20 h-1 w-full rounded-full">
              <div
                className="h-1 rounded-full bg-blue-500 transition-all duration-150"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-blue-500 shadow-md"
              style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div> */}

          {/* Horizontal Segment Panel */}
          <VideoFramesPanel
            segments={video.segments}
            selectedFrameIndex={selectedFrameIndex}
            onFrameSelect={selectFrame}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onSegmentUpdate={handleSegmentUpdate}
            onSegmentInsert={onSegmentInsert}
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
