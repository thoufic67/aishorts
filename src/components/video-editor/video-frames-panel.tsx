import { Settings, MoreHorizontal } from "lucide-react";
import type { VideoSegment } from "@/types/video";
import { Button } from "@/components/ui/button";
import { FramesList } from "./frames";
import { EditSegmentDialog, NewFrameDialog } from "./dialogs";
import { useSegmentOperations } from "./hooks";
import { useEffect } from "react";

interface VideoFramesPanelProps {
  segments: VideoSegment[];
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  currentTime: number;
  totalDuration: number;
  projectId?: string;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (index: number, newSegment: VideoSegment) => void;
  orientation?: "vertical" | "horizontal";
  showHeader?: boolean;
}

export function VideoFramesPanel({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  currentTime: _currentTime,
  totalDuration: _totalDuration,
  projectId,
  onSegmentUpdate,
  onSegmentInsert,
  orientation = "vertical",
  showHeader = true,
}: VideoFramesPanelProps) {
  const {
    editingState,
    newFrameState,
    isRegenerating,
    handleEdit,
    handleRegenerateImage,
    handleRegenerateAudio,
    handleCreateNewFrame,
    handleGenerateNewFrame,
    closeEditDialog,
    closeNewFrameDialog,
  } = useSegmentOperations({
    segments,
    projectId,
    onSegmentUpdate,
    onSegmentInsert,
  });

  const isHorizontal = orientation === "horizontal";

  // useEffect(() => {
  //   console.log("VideoFramesPanel - editingState:", editingState);
  //   if (editingState) {
  //     console.log(
  //       "VideoFramesPanel - segment for editingState:",
  //       segments[editingState.index] ? "found" : "not found",
  //       "index:",
  //       editingState.index,
  //       "segments length:",
  //       segments.length,
  //     );
  //   }
  // }, [editingState, segments]);

  return (
    <div className={isHorizontal ? "w-full" : "w-80 border-r bg-white"}>
      {/* Header */}
      {showHeader && (
        <div
          className={`flex items-center justify-between ${
            isHorizontal ? "border-b p-4" : "h-14 border-b px-4"
          }`}
        >
          <h2 className="text-sm font-medium">
            {isHorizontal ? "Segments" : "Frames"}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Settings className="size-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Frames list */}
      <div
        className={
          isHorizontal ? "overflow-x-auto p-4" : "flex-1 overflow-y-auto p-4"
        }
      >
        <FramesList
          segments={segments}
          selectedFrameIndex={selectedFrameIndex}
          onFrameSelect={onFrameSelect}
          orientation={orientation}
          onEditFrame={handleEdit}
          onCreateNewFrame={handleCreateNewFrame}
          isRegenerating={isRegenerating}
        />
      </div>

      {/* Edit Segment Dialog */}
      <EditSegmentDialog
        isOpen={editingState !== null}
        onClose={closeEditDialog}
        segment={
          editingState && segments[editingState.index]
            ? segments[editingState.index]
            : null
        }
        segmentIndex={editingState?.index ?? -1}
        onRegenerateImage={handleRegenerateImage}
        onRegenerateAudio={handleRegenerateAudio}
        onSegmentUpdate={onSegmentUpdate}
        isRegenerating={isRegenerating !== null}
      />

      {/* New Frame Dialog */}
      <NewFrameDialog
        isOpen={Boolean(newFrameState)}
        onClose={closeNewFrameDialog}
        insertAfterIndex={newFrameState?.insertAfterIndex ?? -1}
        onGenerate={handleGenerateNewFrame}
        isGenerating={newFrameState?.isGenerating ?? false}
      />
    </div>
  );
}
