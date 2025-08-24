import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FrameAddButtonProps {
  orientation: "vertical" | "horizontal";
  onAdd: () => void;
  position: "before" | "after";
  title: string;
  index?: number;
}

export function FrameAddButton({
  orientation,
  onAdd,
  position,
  title,
  index,
}: FrameAddButtonProps) {
  const isHorizontal = orientation === "horizontal";

  if (isHorizontal) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500"
        onClick={onAdd}
        title={title}
      >
        <Plus className="h-3 w-3" />
      </Button>
    );
  }

  if (position === "before") {
    return (
      <div className="mb-3 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500"
          onClick={onAdd}
          title={title}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex justify-center">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500"
        onClick={onAdd}
        title={title}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}