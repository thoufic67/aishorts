"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const CreateVideoPage = () => {
  const [selectedVideoType, setSelectedVideoType] = useState("Faceless Video");
  const [script, setScript] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("AI Images");
  const [selectedPreset, setSelectedPreset] = useState("4k realistic");
  const router = useRouter();

  const videoTypes = [
    { id: "faceless", label: "Faceless Video", icon: Eye, active: true },
    // { id: "ugc", label: "UGC Video", icon: User },
    // { id: "gameplay", label: "Gameplay Video", icon: GamepadIcon },
    // { id: "ugc-ads", label: "UGC Ads", icon: Target },
    // { id: "italian", label: "Italian Brainrot", icon: Crown },
    // { id: "pov", label: "POV Video", icon: User },
  ];

  const generationPresets = [
    {
      id: "dark and eerie",
      label: "Dark and Eerie",
      image: "/preset-dark-eerie.jpg",
      active: true,
    },
    // { id: "line-art", label: "Line Art", image: "/preset-line.jpg" },
    // { id: "cartoon", label: "Cartoon", image: "/preset-cartoon.jpg" },
    // { id: "collage", label: "Collage", image: "/preset-collage.jpg" },
    // { id: "kawaii", label: "Kawaii", image: "/preset-kawaii.jpg" },
    // { id: "cinematic", label: "Cinematic", image: "/preset-cinema.jpg" },
    // { id: "digital-art", label: "Digital Art", image: "/preset-digital.jpg" },
    // { id: "neon", label: "Neon Futuristic", image: "/preset-neon.jpg" },
    // { id: "japanese", label: "Japanese Ink", image: "/preset-japanese.jpg" },
    // { id: "comic", label: "Comic Book", image: "/preset-comic.jpg" },
    // { id: "pixel", label: "Pixel Art", image: "/preset-pixel.jpg" },
    // { id: "retro", label: "Retro", image: "/preset-retro.jpg" },
  ];

  const handleGenerateVideo = () => {
    console.log("Generating video...", {
      videoType: selectedVideoType,
      script,
      mediaType: selectedMediaType,
      preset: selectedPreset,
    });
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
                    onClick={() => setSelectedPreset(preset.label)}
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

            {/* Generate button */}
            <Button
              onClick={handleGenerateVideo}
              className="w-full bg-blue-600 py-3 text-white hover:bg-blue-700"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Video
              <span className="ml-auto text-sm opacity-80">
                Estimated cost: 0 credits
              </span>
            </Button>
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
              {/* Video placeholder with example content */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-900/60 via-transparent to-black/60">
                <div className="flex h-full flex-col justify-between p-4">
                  <div></div>
                  <div className="text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 backdrop-blur-sm">
                      <Pause className="h-4 w-4 text-white" />
                    </div>
                    <div className="mb-1 text-sm font-medium text-white">
                      MARK ANTONY
                    </div>
                  </div>
                </div>
              </div>

              {/* Background image simulation */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #d4a574 0%, #8b4513 50%, #654321 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVideoPage;
