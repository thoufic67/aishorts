import { Edit2, Settings, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FrameHeaderProps {
  index: number;
  onEdit: () => void;
}

export function FrameHeader({ index, onEdit }: FrameHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-medium">#{index}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              console.log("FrameHeader: Edit button clicked for index:", index);
              onEdit();
            }}
            title="Edit segment"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
