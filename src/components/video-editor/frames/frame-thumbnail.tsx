import { Edit2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoSegment } from "@/types/video";

interface FrameThumbnailProps {
  segment: VideoSegment;
  index: number;
  orientation: "vertical" | "horizontal";
  isRegenerating: boolean;
  onEdit: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, "0")}s`;
}

export function FrameThumbnail({
  segment,
  index,
  orientation,
  isRegenerating,
  onEdit,
}: FrameThumbnailProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div className={isHorizontal ? "relative" : "space-y-2"}>
      {/* Thumbnail - Use actual video/image */}
      <div
        className={`relative overflow-hidden rounded ${
          isHorizontal ? "mx-auto h-16 w-12" : "mx-auto"
        }`}
      >
        {/* Display actual media if available */}
        {segment.media && segment.media.length > 0 ? (
          <video
            autoPlay
            playsInline
            src={segment.media[0].url}
            className={`object-cover ${
              isHorizontal
                ? "h-full w-full"
                : "mx-auto aspect-[9/16] h-full w-full max-w-48"
            }`}
            muted
            preload="metadata"
            poster={segment.imageUrl}
          />
        ) : segment.imageUrl ? (
          <img
            src={segment.imageUrl}
            alt={segment.imagePrompt}
            className={`object-cover ${
              isHorizontal
                ? "h-full w-full"
                : "absolute inset-0 aspect-[9/16] h-full w-full max-w-48"
            }`}
          />
        ) : (
          /* Fallback indicator */
          <div
            className={`flex items-center justify-center ${
              isHorizontal
                ? "h-full w-full bg-gray-200 text-gray-400"
                : "absolute inset-0"
            }`}
          >
            {isHorizontal ? (
              <span className="text-xs">#{index + 1}</span>
            ) : (
              <div className="h-20 w-3 rounded-full bg-gradient-to-t from-yellow-600 via-orange-500 to-red-500 shadow-lg">
                {/* Flame effect */}
                <div className="relative -top-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 to-yellow-300 shadow-md"></div>
              </div>
            )}
          </div>
        )}

        {/* Regeneration loading overlay */}
        {isRegenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-1 text-white">
              <RefreshCw
                className={`animate-spin ${isHorizontal ? "h-4 w-4" : "h-6 w-6"}`}
              />
              {!isHorizontal && (
                <span className="text-xs">Regenerating...</span>
              )}
            </div>
          </div>
        )}

        {/* Edit button overlay for horizontal */}
        {isHorizontal && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full bg-black/50 p-0 text-white backdrop-blur-sm hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit segment"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Voice caption indicator */}
        {!isHorizontal && (
          <div className="absolute bottom-2 left-2">
            <div className="rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-medium text-black">
              🗣️ Voice caption
            </div>
          </div>
        )}

        {/* Duration and Edit indicator for horizontal */}
        <div
          className={`absolute ${
            isHorizontal ? "bottom-1 right-1" : "bottom-2 right-2"
          }`}
        >
          <div
            className={`rounded bg-black/50 font-medium text-white ${
              isHorizontal ? "px-1 py-0.5 text-xs" : "px-1.5 py-0.5 text-xs"
            }`}
          >
            {isHorizontal
              ? formatTime(segment.duration).replace("s", "")
              : formatTime(segment.duration)}
          </div>
        </div>

        {/* Edit indicator for horizontal mode */}
        {isHorizontal && (
          <div className="absolute right-1 top-1 opacity-60 transition-opacity group-hover:opacity-100">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/80">
              <Edit2 className="h-2.5 w-2.5 text-gray-600" />
            </div>
          </div>
        )}
      </div>

      {/* Caption text */}
      {!isHorizontal && (
        <p className="text-xs leading-relaxed text-gray-600">{segment.text}</p>
      )}
    </div>
  );
}