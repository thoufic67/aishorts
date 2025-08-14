"use client";

import { useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoComposition } from "@/components/video-editor/video-composition";
import { ExternalAudioPlayer } from "@/components/video-editor/external-audio-player";
import type { Video, VideoSegment } from "@/types/video";

interface VideoPlayerPanelProps {
  video: Video;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  totalDuration: number;
}

export function VideoPlayerPanel({
  video,
  isPlaying,
  onPlayPause,
  currentTime,
  onTimeUpdate,
  totalDuration,
}: VideoPlayerPanelProps) {
  const playerRef = useRef<any>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Calculate frame number for display
  const fps = 30;
  const totalFrames = Math.floor(totalDuration * fps);
  const currentFrame = Math.floor(currentTime * fps);

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

  const formatRatio = (current: number, total: number): string => {
    const ratio = total > 0 ? current / total : 0;
    return `${(ratio * 100).toFixed(1)}%`;
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

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      {/* External Audio Player - Handles all audio playback */}
      <ExternalAudioPlayer
        segments={video.segments}
        isPlaying={isPlaying}
        currentTime={currentTime}
        backgroundMusicUrl="/demo/temporex.mp3"
        fps={fps}
        volume={volume}
        isMuted={isMuted}
      />

      {/* Video Player Area - Visual only, audio handled externally */}
      <div className="flex h-full flex-1 items-center justify-center p-8">
        <div className="relative h-full">
          {/* Video Container */}
          <div className="w-90 relative aspect-[9/16] h-full overflow-hidden rounded-lg bg-black shadow-xl">
            {/* Remotion Player */}
            <Player
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
                  className="h-16 w-16 rounded-full bg-white/20 p-0 text-white backdrop-blur-sm hover:bg-white/30"
                >
                  <Play className="ml-1 h-8 w-8" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-t bg-white p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-150"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-blue-500 shadow-md"
              style={{ left: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={onPlayPause}
                size="sm"
                className="flex items-center gap-2"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              <Button variant="ghost" size="sm">
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm">
                <RotateCw className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="ghost"
                  size="sm"
                  className="p-1"
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
                  className="w-16"
                />
                <span>{Math.round((isMuted ? 0 : volume) * 100)}%</span>
              </div>
            </div>

            {/* Time Display */}
            <div className="flex items-center gap-4 font-mono text-sm">
              <span>
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
              <span className="text-gray-500">
                Frame {currentFrame} / {totalFrames}
              </span>
              <span className="text-gray-500">
                {formatRatio(currentTime, totalDuration)}
              </span>
            </div>

            <Button variant="ghost" size="sm">
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
