import { useState } from "react";
import { Settings, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { VideoSegment } from "@/types/video";

interface VideoFramesPanelProps {
  segments: VideoSegment[];
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  currentTime: number;
  totalDuration: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, "0")}s`;
}

export function VideoFramesPanel({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  currentTime,
  totalDuration,
}: VideoFramesPanelProps) {
  return (
    <div className="w-80 border-r bg-white">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-medium">Frames</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Frames list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {segments.map((segment, index) => (
            <Card
              key={segment._id}
              className={`cursor-pointer border transition-all ${
                selectedFrameIndex === index
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => onFrameSelect(index)}
            >
              <div className="p-3">
                {/* Frame header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-medium">#{index}</span>
                    <div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Frame thumbnail and content */}
                <div className="space-y-2">
                  {/* Thumbnail - Use actual video/image */}
                  <div className="relative mx-auto overflow-hidden rounded">
                    {/* Display actual media if available */}
                    {segment.media && segment.media.length > 0 ? (
                      <video
                        autoPlay
                        playsInline
                        src={segment.media[0].url}
                        className="mx-auto aspect-[9/16] h-full w-full max-w-48 object-cover"
                        muted
                        preload="metadata"
                        poster={segment.imageUrl}
                      />
                    ) : segment.imageUrl ? (
                      <img
                        src={segment.imageUrl}
                        alt={segment.imagePrompt}
                        className="absolute inset-0 aspect-[9/16] h-full w-full max-w-48 object-cover"
                      />
                    ) : (
                      /* Fallback candle image */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-20 w-3 rounded-full bg-gradient-to-t from-yellow-600 via-orange-500 to-red-500 shadow-lg">
                          {/* Flame effect */}
                          <div className="relative -top-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 to-yellow-300 shadow-md"></div>
                        </div>
                      </div>
                    )}

                    {/* Voice caption indicator */}
                    <div className="absolute bottom-2 left-2">
                      <div className="rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-medium text-black">
                        🗣️ Voice caption
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="absolute bottom-2 right-2">
                      <div className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white">
                        {formatTime(segment.duration)}
                      </div>
                    </div>
                  </div>

                  {/* Caption text */}
                  <p className="text-xs leading-relaxed text-gray-600">
                    {segment.text}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {/* Add new frame button */}
          <Button
            variant="outline"
            className="w-full border-dashed border-gray-300 py-8 text-gray-500 hover:border-gray-400 hover:text-gray-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add new frame
          </Button>
        </div>
      </div>
    </div>
  );
}
