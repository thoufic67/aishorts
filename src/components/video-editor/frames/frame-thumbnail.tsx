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
          isHorizontal ? "mx-auto h-16 w-12 bg-gray-100" : "mx-auto h-48 w-full bg-gray-100"
        }`}
      >
        {/* Display actual media - prioritize direct URLs, then files array */}
        {(() => {
          // First try to get image from segment.imageUrl (direct from API)
          let imageUrl = segment.imageUrl;
          let videoUrl = null;
          
          // If no direct imageUrl, check files array
          if (!imageUrl && segment.files && segment.files.length > 0) {
            const videoFile = segment.files.find(file => file.fileType === 'video');
            const imageFile = segment.files.find(file => file.fileType === 'image');
            
            if (videoFile?.r2Url) {
              videoUrl = videoFile.r2Url;
            }
            if (imageFile?.r2Url) {
              imageUrl = imageFile.r2Url;
            }
          }
          
          // Also check legacy media array as fallback
          if (!imageUrl && !videoUrl && segment.media && segment.media.length > 0) {
            const mediaItem = segment.media[0];
            if (mediaItem?.url) {
              if (mediaItem.url.includes('.mp4') || mediaItem.url.includes('.webm')) {
                videoUrl = mediaItem.url;
              } else {
                imageUrl = mediaItem.url;
              }
            }
          }
          
          // Render video if available
          if (videoUrl) {
            return (
              <video
                autoPlay
                loop
                muted
                playsInline
                src={videoUrl}
                className={`object-cover ${
                  isHorizontal
                    ? "h-full w-full"
                    : "aspect-[9/16] h-full w-full max-w-48"
                }`}
                preload="metadata"
                poster={imageUrl}
                onError={(e) => console.error('Video load error for segment', segment.id || segment._id, e)}
              />
            );
          }
          
          // Render image if available
          if (imageUrl) {
            return (
              <img
                src={imageUrl}
                alt={segment.imagePrompt || `Segment ${index + 1}`}
                className={`object-cover ${
                  isHorizontal
                    ? "h-full w-full"
                    : "aspect-[9/16] h-full w-full max-w-48"
                }`}
                onError={(e) => {
                  console.error('Image load error for segment', segment.id || segment._id, 'URL:', imageUrl, e);
                  // Hide broken image
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                onLoad={() => console.log('Image loaded successfully for segment', segment.id || segment._id, 'URL:', imageUrl)}
              />
            );
          }
          
          return null;
        })()}
        
        {/* Fallback indicator when no media is available */}
        {!segment.imageUrl && 
         (!segment.files || segment.files.length === 0 || !segment.files.some(f => f.fileType === 'image' || f.fileType === 'video')) && 
         (!segment.media || segment.media.length === 0) && (
          <div
            className={`flex items-center justify-center ${
              isHorizontal
                ? "h-full w-full bg-gray-200 text-gray-400"
                : "h-full w-full bg-gray-200 text-gray-400"
            }`}
          >
            {isHorizontal ? (
              <span className="text-xs">#{index + 1}</span>
            ) : (
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="h-16 w-3 rounded-full bg-gradient-to-t from-yellow-600 via-orange-500 to-red-500 shadow-lg">
                  {/* Flame effect */}
                  <div className="relative -top-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 to-yellow-300 shadow-md"></div>
                </div>
                <span className="text-xs text-gray-500">No Image</span>
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
                console.log("FrameThumbnail: Edit button clicked for index:", index);
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