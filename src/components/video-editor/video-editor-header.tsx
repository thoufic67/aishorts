"use client";

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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Video } from "@/types/video";

interface VideoEditorHeaderProps {
  currentTime?: number;
  totalDuration?: number;
  video?: Video;
  onExport?: (quality: string) => void;
}

export function VideoEditorHeader({
  currentTime = 0,
  totalDuration = 30,
  video,
  onExport,
}: VideoEditorHeaderProps = {}) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = async (quality: string) => {
    if (!video || isExporting) return;

    setIsExporting(true);
    setExportProgress("Preparing export...");

    try {
      // Call the parent's export handler if provided
      if (onExport) {
        await onExport(quality);
      } else {
        // Default export behavior
        await exportVideo(quality);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert(
        `Export failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const exportVideo = async (quality: string) => {
    setExportProgress("Rendering video...");

    const response = await fetch("/api/export-video-with-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoData: video,
        backgroundMusicUrl: "/demo/temporex.mp3",
        quality,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Export failed");
    }

    const result = await response.json();

    setExportProgress("Download ready!");

    // Trigger download
    const link = document.createElement("a");
    link.href = result.downloadUrl;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    alert("Video exported successfully!");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="link"
          size="sm"
          className="flex items-center gap-2 text-gray-600"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to videos</span>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Left side buttons */}
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          <span>Frames</span>
        </Button>

        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span>Actions</span>
        </Button>

        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <AlignLeft className="h-4 w-4" />
          <span>Audio</span>
        </Button>

        {/* Center - Time display */}
        <div className="mx-8 flex items-center gap-2 text-sm">
          <span className="font-mono">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Right side buttons */}
        <Button variant="ghost" size="sm">
          <Copy className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm">
          <Edit3 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {/* Watermark toggle */}
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-800 hover:bg-green-200"
        >
          Watermark
        </Badge>

        {/* Export/Share buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{exportProgress || "Exporting..."}</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export / Share</span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => handleExport("low")}
              disabled={isExporting || !video}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Low Quality
              <Badge variant="secondary" className="ml-auto text-xs">
                Fast
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("medium")}
              disabled={isExporting || !video}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Medium Quality
              <Badge variant="secondary" className="ml-auto text-xs">
                Recommended
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport("high")}
              disabled={isExporting || !video}
            >
              <Download className="mr-2 h-4 w-4" />
              Export High Quality
              <Badge variant="secondary" className="ml-auto text-xs">
                Slow
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <Share className="mr-2 h-4 w-4" />
              Share (Coming Soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
