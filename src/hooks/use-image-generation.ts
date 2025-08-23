"use client";

import { useState, useCallback } from 'react';
import { ImageCacheClient } from '@/lib/image-cache-client';

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
  fromCache?: boolean;
}

interface UseImageGenerationReturn {
  generateImage: (params: ImageGenerationParams) => Promise<ImageGenerationResult>;
  generateBatchImages: (prompts: ImageGenerationParams[]) => Promise<{
    success: boolean;
    results: Array<ImageGenerationResult & { prompt: string }>;
    totalGenerated: number;
    totalRequested: number;
    fromCacheCount: number;
  }>;
  isLoading: boolean;
  cacheStats: {
    totalEntries: number;
    cacheSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  };
  clearCache: () => void;
}

export function useImageGeneration(): UseImageGenerationReturn {
  const [isLoading, setIsLoading] = useState(false);

  const generateImage = useCallback(async (params: ImageGenerationParams): Promise<ImageGenerationResult> => {
    const { prompt, model = "flux-schnell", style, imageSize, quality, aspectRatio } = params;

    try {
      // Check cache first
      const cachedImage = await ImageCacheClient.getCachedImage(prompt, model, style);
      if (cachedImage) {
        return {
          success: true,
          imageUrl: cachedImage,
          fromCache: true
        };
      }

      // Generate new image if not in cache
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

      // Cache the result if successful
      if (result.success && result.imageUrl) {
        await ImageCacheClient.cacheImage(prompt, result.imageUrl, model, style);
      }

      return {
        ...result,
        fromCache: false
      };
    } catch (error) {
      console.error("Error generating image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate image",
        fromCache: false
      };
    }
  }, []);

  const generateBatchImages = useCallback(async (prompts: ImageGenerationParams[]): Promise<{
    success: boolean;
    results: Array<ImageGenerationResult & { prompt: string }>;
    totalGenerated: number;
    totalRequested: number;
    fromCacheCount: number;
  }> => {
    setIsLoading(true);
    let fromCacheCount = 0;
    const results: Array<ImageGenerationResult & { prompt: string }> = [];
    const uncachedPrompts: Array<ImageGenerationParams & { originalIndex: number }> = [];

    try {
      // Check cache for each prompt first
      for (let i = 0; i < prompts.length; i++) {
        const params = prompts[i];
        const cachedImage = await ImageCacheClient.getCachedImage(
          params.prompt,
          params.model || "flux-schnell",
          params.style
        );

        if (cachedImage) {
          results[i] = {
            success: true,
            imageUrl: cachedImage,
            fromCache: true,
            prompt: params.prompt
          };
          fromCacheCount++;
        } else {
          uncachedPrompts.push({ ...params, originalIndex: i });
          results[i] = {
            success: false,
            prompt: params.prompt,
            fromCache: false
          }; // Placeholder
        }
      }

      // Generate images for uncached prompts
      if (uncachedPrompts.length > 0) {
        const batchRequest = uncachedPrompts.map(({ originalIndex, ...params }) => ({
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
          // Update results with generated images and cache them
          for (let i = 0; i < uncachedPrompts.length; i++) {
            const uncachedPrompt = uncachedPrompts[i];
            const originalIndex = uncachedPrompt.originalIndex;
            const generatedResult = batchResult.results[i];

            results[originalIndex] = {
              ...generatedResult,
              fromCache: false
            };

            // Cache successful generations
            if (generatedResult.success && generatedResult.imageUrl) {
              await ImageCacheClient.cacheImage(
                uncachedPrompt.prompt,
                generatedResult.imageUrl,
                uncachedPrompt.model || "flux-schnell",
                uncachedPrompt.style
              );
            }
          }
        }
      }

      const successfulResults = results.filter(r => r.success);
      
      return {
        success: true,
        results,
        totalGenerated: successfulResults.length,
        totalRequested: prompts.length,
        fromCacheCount
      };

    } catch (error) {
      console.error("Error in batch image generation:", error);
      return {
        success: false,
        results: prompts.map(p => ({
          success: false,
          error: error instanceof Error ? error.message : "Failed to generate images",
          prompt: p.prompt,
          fromCache: false
        })),
        totalGenerated: 0,
        totalRequested: prompts.length,
        fromCacheCount
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCacheStats = useCallback(() => {
    return ImageCacheClient.getCacheStats();
  }, []);

  const clearCache = useCallback(() => {
    ImageCacheClient.clearCache();
  }, []);

  return {
    generateImage,
    generateBatchImages,
    isLoading,
    cacheStats: getCacheStats(),
    clearCache,
  };
}