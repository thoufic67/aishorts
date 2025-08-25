"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { VideoPlayerPanel } from "@/components/video-editor/video-player-panel";
import { VideoEditorHeader } from "@/components/video-editor/video-editor-header";
import type { VideoGenerationData, VideoSegment, Layer } from "@/types/video";
import type { Project } from "@/types/project";
import { useProject } from "@/hooks/use-projects";
import { VIDEO_DATA } from "@/lib/video-mock-data";
import { ProjectAPI } from "@/lib/project-api";


// Convert Project to VideoGenerationData format
function convertProjectToVideoData(
  project: Project,
): VideoGenerationData {
  const segments: VideoSegment[] = (project.segments || []).map(
    (segment, index) => {
      // Find associated image and audio files
      const imageFile = segment.files?.find(f => f.fileType === 'image');
      const audioFile = segment.files?.find(f => f.fileType === 'audio');
      
      return {
        text: segment.text,
        imagePrompt: segment.imagePrompt,
        imageUrl: imageFile?.r2Url || "",
        audioUrl: audioFile?.r2Url || "",
        audioVolume: segment.audioVolume || 1,
        playBackRate: segment.playBackRate || 1,
        duration: segment.duration || 5,
        withBlur: segment.withBlur || false,
        wordTimings: segment.wordTimings || [],
        backgroundMinimized: segment.backgroundMinimized || false,
        order: segment.order,
        media: imageFile?.r2Url
          ? [
              {
                effect: "none",
                url: imageFile.r2Url,
                withBlur: segment.withBlur || false,
                top: 0,
                left: 0,
                width: 1080,
                height: 1920,
                borderRadius: 10,
                volume: 0,
                _id: `media_${segment.id}`,
              },
            ]
          : [],
        elements: [],
        _id: segment.id,
      };
    },
  );

  // Create audio layers for playback
  const layers: Layer[] = [];

  // Create a combined audio layer if we have any audio URLs from segments
  const hasAudio = segments.some((segment) => segment.audioUrl);
  if (hasAudio) {
    // For now, we'll create a placeholder combined audio layer
    // In a real implementation, you'd combine all segment audio files into one
    const firstAudioUrl = segments.find(
      (segment) => segment.audioUrl,
    )?.audioUrl;
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
          textShadow:
            ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
          wordAnimation: [],
          showEmojis: true,
          fromBottom: 0,
          wordsPerBatch: 2,
        },
        type: "combinedAudio" as const,
        url: firstAudioUrl, // Use first audio URL as combined audio
        volume: 1,
        _id: `combined_audio_${project.id}`,
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
      textShadow:
        ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
      wordAnimation: ["none"],
      showEmojis: true,
      fromBottom: 49,
      wordsPerBatch: 3,
    },
    type: "captions" as const,
    volume: 0.2,
    _id: `captions_${project.id}`,
  });

  return {
    video: {
      selectedMedia: { images: [], videos: [] },
      format: project.format || { width: 1080, height: 1920 },
      _id: project.id,
      user: "user",
      status: "completed",
      script: project.script || "",
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
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      __v: 0,
      title: project.title,
    },
    userPlan: {
      isPremium: false,
      name: "Free",
    },
  };
}

