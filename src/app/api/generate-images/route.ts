import { NextRequest, NextResponse } from "next/server";
import { FalAIService } from "@/lib/falai-service";

interface SingleImageRequest {
  type: "single";
  prompt: string;
  style?: string;
  imageSize?: string;
  model?: string;
}

interface BatchImageRequest {
  type: "batch";
  prompts: Array<{
    prompt: string;
    style?: string;
    imageSize?: string;
    model?: string;
  }>;
}

type ImageGenerationRequest = SingleImageRequest | BatchImageRequest;

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();

    if (body.type === "single") {
      // Single image generation for regeneration
      const result = await FalAIService.generateImage(
        body.prompt,
        body.style,
        body.imageSize,
        body.model
      );

      return NextResponse.json(result);
    } else if (body.type === "batch") {
      // Batch image generation for create-video flow
      const results: ImageResult[] = [];

      // Process images sequentially to avoid rate limiting
      for (const promptData of body.prompts) {
        try {
          const result = await FalAIService.generateImage(
            promptData.prompt,
            promptData.style,
            promptData.imageSize,
            promptData.model
          );
          
          results.push({
            ...result,
            prompt: promptData.prompt,
          });

          // Add a small delay between requests to avoid rate limiting
          if (body.prompts.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error("Error generating image for prompt:", promptData.prompt, error);
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate image",
            prompt: promptData.prompt,
          });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        totalGenerated: results.filter(r => r.success).length,
        totalRequested: body.prompts.length,
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid request type. Must be 'single' or 'batch'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in image generation API:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}