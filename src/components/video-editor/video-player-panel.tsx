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
      {/* Video Player Area */}
      <div className="mx-auto flex h-full flex-1 items-center justify-center p-4">
        <div className="relative mx-auto h-full">
          {/* Video Container */}
          <div
            ref={containerRef}
            className="relative aspect-[9/16] h-full overflow-hidden rounded-2xl bg-black shadow-2xl"
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
          </div>
        </div>
      </div>

      {/* Bottom Controls and Segment Timeline */}
      <div className="mx-auto w-full p-4">
        <div className="mx-auto max-w-4xl space-y-4">
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