export default function VideoEditorPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const { data: project, isLoading, error, refetch } = useProject(videoId);
  const [videoData, setVideoData] = useState<VideoGenerationData | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSegmentUpdate = async (index: number, updatedSegment: VideoSegment) => {
    if (!videoData || !project) return;

    try {
      // Update the segment via API
      const segmentId = updatedSegment._id;
      await ProjectAPI.updateSegment(project.id, segmentId, {
        text: updatedSegment.text,
        imagePrompt: updatedSegment.imagePrompt,
        duration: updatedSegment.duration,
        audioVolume: updatedSegment.audioVolume,
        playBackRate: updatedSegment.playBackRate,
        withBlur: updatedSegment.withBlur,
        backgroundMinimized: updatedSegment.backgroundMinimized,
        wordTimings: updatedSegment.wordTimings,
        order: updatedSegment.order,
      });

      // Update local state
      const updatedSegments = [...videoData.video.segments];
      updatedSegments[index] = updatedSegment;

      const updatedVideoData = {
        ...videoData,
        video: {
          ...videoData.video,
          segments: updatedSegments,
        },
      };

      setVideoData(updatedVideoData);

      // Optionally refresh project data to ensure consistency
      refetch();
    } catch (error) {
      console.error("Failed to update segment:", error);
      // Show user-friendly error message
      alert(`Failed to update segment: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSegmentInsert = async (
    insertAfterIndex: number,
    newSegment: VideoSegment,
  ) => {
    if (!videoData || !project) return;

    try {
      // Create the new segment via API
      const insertIndex = insertAfterIndex + 1;
      
      const createdSegment = await ProjectAPI.createSegment(project.id, {
        order: insertIndex,
        text: newSegment.text,
        imagePrompt: newSegment.imagePrompt,
        duration: newSegment.duration,
        audioVolume: newSegment.audioVolume,
        playBackRate: newSegment.playBackRate,
        withBlur: newSegment.withBlur,
        backgroundMinimized: newSegment.backgroundMinimized,
        wordTimings: newSegment.wordTimings,
      });

      // Update local state
      const updatedSegments = [...videoData.video.segments];
      updatedSegments.splice(insertIndex, 0, {
        ...newSegment,
        _id: createdSegment.id,
      });

      // Update order values for all segments after the insertion point
      updatedSegments.forEach((segment, index) => {
        segment.order = index;
      });

      // Update segment orders in the API for segments that changed
      const updatePromises = updatedSegments
        .slice(insertIndex + 1)
        .map((segment, idx) => 
          ProjectAPI.updateSegment(project.id, segment._id, { order: insertIndex + 1 + idx })
        );
      
      await Promise.all(updatePromises);

      const updatedVideoData = {
        ...videoData,
        video: {
          ...videoData.video,
          segments: updatedSegments,
        },
      };

      setVideoData(updatedVideoData);

      // Select the newly inserted frame
      setSelectedFrameIndex(insertIndex);

      // Refresh project data to ensure consistency
      refetch();
    } catch (error) {
      console.error("Failed to insert segment:", error);
      // Show user-friendly error message
      alert(`Failed to insert segment: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleExport = async (quality: string) => {
    if (!videoData) return;

    try {
      const response = await fetch("/api/export-video-with-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoData: videoData.video,
          backgroundMusicUrl: "/demo/temporex.mp3",
          quality,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      const result = await response.json();

      // Trigger download
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      alert("Video exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };


  useEffect(() => {
    if (project) {
      console.log('Converting project data:', {
        projectId: project.id,
        segmentCount: project.segments?.length || 0,
        segments: project.segments?.map(s => ({
          id: s.id,
          text: s.text.substring(0, 50) + '...',
          filesCount: s.files?.length || 0,
          files: s.files?.map(f => ({ type: f.fileType, url: f.r2Url })) || []
        }))
      });
      
      // Convert API project data to video data format
      const convertedVideoData = convertProjectToVideoData(project);
      setVideoData(convertedVideoData);
      
      console.log('Converted video data:', {
        segmentCount: convertedVideoData.video.segments.length,
        segmentsWithImages: convertedVideoData.video.segments.filter(s => s.imageUrl).length,
        segmentsWithAudio: convertedVideoData.video.segments.filter(s => s.audioUrl).length,
      });
    }
  }, [project]);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loading size="lg" />
          <div className="text-lg text-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <div className="mb-4 text-destructive">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Failed to load project</h3>
          <p className="mb-4 text-foreground/70">
            {error.message || "Something went wrong while loading the project."}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Project not found
  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <div className="mb-4 text-foreground/30">
            <AlertCircle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Project not found</h3>
          <p className="mb-4 text-foreground/70">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // Video data not ready
  if (!videoData) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loading size="lg" />
          <div className="text-lg text-foreground">Preparing video editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-0 sticky top-0 z-10 bg-white">
        <VideoEditorHeader
          currentTime={currentTime}
          totalDuration={totalDuration}
          video={videoData.video}
          onExport={handleExport}
        />
      </div>

      {/* Main Video Player - Full Width with Bottom Horizontal Segments */}
      <div className="flex-1">
        <VideoPlayerPanel
          video={videoData.video}
          projectId={project.id}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          onTimeUpdate={(time: number) => setCurrentTime(time)}
          totalDuration={totalDuration}
          selectedFrameIndex={selectedFrameIndex}
          onFrameSelect={setSelectedFrameIndex}
          onSegmentUpdate={handleSegmentUpdate}
          onSegmentInsert={handleSegmentInsert}
        />
      </div>
    </div>
  );
}
