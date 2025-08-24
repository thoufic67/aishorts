import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { voiceOptions } from "@/lib/voice-options";
import { imageModels } from "@/lib/image-models";
import { ScriptInput, VoiceSelector, ImageModelSelector } from "../forms";

interface NewFrameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  insertAfterIndex: number;
  onGenerate: (script: string, voice: string, imageModel: string) => Promise<void>;
  isGenerating: boolean;
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

export function NewFrameDialog({
  isOpen,
  onClose,
  insertAfterIndex,
  onGenerate,
  isGenerating,
}: NewFrameDialogProps) {
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState("echo");
  const [imageModel, setImageModel] = useState("flux-schnell");

  const handleGenerate = async () => {
    // Validate script length (max 50 words)
    const wordCount = countWords(script);
    if (wordCount > 50) {
      alert("Script must be 50 words or less. Current count: " + wordCount);
      return;
    }

    if (!script.trim()) {
      alert("Please enter a script for the new frame.");
      return;
    }

    await onGenerate(script, voice, imageModel);
  };

  const handleClose = () => {
    if (!isGenerating) {
      setScript("");
      setVoice("echo");
      setImageModel("flux-schnell");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add New Frame
            {insertAfterIndex >= 0
              ? ` After #${insertAfterIndex}`
              : " At Beginning"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Script Input */}
          <ScriptInput
            value={script}
            onChange={setScript}
            maxWords={50}
            showWordCount={true}
            label="Script (max 50 words)"
            placeholder="Enter script text for the new frame..."
            rows={4}
          />

          {/* Voice Selection */}
          <VoiceSelector
            selectedVoice={voice}
            onVoiceChange={setVoice}
            voices={voiceOptions}
            limit={3}
            namePrefix="new-"
          />

          {/* Image Model Selection */}
          <div>
            <label className="text-sm font-medium">Image Quality</label>
            <div className="mt-2 space-y-2">
              {imageModels.map((model) => (
                <div key={model.id} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={`new-${model.id}`}
                    name="newImageModel"
                    value={model.id}
                    checked={imageModel === model.id}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <label htmlFor={`new-${model.id}`} className="flex-1">
                    <div className="text-sm font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500">
                      {model.description}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Generating frame...</span>
              </div>
              <div className="mt-1 text-xs text-blue-600">
                Creating image prompt → Generating image → Creating audio
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                isGenerating ||
                countWords(script) > 50 ||
                !script.trim()
              }
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Frame
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}