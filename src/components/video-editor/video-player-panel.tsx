"use client";

import { useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoComposition } from "@/components/video-editor/video-composition";
import { ExternalAudioPlayer } from "@/components/video-editor/external-audio-player";
import { VideoFramesPanel } from "@/components/video-editor/video-frames-panel";
import type { Video, VideoSegment } from "@/types/video";
import { ScrollArea } from "../ui/scroll-area";

interface VideoPlayerPanelProps {
  video: Video;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  totalDuration: number;
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (
    insertAfterIndex: number,
    newSegment: VideoSegment,
  ) => void;
}

export function VideoPlayerPanel({
  video,
  isPlaying,
  onPlayPause,
  currentTime,
  onTimeUpdate,
  totalDuration,
  selectedFrameIndex,
  onFrameSelect,
  onSegmentUpdate,
  onSegmentInsert,
}: VideoPlayerPanelProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Calculate frame number for display
  const fps = 30;
  const totalFrames = Math.floor(totalDuration * fps);

  // Sync the Remotion player with our play/pause state
  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Update Remotion player time when currentTime changes
  useEffect(() => {
    if (playerRef.current) {
      const targetFrame = Math.round(currentTime * fps);
      playerRef.current.seekTo(targetFrame);
    }
  }, [currentTime, fps]);

  // Mute Remotion player since audio is handled externally
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(0); // Always mute Remotion player
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Create a timer to update currentTime when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (playerRef.current) {
        try {
          const frame = playerRef.current.getCurrentFrame?.() || 0;
          const newTime = frame / fps;
          if (newTime <= totalDuration) {
            onTimeUpdate(newTime);
          } else {
            // Video ended - pause playback and reset time
            onPlayPause(); // This will set isPlaying to false, stopping all audio
            onTimeUpdate(0);
          }
        } catch (error) {
          // Handle any potential player errors
          console.warn("Player time update error:", error);
        }
      }
    }, 1000 / 30); // Update at 30fps

    return () => clearInterval(interval);
  }, [isPlaying, fps, totalDuration, onTimeUpdate]);

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
        segments={video.segments}
        isPlaying={isPlaying}
        currentTime={currentTime}
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
              compositionWidth={video.format.width}
              compositionHeight={video.format.height}
              fps={fps}
              style={{
                width: "100%",
                height: "100%",
              }}
              inputProps={{
                video,
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
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={onPlayPause}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-background/20 p-0 text-background shadow-lg backdrop-blur-sm hover:bg-background/30"
                >
                  <Play className="ml-1 h-8 w-8" />
                </Button>
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
                onClick={onPlayPause}
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

            {/* Time Display */}
            <div className="text-default/70 flex items-center gap-4 font-mono text-sm">
              <span>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
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
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-blue-500 shadow-md"
              style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>

          {/* Horizontal Segment Panel */}

          <VideoFramesPanel
            segments={video.segments}
            selectedFrameIndex={selectedFrameIndex}
            onFrameSelect={onFrameSelect}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onSegmentUpdate={onSegmentUpdate}
            onSegmentInsert={onSegmentInsert}
            orientation="horizontal"
            showHeader={false}
          />
        </div>
      </div>
    </div>
  );
}
