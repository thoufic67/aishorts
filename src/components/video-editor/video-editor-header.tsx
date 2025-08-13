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
import { Badge } from "@/components/ui/badge";

interface VideoEditorHeaderProps {
  currentTime?: number;
  totalDuration?: number;
}

export function VideoEditorHeader({
  currentTime = 0,
  totalDuration = 30,
}: VideoEditorHeaderProps = {}) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 text-gray-600"
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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Export / Share</span>
        </Button>
      </div>
    </header>
  );
}
