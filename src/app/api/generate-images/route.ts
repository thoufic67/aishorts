import { NextRequest, NextResponse } from "next/server";
import { FalAIService } from "@/lib/falai-service";
import { OpenAIService } from "@/lib/openai-service";

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

// Helper function to determine which service to use based on model
function isOpenAIModel(model?: string): boolean {
  return model === "dall-e-3" || model === "gpt-image-1";
}

// Helper function to generate image using the appropriate service
async function generateImageWithService(
  prompt: string,
  style?: string,
  imageSize?: string,
  model?: string,
): Promise<ImageResult> {
  if (isOpenAIModel(model)) {
    // Use OpenAI service for DALL-E 3
    const result = await OpenAIService.generateImage({
      prompt,
      style,
      imageSize,
    });
    return {
      ...result,
      prompt,
    };
  } else {
    // Use FalAI service for Flux models
    const result = await FalAIService.generateImage(
      prompt,
      style,
      imageSize,
      model,
    );
    return {
      ...result,
      prompt,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();

    if (body.type === "single") {
      // Single image generation for regeneration
      const result = await generateImageWithService(
        body.prompt,
        body.style,
        body.imageSize,
        body.model,
      );

      return NextResponse.json(result);
    } else if (body.type === "batch") {
      // Batch image generation for create-video flow
      const results: ImageResult[] = [];

      // Process images sequentially to avoid rate limiting
      for (const promptData of body.prompts) {
        try {
          const result = await generateImageWithService(
            promptData.prompt,
            promptData.style,
            promptData.imageSize,
            promptData.model,
          );

          results.push(result);

          // Add a small delay between requests to avoid rate limiting
          // Note: OpenAI has different rate limits than FalAI
          if (body.prompts.length > 1) {
            const delay = isOpenAIModel(promptData.model) ? 2000 : 1000; // Longer delay for OpenAI
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error(
            "Error generating image for prompt:",
            promptData.prompt,
            error,
          );
          results.push({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to generate image",
            prompt: promptData.prompt,
          });
        }
      }

      return NextResponse.json({
        success: true,
        results,
        totalGenerated: results.filter((r) => r.success).length,
        totalRequested: body.prompts.length,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request type. Must be 'single' or 'batch'",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error in image generation API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
