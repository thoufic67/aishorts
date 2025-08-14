import { fal } from "@fal-ai/client";

interface FalAIImageResponse {
  images: Array<{
    url: string;
    width: number;
    height: number;
  }>;
}

interface FalAIVideoResponse {
  video: {
    url: string;
  };
}

export class FalAIService {
  private static API_KEY_STORAGE_KEY = process.env.FAL_AI_API_KEY || "";
  private static IMAGE_BASE_URL = "https://fal.run/fal-ai/flux/schnell";
  private static VIDEO_MODEL = "fal-ai/minimax-video/image-to-video";

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    // Set the API key for the fal client
    fal.config({
      credentials: apiKey,
    });
  }

  static getApiKey(): string | null {
    if (typeof window === "undefined") {
      // Server-side, use environment variable
      return process.env.FAL_AI_API_KEY || null;
    }
    // Client-side, use localStorage
    return localStorage.getItem(this.API_KEY_STORAGE_KEY) || process.env.FAL_AI_API_KEY || null;
  }

  static async generateImage(
    prompt: string,
    style?: string,
    imageSize: string = "portrait_16_9",
  ): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: "Fal.ai API key not found" };
    }

    try {
      const fullPrompt = style
        ? `${prompt}, ${style}`
        : `${prompt}, cinematic, high quality, detailed`;

      const response = await fetch(this.IMAGE_BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          image_size: imageSize,
          num_inference_steps: 4,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: FalAIImageResponse = await response.json();
      const imageUrl = data.images[0]?.url;

      if (!imageUrl) {
        throw new Error("No image generated");
      }

      return { success: true, imageUrl };
    } catch (error) {
      console.error("Error generating image:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  }

  static async generateVideo(
    imageUrl: string,
    prompt?: string,
  ): Promise<{ success: boolean; videoUrl?: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: "Fal.ai API key not found" };
    }

    try {
      // Configure the fal client with the API key
      fal.config({
        credentials: apiKey,
      });

      // Use the fal client library to generate video
      const result = await fal.subscribe(this.VIDEO_MODEL, {
        input: {
          image_url: imageUrl,
          motion_bucket_id: 127,
          fps: 8,
          num_frames: 25,
          ...(prompt && { prompt }),
        },
      });

      // The result should contain the video URL
      const videoUrl = (result as any).video?.url;

      if (!videoUrl) {
        throw new Error("No video generated");
      }

      return { success: true, videoUrl };
    } catch (error) {
      console.error("Error generating video:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate video",
      };
    }
  }
}
