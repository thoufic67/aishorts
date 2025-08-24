import { useState, useEffect } from "react";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { getAudioDuration, estimateAudioDuration } from "@/lib/audio-utils";
import type { VideoSegment } from "@/types/video";

type EditMode = "image" | "script" | null;

interface EditingState {
  index: number;
  mode: EditMode;
  imagePrompt: string;
  imageModel: string;
  script: string;
  voice: string;
}

interface NewFrameState {
  insertAfterIndex: number;
  script: string;
  voice: string;
  imageModel: string;
  isGenerating: boolean;
}

interface UseSegmentOperationsProps {
  segments: VideoSegment[];
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (index: number, newSegment: VideoSegment) => void;
}

export function useSegmentOperations({
  segments,
  onSegmentUpdate,
  onSegmentInsert,
}: UseSegmentOperationsProps) {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [newFrameState, setNewFrameState] = useState<NewFrameState | null>(
    null,
  );
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const { generateImage } = useImageGeneration();

  // Debug: Track editingState changes
  useEffect(() => {
    console.log("useSegmentOperations: editingState changed to:", editingState);
  }, [editingState]);

  const handleEdit = (index: number, segment: VideoSegment) => {
    console.log("useSegmentOperations: handleEdit called with index:", index, "segment:", segment.text.substring(0, 50) + "...");
    console.log("useSegmentOperations: Current editingState before update:", editingState);
    
    const newEditingState = {
      index,
      mode: "image" as EditMode,
      imagePrompt: segment.imagePrompt,
      imageModel: "flux-schnell",
      script: segment.text,
      voice: "echo",
    };
    
    console.log("useSegmentOperations: Setting new editingState:", newEditingState);
    setEditingState(newEditingState);
  };

  const handleRegenerateImage = async (
    index: number,
    newPrompt: string,
    model: string,
  ) => {
    if (!onSegmentUpdate) return;

    setIsRegenerating(index);
    try {
      const result = await generateImage({
        prompt: newPrompt,
        model,
      });

      if (result.success && result.imageUrl) {
        const updatedSegment: VideoSegment = {
          ...segments[index],
          imagePrompt: newPrompt,
          imageUrl: result.imageUrl,
        };
        onSegmentUpdate(index, updatedSegment);

      } else {
        // eslint-disable-next-line no-console
        console.error("Failed to regenerate image:", result.error);
        // eslint-disable-next-line no-alert
        alert(`Failed to regenerate image: ${result.error}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error regenerating image:", error);
      // eslint-disable-next-line no-alert
      alert("Error regenerating image. Please try again.");
    } finally {
      setIsRegenerating(null);
      setEditingState(null);
    }
  };

  const handleRegenerateAudio = async (
    index: number,
    newScript: string,
    voice: string,
  ) => {
    if (!onSegmentUpdate) return;

    setIsRegenerating(index);
    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newScript,
          voice: voice,
          index: index,
        }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();

        // Get actual audio duration
        let actualDuration: number;
        try {
          actualDuration = await getAudioDuration(audioUrl);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(
            `Could not get actual duration for segment ${index}, using estimate:`,
            error,
          );
          actualDuration = estimateAudioDuration(newScript);
        }

        const updatedSegment: VideoSegment = {
          ...segments[index],
          text: newScript,
          audioUrl: audioUrl,
          duration: actualDuration,
        };
        onSegmentUpdate(index, updatedSegment);
      } else {
        const error = await response.json();
        // eslint-disable-next-line no-alert
        alert(`Failed to regenerate audio: ${error.error}`);
      }
    } catch (error) {
      console.error("Error regenerating audio:", error);
      alert("Error regenerating audio. Please try again.");
    } finally {
      setIsRegenerating(null);
      setEditingState(null);
    }
  };

  // Generate image prompt from script
  const generateImagePrompt = async (script: string): Promise<string> => {
    try {
      const response = await fetch("/api/generate-image-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          style: "dark_eerie_survival", // Use the existing style
        }),
      });

      if (response.ok) {
        const { imagePrompt } = await response.json();
        return imagePrompt;
      } else {
        console.error("Failed to generate image prompt");
        return `Dark, eerie scene representing: ${script}`;
      }
    } catch (error) {
      console.error("Error generating image prompt:", error);
      return `Dark, eerie scene representing: ${script}`;
    }
  };

  // Handle new frame creation
  const handleCreateNewFrame = (insertAfterIndex: number) => {
    setNewFrameState({
      insertAfterIndex,
      script: "",
      voice: "echo",
      imageModel: "flux-schnell",
      isGenerating: false,
    });
  };

  // Count words in script
  const countWords = (text: string): number => {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  };

  // Generate new frame with all assets
  const handleGenerateNewFrame = async (
    script: string,
    voice: string,
    imageModel: string,
  ) => {
    if (!newFrameState || !onSegmentInsert) return;

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

    setNewFrameState((prev) => (prev ? { ...prev, isGenerating: true } : null));

    try {
      // Step 1: Generate image prompt
      const imagePrompt = await generateImagePrompt(script);

      // Step 2: Generate image
      const imageResult = await generateImage({
        prompt: imagePrompt,
        model: imageModel,
      });

      if (!imageResult.success) {
        throw new Error("Failed to generate image: " + imageResult.error);
      }


      // Step 3: Generate audio
      const audioResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
          voice: voice,
          index: newFrameState.insertAfterIndex + 1,
        }),
      });

      if (!audioResponse.ok) {
        const error = await audioResponse.json();
        throw new Error("Failed to generate audio: " + error.error);
      }

      const { audioUrl } = await audioResponse.json();

      // Get actual audio duration
      let actualDuration: number;
      try {
        actualDuration = await getAudioDuration(audioUrl);
      } catch (error) {
        console.warn("Could not get actual duration, using estimate:", error);
        actualDuration = estimateAudioDuration(script);
      }

      // Step 4: Create new segment
      const newSegment: VideoSegment = {
        _id: `segment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: script,
        imagePrompt: imagePrompt,
        imageUrl: imageResult.imageUrl!,
        audioUrl: audioUrl,
        audioVolume: 1,
        playBackRate: 1,
        duration: actualDuration,
        withBlur: false,
        backgroundMinimized: false,
        order: newFrameState.insertAfterIndex + 1,
        media: [],
        wordTimings: [],
        elements: [],
      };

      // Step 5: Insert new segment
      onSegmentInsert(newFrameState.insertAfterIndex, newSegment);

      // Close modal
      setNewFrameState(null);
    } catch (error) {
      console.error("Error creating new frame:", error);
      alert("Error creating new frame: " + (error as Error).message);
    } finally {
      setNewFrameState((prev) =>
        prev ? { ...prev, isGenerating: false } : null,
      );
    }
  };

  const closeEditDialog = () => {
    console.log("useSegmentOperations: closeEditDialog called - clearing editingState");
    setEditingState(null);
  };

  const closeNewFrameDialog = () => {
    setNewFrameState(null);
  };

  return {
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
  };
}
