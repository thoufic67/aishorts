import { Card } from "@/components/ui/card";
import { FrameHeader } from "./frame-header";
import { FrameThumbnail } from "./frame-thumbnail";
import type { VideoSegment } from "@/types/video";

interface FrameCardProps {
  segment: VideoSegment;
  index: number;
  isSelected: boolean;
  orientation: "vertical" | "horizontal";
  onSelect: () => void;
  onEdit: () => void;
  isRegenerating: boolean;
}

export function FrameCard({
  segment,
  index,
  isSelected,
  orientation,
  onSelect,
  onEdit,
  isRegenerating,
}: FrameCardProps) {
  const isHorizontal = orientation === "horizontal";

  return (
    <Card
      className={`group cursor-pointer border transition-all ${
        isHorizontal ? "relative w-20 h-20" : "min-h-[300px]"
      } ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className={isHorizontal ? "p-2" : "p-3"}>
        {/* Frame header */}
        {!isHorizontal && <FrameHeader index={index} onEdit={onEdit} />}

        {/* Frame thumbnail and content */}
        <FrameThumbnail
          segment={segment}
          index={index}
          orientation={orientation}
          isRegenerating={isRegenerating}
          onEdit={onEdit}
        />
      </div>
    </Card>
  );
}