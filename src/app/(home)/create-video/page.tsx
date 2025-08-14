"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProjectStorage, VideoSegmentData } from "@/lib/project-storage";
import {
  imageStyles,
  getDefaultImageStyle,
  getImageStyle,
} from "@/lib/image-config";
import {
  getAudioDurationWithFallback,
  validateSegmentDurations,
} from "@/lib/audio-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  ChevronRight,
  Sparkles,
  ChevronDown,
  Play,
  Eye,
  GamepadIcon,
  Target,
  Crown,
  User,
  Image as ImageIcon,
  Pause,
} from "lucide-react";
import { ScriptSection } from "@/components/create-video/script-section";
import { VoiceSelection } from "@/components/create-video/voice-selection";

const CreateVideoPage = () => {
  const [selectedVideoType, setSelectedVideoType] = useState("Faceless Video");
  const [script, setScript] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("AI Images");
  const [selectedStyleId, setSelectedStyleId] = useState(
    getDefaultImageStyle().id,
  );
  const [selectedVoice, setSelectedVoice] = useState("echo");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  const videoTypes = [
    { id: "faceless", label: "Faceless Video", icon: Eye, active: true },
    // { id: "ugc", label: "UGC Video", icon: User },
    // { id: "gameplay", label: "Gameplay Video", icon: GamepadIcon },
    // { id: "ugc-ads", label: "UGC Ads", icon: Target },
    // { id: "italian", label: "Italian Brainrot", icon: Crown },
    // { id: "pov", label: "POV Video", icon: User },
  ];

  const generationPresets = imageStyles.map((style) => ({
    id: style.id,
    label: style.name,
    image: "",
    active: selectedStyleId === style.id,
  }));

  const handleGenerateVideo = async () => {
    if (!script.trim()) {
      alert("Please enter a script first");
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      // Step 1: Break script into chunks
      setCurrentStep("Breaking script into segments...");
      setProgress(10);

      const chunksResponse = await fetch("/api/break-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });

      if (!chunksResponse.ok) {
        throw new Error("Failed to break script into chunks");
      }

      const { chunks } = await chunksResponse.json();
      setProgress(20);

      // Step 2: Generate image prompts
      setCurrentStep("Generating image prompts...");
      const promptsResponse = await fetch("/api/generate-image-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunks,
          styleId: selectedStyleId,
          style:
            getImageStyle(selectedStyleId)?.name ?? getDefaultImageStyle().name,
        }),
      });

      if (!promptsResponse.ok) {
        throw new Error("Failed to generate image prompts");
      }

      const { prompts } = await promptsResponse.json();
      setProgress(30);

      // Create new project for this video generation
      const projectData = ProjectStorage.createNewProject(
        script.slice(0, 50) + "...", // Use first 50 chars of script as idea
        `Video Project - ${new Date().toLocaleDateString()}`,
      );

      // Update the project with the full script
      ProjectStorage.updateProjectField(projectData.id, "script", script);
      const projectId = projectData.id;

      const segments: VideoSegmentData[] = chunks.map(
        (chunk: string, index: number) => ({
          text: chunk,
          imagePrompt: prompts[index] || `Visual representation of: ${chunk}`,
          order: index,
        }),
      );

      ProjectStorage.updateSegments(projectId, segments);
      setProgress(40);

      // Step 3: Generate images for all segments using batch API
      setCurrentStep("Generating all images...");
      const imageStyle =
        getImageStyle(selectedStyleId) || getDefaultImageStyle();

      // Prepare batch image generation request
      const imagePrompts = segments.map((segment) => {
        const enhancedPrompt = `${imageStyle.systemPrompt}. ${segment.imagePrompt}`;
        // Map model string from config to service model key
        const modelKey = imageStyle.model.includes("schnell")
          ? "flux-schnell"
          : imageStyle.model.includes("dev")
            ? "flux-dev"
            : imageStyle.model.includes("pro")
              ? "flux-pro"
              : "flux-schnell";
        return {
          prompt: enhancedPrompt,
          style: imageStyle.name,
          imageSize: "portrait_16_9",
          model: modelKey,
        };
      });

      setProgress(45);

      const batchImageResponse = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "batch",
          prompts: imagePrompts,
        }),
      });

      if (!batchImageResponse.ok) {
        throw new Error("Failed to generate images");
      }

      const batchImageResult = await batchImageResponse.json();
      setProgress(65);

      // Update project storage with generated images
      if (batchImageResult.success && batchImageResult.results) {
        for (let i = 0; i < batchImageResult.results.length; i++) {
          const result = batchImageResult.results[i];
          if (result.success && result.imageUrl) {
            ProjectStorage.updateSegmentImage(projectId, i, result.imageUrl);
          }
        }
        setCurrentStep(
          `Generated ${batchImageResult.totalGenerated} of ${batchImageResult.totalRequested} images`,
        );
      }

      // Step 4: Generate audio for each segment
      setCurrentStep("Generating audio...");
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        setCurrentStep(`Generating audio ${i + 1} of ${segments.length}...`);

        const audioResponse = await fetch("/api/text-to-speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: segment.text,
            voice: selectedVoice,
            index: i,
          }),
        });

        if (audioResponse.ok) {
          const { audioUrl } = await audioResponse.json();

          // Update progress for audio generation completion
          setProgress(70 + (i + 0.5) * (30 / segments.length));
          setCurrentStep(`Getting audio duration for segment ${i + 1}...`);

          // Get actual audio duration with improved reliability
          const actualDuration = await getAudioDurationWithFallback(
            audioUrl,
            segment.text,
            selectedVoice,
          );
          console.log(`Segment ${i} duration: ${actualDuration.toFixed(2)}s`);

          ProjectStorage.updateSegmentAudio(
            projectId,
            i,
            audioUrl,
            actualDuration,
          );
        }

        setProgress(70 + (i + 1) * (30 / segments.length));
      }

      // Validate all segment durations before completing
      const finalProject = ProjectStorage.getProject(projectId);
      if (finalProject?.segments) {
        const isValid = validateSegmentDurations(finalProject.segments);
        if (!isValid) {
          console.warn(
            "Some segments had invalid durations, they have been fixed with estimates",
          );
          // Save the fixed durations
          ProjectStorage.saveProject(finalProject);
        }

        // Log total video duration for debugging
        const totalDuration = finalProject.segments.reduce(
          (acc, seg) => acc + (seg.duration || 0),
          0,
        );
        console.log(
          `Total video duration: ${totalDuration.toFixed(2)}s for ${finalProject.segments.length} segments`,
        );
      }

      setCurrentStep("Video creation complete!");
      setProgress(100);

      // Redirect to video page with the created video id
      setTimeout(() => {
        router.push(`/video/${projectId}`);
      }, 2000);
    } catch (error) {
      console.error("Error generating video:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with breadcrumb and upgrade notice */}
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Create</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-sm">
            <Crown className="h-4 w-4 text-purple-600" />
            <span className="text-purple-900">You're on Free Plan</span>
            <span className="text-purple-700">
              Upgrade to export videos and more.
            </span>
            <Button
              size="sm"
              className="ml-2 bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Upgrade
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main content */}
        <div className="max-w-2xl flex-1 p-6">
          <div className="space-y-8">
            {/* Title */}
            <div>
              <h1 className="mb-2 text-2xl font-semibold">
                Create a new video
              </h1>
              <p className="text-muted-foreground">
                Select a tool and pick your options to create your video
              </p>
            </div>

            {/* Video type selection */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {videoTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.id}
                      variant={type.active ? "default" : "outline"}
                      onClick={() => setSelectedVideoType(type.label)}
                      className={`flex items-center gap-2 ${
                        type.active
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Script section extracted */}
            <ScriptSection
              script={script}
              onChange={setScript}
              onGenerateClick={() => {
                // TODO: hook up AI script writer action
              }}
            />

            {/* Choose media type */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Choose media type</label>
              <div className="text-sm text-muted-foreground">
                Select what type of media will be used to illustrate your video
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      {selectedMediaType}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  <DropdownMenuItem
                    onClick={() => setSelectedMediaType("AI Images")}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    AI Images
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMediaType("Stock Videos")}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Stock Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedMediaType("Stock Images")}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Stock Images
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Choose generation preset */}
            <div className="space-y-4">
              <label className="text-sm font-medium">
                Choose a generation preset
              </label>
              <div className="grid grid-cols-4 gap-3">
                {generationPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedStyleId(preset.id)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      preset.active
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="h-full w-full bg-gradient-to-br from-orange-200 via-pink-200 to-purple-200" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white">
                      {preset.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <VoiceSelection
              selectedVoice={selectedVoice}
              onVoiceSelect={setSelectedVoice}
            />

            {/* Generate button */}
            <div className="space-y-4">
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{currentStep}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleGenerateVideo}
                className="w-full bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                size="lg"
                disabled={isGenerating || !script.trim()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Video"}
                <span className="ml-auto text-sm opacity-80">
                  Estimated cost: 0 credits
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar - Output Example */}
        <div className="w-80 border-l bg-gray-50/50 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Output</h3>
              <h3 className="font-medium">Example</h3>
            </div>

            <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
              <video
                src="/demo/never-go-to-space-alone.mp4"
                // autoPlay
                // muted
                loop
                controls
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* Background image simulation */}
              {/* <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #d4a574 0%, #8b4513 50%, #654321 100%)",
                }}
              /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVideoPage;
