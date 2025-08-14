import { useState } from "react";
import { Settings, MoreHorizontal, Plus, Edit2, RefreshCw, Image, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getAudioDuration, estimateAudioDuration } from "@/lib/audio-utils";
import type { VideoSegment } from "@/types/video";

interface VideoFramesPanelProps {
  segments: VideoSegment[];
  selectedFrameIndex: number;
  onFrameSelect: (index: number) => void;
  currentTime: number;
  totalDuration: number;
  onSegmentUpdate?: (index: number, updatedSegment: VideoSegment) => void;
  onSegmentInsert?: (index: number, newSegment: VideoSegment) => void;
  orientation?: 'vertical' | 'horizontal';
  showHeader?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, "0")}s`;
}

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

export function VideoFramesPanel({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  currentTime,
  totalDuration,
  onSegmentUpdate,
  onSegmentInsert,
  orientation = 'vertical',
  showHeader = true,
}: VideoFramesPanelProps) {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [newFrameState, setNewFrameState] = useState<NewFrameState | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<EditMode>("image");

  const imageModels = [
    { id: "flux-schnell", name: "Flux Schnell (Fast)", description: "Fast generation, good quality" },
    { id: "flux-dev", name: "Flux Dev (Balanced)", description: "Balanced speed and quality" },
    { id: "flux-pro", name: "Flux Pro (Best)", description: "Highest quality, slower" },
  ];

  const voiceOptions = [
    { id: "alloy", name: "Alloy", description: "Neutral and balanced" },
    { id: "echo", name: "Echo", description: "Clear and articulate" },
    { id: "fable", name: "Fable", description: "Warm and expressive" },
    { id: "onyx", name: "Onyx", description: "Deep and authoritative" },
    { id: "nova", name: "Nova", description: "Bright and energetic" },
    { id: "shimmer", name: "Shimmer", description: "Soft and gentle" },
  ];

  const handleEdit = (index: number, segment: VideoSegment) => {
    setEditingState({
      index,
      mode: "image",
      imagePrompt: segment.imagePrompt,
      imageModel: "flux-schnell",
      script: segment.text,
      voice: "echo",
    });
    setActiveTab("image");
  };

  const handleRegenerateImage = async (index: number, newPrompt: string, model: string) => {
    if (!onSegmentUpdate) return;

    setIsRegenerating(index);
    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "single",
          prompt: newPrompt,
          model: model,
        }),
      });

      const result = await response.json();
      
      if (result.success && result.imageUrl) {
        const updatedSegment: VideoSegment = {
          ...segments[index],
          imagePrompt: newPrompt,
          imageUrl: result.imageUrl,
        };
        onSegmentUpdate(index, updatedSegment);
      } else {
        console.error("Failed to regenerate image:", result.error);
        alert(`Failed to regenerate image: ${result.error}`);
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      alert("Error regenerating image. Please try again.");
    } finally {
      setIsRegenerating(null);
      setEditingState(null);
    }
  };

  const handleRegenerateAudio = async (index: number, newScript: string, voice: string) => {
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
          console.warn(`Could not get actual duration for segment ${index}, using estimate:`, error);
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
  const handleGenerateNewFrame = async () => {
    if (!newFrameState || !onSegmentInsert) return;

    // Validate script length (max 50 words)
    const wordCount = countWords(newFrameState.script);
    if (wordCount > 50) {
      alert("Script must be 50 words or less. Current count: " + wordCount);
      return;
    }

    if (!newFrameState.script.trim()) {
      alert("Please enter a script for the new frame.");
      return;
    }

    setNewFrameState(prev => prev ? { ...prev, isGenerating: true } : null);

    try {
      // Step 1: Generate image prompt
      const imagePrompt = await generateImagePrompt(newFrameState.script);

      // Step 2: Generate image
      const imageResponse = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "single",
          prompt: imagePrompt,
          model: newFrameState.imageModel,
        }),
      });

      const imageResult = await imageResponse.json();
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
          text: newFrameState.script,
          voice: newFrameState.voice,
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
        actualDuration = estimateAudioDuration(newFrameState.script);
      }

      // Step 4: Create new segment
      const newSegment: VideoSegment = {
        _id: `segment_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: newFrameState.script,
        imagePrompt: imagePrompt,
        imageUrl: imageResult.imageUrl,
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
      setNewFrameState(prev => prev ? { ...prev, isGenerating: false } : null);
    }
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={isHorizontal ? "w-full" : "w-80 border-r bg-white"}>
      {/* Header */}
      {showHeader && (
        <div className={`flex items-center justify-between ${isHorizontal ? "p-4 border-b" : "h-14 border-b px-4"}`}>
          <h2 className="font-medium text-sm">
            {isHorizontal ? "Segments" : "Frames"}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Frames list */}
      <div className={`${isHorizontal ? "overflow-x-auto p-4" : "flex-1 overflow-y-auto p-4"}`}>
        <div className={isHorizontal ? "flex gap-3" : "space-y-3"}>
          {segments.map((segment, index) => (
            <div key={`frame-group-${index}`} className={isHorizontal ? "flex-shrink-0 flex items-center gap-2" : ""}>
              {/* Add frame button before first frame */}
              {index === 0 && (
                <div className={`flex ${isHorizontal ? "flex-col items-center" : "mb-3 justify-center"}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                    onClick={() => handleCreateNewFrame(-1)}
                    title={isHorizontal ? "Add segment at beginning" : "Add frame at beginning"}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <Card
                className={`cursor-pointer border transition-all ${isHorizontal ? "w-20" : ""} ${
                  selectedFrameIndex === index
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onFrameSelect(index)}
              >
              <div className={isHorizontal ? "p-2" : "p-3"}>
                {/* Frame header */}
                {!isHorizontal && (
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-sm font-medium">#{index}</span>
                      <div className="flex items-center gap-1">
                      <Dialog open={editingState?.index === index} onOpenChange={(open) => !open && setEditingState(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(index, segment);
                            }}
                            title="Edit segment"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Segment #{index}</DialogTitle>
                          </DialogHeader>
                          
                          {editingState && (() => {
                            const currentSegment = segments[editingState.index];
                            return (
                              <>
                          
                          
                          {/* Tab Navigation */}
                          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                            <button
                              onClick={() => setActiveTab("image")}
                              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                activeTab === "image"
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              <Image className="h-4 w-4" />
                              Image
                            </button>
                            <button
                              onClick={() => setActiveTab("script")}
                              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                activeTab === "script"
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                              }`}
                            >
                              <Mic className="h-4 w-4" />
                              Script & Voice
                            </button>
                          </div>

                          {/* Tab Content */}
                          <div className="mt-4 space-y-4">
                            {activeTab === "image" && (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column - Image Preview */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Current Image</label>
                                    <div className="mt-2 relative aspect-[9/16] w-full max-w-48 mx-auto overflow-hidden rounded-lg border bg-gray-100">
                                      {currentSegment.imageUrl ? (
                                        <img
                                          src={currentSegment.imageUrl}
                                          alt={currentSegment.imagePrompt}
                                          className="absolute inset-0 h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                          <div className="text-center">
                                            <Image className="h-8 w-8 mx-auto mb-2" />
                                            <div className="text-xs">No image</div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Regeneration loading overlay */}
                                      {isRegenerating === editingState.index && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                          <div className="flex flex-col items-center gap-2 text-white">
                                            <RefreshCw className="h-6 w-6 animate-spin" />
                                            <span className="text-xs">Generating...</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Image Metadata */}
                                    {currentSegment.imageUrl && (
                                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                                        <div className="truncate">
                                          <span className="font-medium">Current prompt:</span> {currentSegment.imagePrompt}
                                        </div>
                                        <div>
                                          <span className="font-medium">Resolution:</span> 1080×1920 (9:16)
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right Column - Controls */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Image Prompt</label>
                                    <Textarea
                                      value={editingState?.imagePrompt || ""}
                                      onChange={(e) => setEditingState(prev => prev ? { ...prev, imagePrompt: e.target.value } : null)}
                                      placeholder="Enter image prompt..."
                                      className="mt-2"
                                      rows={3}
                                    />
                                    {editingState?.imagePrompt !== currentSegment.imagePrompt && (
                                      <div className="mt-1 text-xs text-blue-600">
                                        ⚡ Prompt modified - click "Regenerate Image" to apply changes
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Image Model</label>
                                    <div className="mt-2 space-y-2">
                                      {imageModels.map((model) => (
                                        <div key={model.id} className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={model.id}
                                            name="imageModel"
                                            value={model.id}
                                            checked={editingState?.imageModel === model.id}
                                            onChange={(e) => setEditingState(prev => prev ? { ...prev, imageModel: e.target.value } : null)}
                                            className="h-4 w-4 text-blue-600"
                                          />
                                          <label htmlFor={model.id} className="flex-1">
                                            <div className="text-sm font-medium">{model.name}</div>
                                            <div className="text-xs text-gray-500">{model.description}</div>
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeTab === "script" && (
                              <div className="space-y-4">
                                {/* Current Audio Info */}
                                {currentSegment.audioUrl && (
                                  <div className="rounded-lg bg-gray-50 p-3">
                                    <div className="text-sm font-medium text-gray-700 mb-2">Current Audio</div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div><span className="font-medium">Duration:</span> {formatTime(currentSegment.duration)}</div>
                                      <div><span className="font-medium">Text:</span> "{currentSegment.text}"</div>
                                    </div>
                                  </div>
                                )}
                                
                                <div>
                                  <label className="text-sm font-medium">Script Text</label>
                                  <Textarea
                                    value={editingState?.script || ""}
                                    onChange={(e) => setEditingState(prev => prev ? { ...prev, script: e.target.value } : null)}
                                    placeholder="Enter script text..."
                                    className="mt-2"
                                    rows={4}
                                  />
                                  {editingState?.script !== currentSegment.text && (
                                    <div className="mt-1 text-xs text-blue-600">
                                      ⚡ Script modified - click "Regenerate Audio" to apply changes
                                    </div>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-sm font-medium">Voice</label>
                                  <div className="mt-2 space-y-2">
                                    {voiceOptions.map((voice) => (
                                      <div key={voice.id} className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id={voice.id}
                                          name="voice"
                                          value={voice.id}
                                          checked={editingState?.voice === voice.id}
                                          onChange={(e) => setEditingState(prev => prev ? { ...prev, voice: e.target.value } : null)}
                                          className="h-4 w-4 text-blue-600"
                                        />
                                        <label htmlFor={voice.id} className="flex-1">
                                          <div className="text-sm font-medium">{voice.name}</div>
                                          <div className="text-xs text-gray-500">{voice.description}</div>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setEditingState(null)}>
                              Cancel
                            </Button>
                            {activeTab === "image" && (
                              <Button 
                                onClick={() => editingState && handleRegenerateImage(editingState.index, editingState.imagePrompt, editingState.imageModel)}
                                disabled={isRegenerating === index}
                              >
                                {isRegenerating === index ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  "Regenerate Image"
                                )}
                              </Button>
                            )}
                            {activeTab === "script" && (
                              <Button 
                                onClick={() => editingState && handleRegenerateAudio(editingState.index, editingState.script, editingState.voice)}
                                disabled={isRegenerating === index}
                              >
                                {isRegenerating === index ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  "Regenerate Audio"
                                )}
                              </Button>
                            )}
                          </div>
                              </>
                            );
                          })()}
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                )}

                {/* Frame thumbnail and content */}
                <div className={isHorizontal ? "relative" : "space-y-2"}>
                  {/* Thumbnail - Use actual video/image */}
                  <div className={`relative overflow-hidden rounded ${isHorizontal ? "h-16 w-12 mx-auto" : "mx-auto"}`}>
                    {/* Display actual media if available */}
                    {segment.media && segment.media.length > 0 ? (
                      <video
                        autoPlay
                        playsInline
                        src={segment.media[0].url}
                        className={`object-cover ${isHorizontal ? "h-full w-full" : "mx-auto aspect-[9/16] h-full w-full max-w-48"}`}
                        muted
                        preload="metadata"
                        poster={segment.imageUrl}
                      />
                    ) : segment.imageUrl ? (
                      <img
                        src={segment.imageUrl}
                        alt={segment.imagePrompt}
                        className={`object-cover ${isHorizontal ? "h-full w-full" : "absolute inset-0 aspect-[9/16] h-full w-full max-w-48"}`}
                      />
                    ) : (
                      /* Fallback indicator */
                      <div className={`flex items-center justify-center ${isHorizontal ? "h-full w-full bg-gray-200 text-gray-400" : "absolute inset-0"}`}>
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
                    {isRegenerating === index && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex flex-col items-center gap-1 text-white">
                          <RefreshCw className={`animate-spin ${isHorizontal ? "h-4 w-4" : "h-6 w-6"}`} />
                          {!isHorizontal && <span className="text-xs">Regenerating...</span>}
                        </div>
                      </div>
                    )}

                    {/* Edit button overlay for horizontal */}
                    {isHorizontal && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                        <Dialog open={editingState?.index === index} onOpenChange={(open) => !open && setEditingState(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(index, segment);
                              }}
                              title="Edit segment"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Segment #{index}</DialogTitle>
                            </DialogHeader>
                            
                            {editingState && (() => {
                              const currentSegment = segments[editingState.index];
                              return (
                                <>
                            
                            
                            {/* Tab Navigation */}
                            <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                              <button
                                onClick={() => setActiveTab("image")}
                                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                  activeTab === "image"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                              >
                                <Image className="h-4 w-4" />
                                Image
                              </button>
                              <button
                                onClick={() => setActiveTab("script")}
                                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                  activeTab === "script"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                              >
                                <Mic className="h-4 w-4" />
                                Script & Voice
                              </button>
                            </div>

                            {/* Tab Content */}
                            <div className="mt-4 space-y-4">
                              {activeTab === "image" && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Left Column - Image Preview */}
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Current Image</label>
                                      <div className="mt-2 relative aspect-[9/16] w-full max-w-48 mx-auto overflow-hidden rounded-lg border bg-gray-100">
                                        {currentSegment.imageUrl ? (
                                          <img
                                            src={currentSegment.imageUrl}
                                            alt={currentSegment.imagePrompt}
                                            className="absolute inset-0 h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                              <Image className="h-8 w-8 mx-auto mb-2" />
                                              <div className="text-xs">No image</div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Regeneration loading overlay */}
                                        {isRegenerating === editingState.index && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="flex flex-col items-center gap-2 text-white">
                                              <RefreshCw className="h-6 w-6 animate-spin" />
                                              <span className="text-xs">Generating...</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Image Metadata */}
                                      {currentSegment.imageUrl && (
                                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                                          <div className="truncate">
                                            <span className="font-medium">Current prompt:</span> {currentSegment.imagePrompt}
                                          </div>
                                          <div>
                                            <span className="font-medium">Resolution:</span> 1080×1920 (9:16)
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Column - Controls */}
                                  <div className="space-y-4">
                                    <div>
                                      <label className="text-sm font-medium">Image Prompt</label>
                                      <Textarea
                                        value={editingState?.imagePrompt || ""}
                                        onChange={(e) => setEditingState(prev => prev ? { ...prev, imagePrompt: e.target.value } : null)}
                                        placeholder="Enter image prompt..."
                                        className="mt-2"
                                        rows={3}
                                      />
                                      {editingState?.imagePrompt !== currentSegment.imagePrompt && (
                                        <div className="mt-1 text-xs text-blue-600">
                                          ⚡ Prompt modified - click "Regenerate Image" to apply changes
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div>
                                      <label className="text-sm font-medium">Image Model</label>
                                      <div className="mt-2 space-y-2">
                                        {imageModels.map((model) => (
                                          <div key={model.id} className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id={model.id}
                                              name="imageModel"
                                              value={model.id}
                                              checked={editingState?.imageModel === model.id}
                                              onChange={(e) => setEditingState(prev => prev ? { ...prev, imageModel: e.target.value } : null)}
                                              className="h-4 w-4 text-blue-600"
                                            />
                                            <label htmlFor={model.id} className="flex-1">
                                              <div className="text-sm font-medium">{model.name}</div>
                                              <div className="text-xs text-gray-500">{model.description}</div>
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {activeTab === "script" && (
                                <div className="space-y-4">
                                  {/* Current Audio Info */}
                                  {currentSegment.audioUrl && (
                                    <div className="rounded-lg bg-gray-50 p-3">
                                      <div className="text-sm font-medium text-gray-700 mb-2">Current Audio</div>
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div><span className="font-medium">Duration:</span> {formatTime(currentSegment.duration)}</div>
                                        <div><span className="font-medium">Text:</span> "{currentSegment.text}"</div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <label className="text-sm font-medium">Script Text</label>
                                    <Textarea
                                      value={editingState?.script || ""}
                                      onChange={(e) => setEditingState(prev => prev ? { ...prev, script: e.target.value } : null)}
                                      placeholder="Enter script text..."
                                      className="mt-2"
                                      rows={4}
                                    />
                                    {editingState?.script !== currentSegment.text && (
                                      <div className="mt-1 text-xs text-blue-600">
                                        ⚡ Script modified - click "Regenerate Audio" to apply changes
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Voice</label>
                                    <div className="mt-2 space-y-2">
                                      {voiceOptions.map((voice) => (
                                        <div key={voice.id} className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            id={voice.id}
                                            name="voice"
                                            value={voice.id}
                                            checked={editingState?.voice === voice.id}
                                            onChange={(e) => setEditingState(prev => prev ? { ...prev, voice: e.target.value } : null)}
                                            className="h-4 w-4 text-blue-600"
                                          />
                                          <label htmlFor={voice.id} className="flex-1">
                                            <div className="text-sm font-medium">{voice.name}</div>
                                            <div className="text-xs text-gray-500">{voice.description}</div>
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setEditingState(null)}>
                                Cancel
                              </Button>
                              {activeTab === "image" && (
                                <Button 
                                  onClick={() => editingState && handleRegenerateImage(editingState.index, editingState.imagePrompt, editingState.imageModel)}
                                  disabled={isRegenerating === index}
                                >
                                  {isRegenerating === index ? (
                                    <>
                                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    "Regenerate Image"
                                  )}
                                </Button>
                              )}
                              {activeTab === "script" && (
                                <Button 
                                  onClick={() => editingState && handleRegenerateAudio(editingState.index, editingState.script, editingState.voice)}
                                  disabled={isRegenerating === index}
                                >
                                  {isRegenerating === index ? (
                                    <>
                                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    "Regenerate Audio"
                                  )}
                                </Button>
                              )}
                            </div>
                                </>
                              )
                            })()}
                            </DialogContent>
                        </Dialog>
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

                    {/* Duration */}
                    <div className={`absolute ${isHorizontal ? "bottom-1 right-1" : "bottom-2 right-2"}`}>
                      <div className={`rounded bg-black/50 text-white font-medium ${isHorizontal ? "px-1 py-0.5 text-xs" : "px-1.5 py-0.5 text-xs"}`}>
                        {isHorizontal ? formatTime(segment.duration).replace('s', '') : formatTime(segment.duration)}
                      </div>
                    </div>
                  </div>

                  {/* Caption text */}
                  {!isHorizontal && (
                    <p className="text-xs leading-relaxed text-gray-600">
                      {segment.text}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Add frame button after each frame */}
            {isHorizontal ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500 flex-shrink-0"
                onClick={() => handleCreateNewFrame(index)}
                title={`Add segment after #${index}`}
              >
                <Plus className="h-3 w-3" />
              </Button>
            ) : (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 p-0 text-gray-400 hover:border-blue-400 hover:text-blue-500"
                  onClick={() => handleCreateNewFrame(index)}
                  title={`Add frame after #${index}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          ))}

          {/* Legacy add new frame button - kept for compatibility */}
          {!isHorizontal && (
            <Button
              variant="outline"
              className="w-full border-dashed border-gray-300 py-8 text-gray-500 hover:border-gray-400 hover:text-gray-600"
              onClick={() => handleCreateNewFrame(segments.length - 1)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add new frame
            </Button>
          )}
        </div>
      </div>

      {/* New Frame Creation Modal */}
      <Dialog open={!!newFrameState} onOpenChange={(open) => !open && setNewFrameState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add New Frame 
              {newFrameState && newFrameState.insertAfterIndex >= 0 
                ? ` After #${newFrameState.insertAfterIndex}` 
                : ' At Beginning'}
            </DialogTitle>
          </DialogHeader>
          
          {newFrameState && (
            <div className="space-y-4">
              {/* Script Input */}
              <div>
                <label className="text-sm font-medium">
                  Script (max 50 words)
                  <span className="ml-2 text-xs text-gray-500">
                    {countWords(newFrameState.script)}/50 words
                  </span>
                </label>
                <Textarea
                  value={newFrameState.script}
                  onChange={(e) => setNewFrameState(prev => prev ? { ...prev, script: e.target.value } : null)}
                  placeholder="Enter script text for the new frame..."
                  className={`mt-2 ${countWords(newFrameState.script) > 50 ? 'border-red-500' : ''}`}
                  rows={4}
                />
                {countWords(newFrameState.script) > 50 && (
                  <div className="mt-1 text-xs text-red-600">
                    ⚠️ Script exceeds 50 word limit
                  </div>
                )}
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-sm font-medium">Voice</label>
                <div className="mt-2 space-y-2">
                  {voiceOptions.slice(0, 3).map((voice) => (
                    <div key={voice.id} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={`new-${voice.id}`}
                        name="newVoice"
                        value={voice.id}
                        checked={newFrameState.voice === voice.id}
                        onChange={(e) => setNewFrameState(prev => prev ? { ...prev, voice: e.target.value } : null)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor={`new-${voice.id}`} className="flex-1">
                        <div className="text-sm font-medium">{voice.name}</div>
                        <div className="text-xs text-gray-500">{voice.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

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
                        checked={newFrameState.imageModel === model.id}
                        onChange={(e) => setNewFrameState(prev => prev ? { ...prev, imageModel: e.target.value } : null)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor={`new-${model.id}`} className="flex-1">
                        <div className="text-sm font-medium">{model.name}</div>
                        <div className="text-xs text-gray-500">{model.description}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generation Progress */}
              {newFrameState.isGenerating && (
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
                  onClick={() => setNewFrameState(null)}
                  disabled={newFrameState.isGenerating}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateNewFrame}
                  disabled={newFrameState.isGenerating || countWords(newFrameState.script) > 50 || !newFrameState.script.trim()}
                >
                  {newFrameState.isGenerating ? (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
