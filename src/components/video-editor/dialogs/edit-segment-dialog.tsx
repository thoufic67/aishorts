import React, { useState, useEffect } from "react";
import type { VideoSegment } from "@/types/video";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TabNavigation, ImageEditTab, ScriptEditTab } from "./tabs";

type EditMode = "image" | "script";

interface EditSegmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  segment: VideoSegment | null;
  segmentIndex: number;
  onRegenerateImage: (
    index: number,
    prompt: string,
    model: string,
  ) => Promise<void>;
  onRegenerateAudio: (
    index: number,
    script: string,
    voice: string,
  ) => Promise<void>;
  isRegenerating: boolean;
  asContent?: boolean; // When true, returns only DialogContent without Dialog wrapper
}

export function EditSegmentDialog({
  isOpen,
  onClose,
  segment,
  segmentIndex,
  onRegenerateImage,
  onRegenerateAudio,
  isRegenerating,
  asContent = false,
}: EditSegmentDialogProps) {
  const [activeTab, setActiveTab] = useState<EditMode>("image");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageModel, setImageModel] = useState("flux-schnell");
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("echo");

  // Debug: Log the props - this will show if the component is re-rendering
  // console.log("EditSegmentDialog RENDER - isOpen:", isOpen, "segment:", segment ? "segment exists" : "no segment", "segmentIndex:", segmentIndex);

  // Initialize form values when segment changes
  useEffect(() => {
    if (segment) {
      setImagePrompt(segment.imagePrompt);
      setScript(segment.text);
      setImageModel("flux-schnell");
      setVoice("echo");
    }
  }, [segment]);

  if (!segment) return null;

  const handleRegenerateImage = () => {
    void onRegenerateImage(segmentIndex, imagePrompt, imageModel);
  };

  const handleRegenerateAudio = () => {
    void onRegenerateAudio(segmentIndex, script, voice);
  };

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Edit Segment #{segmentIndex}</DialogTitle>
      </DialogHeader>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mt-4 space-y-4">
        {activeTab === "image" && (
          <ImageEditTab
            segment={segment}
            imagePrompt={imagePrompt}
            imageModel={imageModel}
            onPromptChange={setImagePrompt}
            onModelChange={setImageModel}
            onRegenerate={handleRegenerateImage}
            isRegenerating={isRegenerating}
          />
        )}

        {activeTab === "script" && (
          <ScriptEditTab
            segment={segment}
            script={script}
            voice={voice}
            onScriptChange={setScript}
            onVoiceChange={setVoice}
            onRegenerate={handleRegenerateAudio}
            isRegenerating={isRegenerating}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </>
  );

  if (asContent) {
    return (
      <DialogContent className="max-w-2xl">
        {dialogContent}
      </DialogContent>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
