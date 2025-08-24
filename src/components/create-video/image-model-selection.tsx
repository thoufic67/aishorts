"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Image, Zap, Clock, Star } from "lucide-react";
import { imageModels, ImageModel } from "@/lib/image-models";

interface ImageModelSelectionProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

const modelIcons = {
  "flux-schnell": Clock,
  "flux-dev": Zap,
  "flux-pro": Star,
  "gpt-image-1": Image,
} as const;

const modelColors = {
  "flux-schnell": "from-green-400 to-blue-400",
  "flux-dev": "from-blue-400 to-purple-400",
  "flux-pro": "from-purple-400 to-pink-400",
  "gpt-image-1": "from-orange-400 to-red-400",
} as const;

export function ImageModelSelection({ selectedModel, onModelSelect }: ImageModelSelectionProps) {
  const [showMore, setShowMore] = useState(false);
  
  const visibleModels = showMore ? imageModels : imageModels.slice(0, 3);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Image Model Selection</h3>
        <p className="text-sm text-gray-600">Choose an AI model for generating video images</p>
      </div>

      <div className="space-y-3">
        {visibleModels.map((model) => {
          const IconComponent = modelIcons[model.id as keyof typeof modelIcons] || Image;
          const colorClass = modelColors[model.id as keyof typeof modelColors] || "from-gray-400 to-gray-500";
          
          return (
            <div
              key={model.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                selectedModel === model.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Model Avatar */}
                <div
                  className={`h-12 w-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center`}
                >
                  <IconComponent className="h-5 w-5 text-white" />
                </div>

                {/* Model Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{model.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{model.description}</p>
                </div>
              </div>

              {/* Selection Button */}
              <div>
                {selectedModel === model.id ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onModelSelect(model.id)}
                  >
                    Select
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* View More Button */}
        {imageModels.length > 3 && (
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