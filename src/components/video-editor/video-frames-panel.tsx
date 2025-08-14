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

export function VideoFramesPanel({
  segments,
  selectedFrameIndex,
  onFrameSelect,
  currentTime,
  totalDuration,
  onSegmentUpdate,
}: VideoFramesPanelProps) {
  const [editingState, setEditingState] = useState<EditingState | null>(null);
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
  return (
    <div className="w-80 border-r bg-white">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="font-medium">Frames</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Frames list */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {segments.map((segment, index) => (
            <Card
              key={segment._id}
              className={`cursor-pointer border transition-all ${
                selectedFrameIndex === index
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => onFrameSelect(index)}
            >
              <div className="p-3">
                {/* Frame header */}
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

                {/* Frame thumbnail and content */}
                <div className="space-y-2">
                  {/* Thumbnail - Use actual video/image */}
                  <div className="relative mx-auto overflow-hidden rounded">
                    {/* Display actual media if available */}
                    {segment.media && segment.media.length > 0 ? (
                      <video
                        autoPlay
                        playsInline
                        src={segment.media[0].url}
                        className="mx-auto aspect-[9/16] h-full w-full max-w-48 object-cover"
                        muted
                        preload="metadata"
                        poster={segment.imageUrl}
                      />
                    ) : segment.imageUrl ? (
                      <img
                        src={segment.imageUrl}
                        alt={segment.imagePrompt}
                        className="absolute inset-0 aspect-[9/16] h-full w-full max-w-48 object-cover"
                      />
                    ) : (
                      /* Fallback candle image */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-20 w-3 rounded-full bg-gradient-to-t from-yellow-600 via-orange-500 to-red-500 shadow-lg">
                          {/* Flame effect */}
                          <div className="relative -top-2 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-orange-400 to-yellow-300 shadow-md"></div>
                        </div>
                      </div>
                    )}

                    {/* Regeneration loading overlay */}
                    {isRegenerating === index && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex flex-col items-center gap-2 text-white">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                          <span className="text-xs">Regenerating...</span>
                        </div>
                      </div>
                    )}

                    {/* Voice caption indicator */}
                    <div className="absolute bottom-2 left-2">
                      <div className="rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-medium text-black">
                        🗣️ Voice caption
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="absolute bottom-2 right-2">
                      <div className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-medium text-white">
                        {formatTime(segment.duration)}
                      </div>
                    </div>
                  </div>

                  {/* Caption text */}
                  <p className="text-xs leading-relaxed text-gray-600">
                    {segment.text}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {/* Add new frame button */}
          <Button
            variant="outline"
            className="w-full border-dashed border-gray-300 py-8 text-gray-500 hover:border-gray-400 hover:text-gray-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add new frame
          </Button>
        </div>
      </div>
    </div>
  );
}
