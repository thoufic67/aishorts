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
import type { VideoGenerationData, VideoSegment, Layer } from "@/types/video";
import { VIDEO_DATA } from "@/lib/video-mock-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectStorage, type ProjectData, type VideoSegmentData } from "@/lib/project-storage";

// Convert ProjectData to VideoGenerationData format
function convertProjectDataToVideoData(projectData: ProjectData): VideoGenerationData {
  const segments: VideoSegment[] = (projectData.segments || []).map((segment, index) => ({
    text: segment.text,
    imagePrompt: segment.imagePrompt,
    imageUrl: segment.imageUrl || "",
    audioUrl: segment.audioUrl || "",
    audioVolume: 1,
    playBackRate: 1,
    duration: segment.duration || 5,
    withBlur: false,
    wordTimings: [],
    backgroundMinimized: false,
    order: segment.order,
    media: segment.imageUrl ? [{
      effect: "none",
      url: segment.imageUrl,
      withBlur: false,
      top: 0,
      left: 0,
      width: 1080,
      height: 1920,
      borderRadius: 10,
      volume: 0,
      _id: `media_${index}`,
    }] : [],
    elements: [],
    _id: `segment_${index}`,
  }));

  // Create audio layers for playback
  const layers: Layer[] = [];

  // Create a combined audio layer if we have any audio URLs from segments
  const hasAudio = segments.some(segment => segment.audioUrl);
  if (hasAudio) {
    // For now, we'll create a placeholder combined audio layer
    // In a real implementation, you'd combine all segment audio files into one
    const firstAudioUrl = segments.find(segment => segment.audioUrl)?.audioUrl;
    if (firstAudioUrl) {
      layers.push({
        captionStyle: {
          fontSize: 80,
          fontFamily: "Inter",
          activeWordColor: "#ffcd00",
          inactiveWordColor: "#FFFFFF",
          backgroundColor: "#000000",
          fontWeight: "900",
          textTransform: "uppercase" as const,
          textShadow: ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
          wordAnimation: [],
          showEmojis: true,
          fromBottom: 0,
          wordsPerBatch: 2,
        },
        type: "combinedAudio" as const,
        url: firstAudioUrl, // Use first audio URL as combined audio
        volume: 1,
        _id: `combined_audio_${projectData.id}`,
      });
    }
  }

  // Add captions layer
  layers.push({
    captionStyle: {
      fontSize: 75,
      fontFamily: "Inter",
      activeWordColor: "#FFFFFF",
      inactiveWordColor: "#CCCCCC",
      backgroundColor: "transparent",
      fontWeight: "700",
      textTransform: "none" as const,
      textShadow: ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
      wordAnimation: ["none"],
      showEmojis: true,
      fromBottom: 49,
      wordsPerBatch: 3,
    },
    type: "captions" as const,
    volume: 0.2,
    _id: `captions_${projectData.id}`,
  });

  return {
    video: {
      selectedMedia: { images: [], videos: [] },
      format: { width: 1080, height: 1920 },
      _id: projectData.id,
      user: "user",
      status: "completed",
      script: projectData.script,
      voice: "openai_echo",
      type: "faceless_video",
      mediaType: "images",
      isRemotion: true,
      selectedModel: "basic",
      audioType: "library",
      audioPrompt: "",
      watermark: true,
      isFeatured: false,
      segments,
      layers,
      tracks: [],
      createdAt: new Date(projectData.createdAt).toISOString(),
      updatedAt: new Date(projectData.updatedAt).toISOString(),
      __v: 0,
      title: projectData.title,
    },
    userPlan: {
      isPremium: false,
      name: "Free",
    },
  };
}

export default function VideoEditorPage() {
  const params = useParams();
  const videoId = params.id as string;
  const [videoData, setVideoData] = useState<VideoGenerationData | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    // Try to load from project storage first
    const projectData = ProjectStorage.getProject(videoId);
    
    if (projectData) {
      // Convert project data to video data format
      const convertedVideoData = convertProjectDataToVideoData(projectData);
      setVideoData(convertedVideoData);
    } else {
      // Fallback to mock data
      setVideoData(VIDEO_DATA);
    }
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
