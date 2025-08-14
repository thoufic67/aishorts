"use client";

import { useState, useRef, useEffect } from "react";
import { Player } from "@remotion/player";
import {
  Play,
  Pause,
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
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
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
}: VideoPlayerPanelProps) {
  const playerRef = useRef<any>(null);
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


  // Calculate which segment is currently active based on currentTime
  const getCurrentSegmentIndex = (): number => {
    let totalTime = 0;
    for (let i = 0; i < video.segments.length; i++) {
      totalTime += video.segments[i].duration;
      if (currentTime <= totalTime) {
        return i;
      }
    }
    return Math.max(0, video.segments.length - 1);
  };

  // Calculate time offset for a specific segment
  const getSegmentTimeOffset = (segmentIndex: number): number => {
    return video.segments
      .slice(0, segmentIndex)
      .reduce((acc, segment) => acc + segment.duration, 0);
  };

  // Handle segment click
  const handleSegmentClick = (segmentIndex: number) => {
    const segmentStartTime = getSegmentTimeOffset(segmentIndex);
    onTimeUpdate(segmentStartTime);
    onFrameSelect(segmentIndex);
  };

  const currentSegmentIndex = getCurrentSegmentIndex();

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
    <div className="flex h-full w-full flex-1 flex-col">
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

      {/* Video Player Area */}
      <div className="flex h-full flex-1 items-center justify-center p-4">
        <div className="relative h-full max-w-sm">
          {/* Video Container */}
          <div className="relative aspect-[9/16] h-full max-h-[70vh] overflow-hidden rounded-2xl bg-black shadow-2xl">
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
                  className="bg-default/20 text-default hover:bg-default/30 h-16 w-16 rounded-full p-0 backdrop-blur-sm"
                >
                  <Play className="ml-1 h-8 w-8" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Controls and Segment Timeline */}
      <div className="p-4">
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

          {/* Segment Timeline */}
          <div className="space-y-2">
            <div className="text-default/50 flex items-center gap-2 text-sm">
              <span>Segments</span>
              <div className="h-px flex-1 bg-muted" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {video.segments.map((segment, index) => {
                const isActive = index === currentSegmentIndex;
                const isSelected = index === selectedFrameIndex;

                return (
                  <div
                    key={segment._id}
                    onClick={() => handleSegmentClick(index)}
                    className={`relative flex-shrink-0 cursor-pointer rounded-lg border-2 transition-all ${
                      isActive
                        ? "border-blue-500 shadow-lg shadow-blue-500/20"
                        : isSelected
                          ? "border-default/40"
                          : "border-default/20 hover:border-default/40"
                    }`}
                  >
                    {/* Segment Thumbnail */}
                    <div className="relative h-20 w-16 overflow-hidden rounded-md bg-gray-700">
                      {segment.imageUrl ? (
                        <img
                          src={segment.imageUrl}
                          alt={`Segment ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-default/40 flex h-full w-full items-center justify-center">
                          <span className="text-xs">#{index + 1}</span>
                        </div>
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute inset-0 bg-blue-500/20" />
                      )}
                    </div>

                    {/* Segment info */}
                    <div className="text-default/60 absolute -bottom-6 left-0 right-0 text-center text-xs">
                      {formatTime(segment.duration)}
                    </div>

                    {/* Play indicator for active segment */}
                    {isActive && (
                      <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-blue-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
