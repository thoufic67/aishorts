"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2, Check } from "lucide-react";

interface Voice {
  id: string;
  name: string;
  type: string;
  description: string;
  color: string;
  demoText: string;
}

interface VoiceSelectionProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
}

const voices: Voice[] = [
  {
    id: "alloy",
    name: "Alloy",
    type: "OpenAI Voice",
    description: "Neutral and balanced",
    color: "from-blue-400 to-purple-400",
    demoText: "Hello, I'm Alloy. I have a neutral and balanced voice that works well for most content."
  },
  {
    id: "echo",
    name: "Echo", 
    type: "OpenAI Voice",
    description: "Clear and articulate",
    color: "from-green-400 to-blue-400",
    demoText: "Hi there! I'm Echo, with a clear and articulate speaking style perfect for educational content."
  },
  {
    id: "fable",
    name: "Fable",
    type: "OpenAI Voice", 
    description: "Warm and expressive",
    color: "from-red-400 to-pink-400",
    demoText: "Welcome! I'm Fable, bringing warmth and expression to your storytelling and narratives."
  },
  {
    id: "onyx",
    name: "Onyx",
    type: "OpenAI Voice",
    description: "Deep and authoritative", 
    color: "from-blue-600 to-purple-600",
    demoText: "Greetings. I am Onyx, with a deep and authoritative voice ideal for professional presentations."
  },
  {
    id: "nova",
    name: "Nova",
    type: "OpenAI Voice",
    description: "Bright and energetic",
    color: "from-yellow-400 to-orange-400", 
    demoText: "Hey everyone! I'm Nova, bringing bright energy and enthusiasm to your content!"
  },
  {
    id: "shimmer",
    name: "Shimmer",
    type: "OpenAI Voice", 
    description: "Soft and gentle",
    color: "from-purple-400 to-pink-400",
    demoText: "Hello, I'm Shimmer. My soft and gentle voice is perfect for calming, soothing content."
  },
];

export function VoiceSelection({ selectedVoice, onVoiceSelect }: VoiceSelectionProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const visibleVoices = showMore ? voices : voices.slice(0, 4);

  const handlePlayDemo = async (voice: Voice) => {
    if (playingVoice === voice.id) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setPlayingVoice(voice.id);

    try {
      // Generate demo audio
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: voice.demoText,
          voice: voice.id,
          index: 0,
        }),
      });

      if (response.ok) {
        const { audioUrl } = await response.json();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        audio.onerror = () => {
          setPlayingVoice(null);
          audioRef.current = null;
        };

        await audio.play();
      } else {
        setPlayingVoice(null);
      }
    } catch (error) {
      console.error("Error playing demo:", error);
      setPlayingVoice(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Voice Selection</h3>
        <p className="text-sm text-gray-600">Choose or clone a voice for your content</p>
      </div>

      <div className="space-y-3">
        {visibleVoices.map((voice) => (
          <div
            key={voice.id}
            className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
              selectedVoice === voice.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Voice Avatar */}
              <div
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${voice.color} flex items-center justify-center`}
              >
                <Volume2 className="h-5 w-5 text-white" />
              </div>

              {/* Voice Info */}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{voice.name}</h4>
                  <span className="text-xs text-gray-500">{voice.type}</span>
                </div>
                <p className="text-sm text-gray-600">{voice.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handlePlayDemo(voice)}
                  >
                    {playingVoice === voice.id ? (
                      <Pause className="h-3 w-3 mr-1" />
                    ) : (
                      <Play className="h-3 w-3 mr-1" />
                    )}
                    Voice Design
                  </Button>
                </div>
              </div>
            </div>

            {/* Selection Button */}
            <div>
              {selectedVoice === voice.id ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Selected</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onVoiceSelect(voice.id)}
                >
                  Select
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* View More Button */}
        {voices.length > 4 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowMore(!showMore)}
          >
            {showMore ? "View less" : "View more"}
            <svg
              className={`ml-2 h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        )}
      </div>
    </Card>
  );
}