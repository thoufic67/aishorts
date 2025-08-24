import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FrameCard } from "./frame-card";
import { FrameAddButton } from "./frame-add-button";
import type { VideoSegment } from "@/types/video";

interface FramesListProps {
  segments: VideoSegment[];
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  orientation: "vertical" | "horizontal";
  onEditFrame: (index: number, segment: VideoSegment) => void;
  onCreateNewFrame: (insertAfterIndex: number) => void;
  isRegenerating: number | null;
}

export function FramesList({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  orientation,
  onEditFrame,
  onCreateNewFrame,
  isRegenerating,
}: FramesListProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div className={isHorizontal ? "flex gap-3" : "space-y-3"}>
      {segments.map((segment, index) => (
        <div
          key={`frame-group-${index}`}
          className={isHorizontal ? "flex flex-shrink-0 items-center gap-2" : ""}
        >
          {/* Add frame button before first frame */}
          {index === 0 && (
            <FrameAddButton
              orientation={orientation}
              onAdd={() => onCreateNewFrame(-1)}
              position="before"
              title={
                isHorizontal
                  ? "Add segment at beginning"
                  : "Add frame at beginning"
              }
            />
          )}

          <FrameCard
            segment={segment}
            index={index}
            isSelected={selectedFrameIndex === index}
            orientation={orientation}
            onSelect={() => onFrameSelect(index)}
            onEdit={() => {
              console.log("FramesList: onEditFrame called for index:", index, "segment.text:", segment.text.substring(0, 50) + "...");
              onEditFrame(index, segment);
            }}
            isRegenerating={isRegenerating === index}
          />

          {/* Add frame button after each frame */}
          <FrameAddButton
            orientation={orientation}
            onAdd={() => onCreateNewFrame(index)}
            position="after"
            title={
              isHorizontal
                ? `Add segment after #${index}`
                : `Add frame after #${index}`
            }
            index={index}
          />
        </div>
      ))}

      {/* Legacy add new frame button - kept for compatibility */}
      {!isHorizontal && (
        <Button
          variant="outline"
          className="w-full border-dashed border-gray-300 py-8 text-gray-500 hover:border-gray-400 hover:text-gray-600"
          onClick={() => onCreateNewFrame(segments.length - 1)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add new frame
        </Button>
      )}
    </div>
  );
}