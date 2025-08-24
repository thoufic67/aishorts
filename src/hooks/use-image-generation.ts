"use client";

import { useState, useCallback } from 'react';

interface ImageGenerationParams {
  prompt: string;
  model?: string;
  style?: string;
  imageSize?: string;
  quality?: "low" | "medium" | "high";
  aspectRatio?: "square" | "portrait" | "landscape";
}

interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

interface UseImageGenerationReturn {
  generateImage: (params: ImageGenerationParams) => Promise<ImageGenerationResult>;
  generateBatchImages: (prompts: ImageGenerationParams[]) => Promise<{
    success: boolean;
    results: Array<ImageGenerationResult & { prompt: string }>;
    totalGenerated: number;
    totalRequested: number;
  }>;
  isLoading: boolean;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);

  const generateImage = useCallback(async (params: ImageGenerationParams): Promise<ImageGenerationResult> => {
    const { prompt, model = "flux-schnell", style, imageSize, quality, aspectRatio } = params;

    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "single",
          prompt,
          model,
          style,
          imageSize,
          quality,
          aspectRatio,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error generating image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  }, []);

  const generateBatchImages = useCallback(async (prompts: ImageGenerationParams[]): Promise<{
    success: boolean;
    results: Array<ImageGenerationResult & { prompt: string }>;
    totalGenerated: number;
    totalRequested: number;
  }> => {
    setIsLoading(true);

    try {
      const batchRequest = prompts.map(params => ({
        prompt: params.prompt,
        model: params.model || "flux-schnell",
        style: params.style,
        imageSize: params.imageSize,
        quality: params.quality,
        aspectRatio: params.aspectRatio,
      }));

      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "batch",
          prompts: batchRequest,
        }),
      });

      const batchResult = await response.json();

      if (batchResult.success && batchResult.results) {
        return {
          success: true,
          results: batchResult.results,
          totalGenerated: batchResult.results.filter((r: any) => r.success).length,
          totalRequested: prompts.length,
        };
      } else {
        return {
          success: false,
          results: prompts.map(p => ({
            success: false,
            error: "Failed to generate images",
            prompt: p.prompt,
          })),
          totalGenerated: 0,
          totalRequested: prompts.length,
        };
      }
    } catch (error) {
      console.error("Error in batch image generation:", error);
      return {
        success: false,
        results: prompts.map(p => ({
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate images",
          prompt: p.prompt,
        })),
        totalGenerated: 0,
        totalRequested: prompts.length,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateImage,
    generateBatchImages,
    isLoading,
  };
}