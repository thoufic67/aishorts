"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Settings,
  AlignLeft,
  Copy,
  Edit3,
  MoreHorizontal,
  Download,
  Share,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoFramesPanel } from "@/components/video-editor/video-frames-panel";
import { VideoPlayerPanel } from "@/components/video-editor/video-player-panel";
import { VideoEditorHeader } from "@/components/video-editor/video-editor-header";
import type { VideoGenerationData } from "@/types/video";
import { VIDEO_DATA } from "@/lib/video-mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function VideoEditorPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [videoData, setVideoData] = useState<VideoGenerationData | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // In a real app, fetch video data based on videoId
    setVideoData(VIDEO_DATA);
  }, [videoId]);

  // Calculate total duration
  const totalDuration =
    videoData?.video.segments.reduce(
      (acc, segment) => acc + segment.duration,
      0,
    ) || 0;

  // Simple timer-based playback for testing
  useEffect(() => {
    if (!isPlaying || !videoData) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 1 / 30; // Increment by 1 frame at 30fps
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return 0; // Reset to beginning
        }
        return newTime;
      });
    }, 1000 / 30); // 30fps

    return () => clearInterval(interval);
  }, [isPlaying, totalDuration, videoData]);

  if (!videoData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading video...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-0 sticky top-0 z-10 bg-white">
        <VideoEditorHeader
          currentTime={currentTime}
          totalDuration={totalDuration}
        />
      </div>

      <div className="flex flex-1">
        <ScrollArea className="h-full max-h-dvh">
          {/* Left Panel - Frames */}
          <VideoFramesPanel
            segments={videoData.video.segments}
            selectedFrameIndex={selectedFrameIndex}
            onFrameSelect={setSelectedFrameIndex}
            currentTime={currentTime}
            totalDuration={totalDuration}
          />
        </ScrollArea>

        {/* Right Panel - Video Player */}
        <VideoPlayerPanel
          video={videoData.video}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          totalDuration={totalDuration}
        />
      </div>
    </div>
  );
}
