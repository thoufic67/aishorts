import { NextRequest, NextResponse } from "next/server";
import { FalAIService } from "@/lib/falai-service";
import { OpenAIService } from "@/lib/openai-service";
import { auth } from "@/auth";

interface SingleImageRequest {
  type: "single";
  prompt: string;
  style?: string;
  imageSize?: string;
  model?: string;
  quality?: "low" | "medium" | "high";
  aspectRatio?: "square" | "portrait" | "landscape";
  storeInR2?: boolean;
  projectId?: string;
  segmentId?: string;
}

interface BatchImageRequest {
  type: "batch";
  storeInR2?: boolean;
  projectId?: string;
  prompts: Array<{
    prompt: string;
    style?: string;
    imageSize?: string;
    model?: string;
    quality?: "low" | "medium" | "high";
    aspectRatio?: "square" | "portrait" | "landscape";
    segmentId?: string;
  }>;
}

type ImageGenerationRequest = SingleImageRequest | BatchImageRequest;

interface ImageResult {
  success: boolean;
  imageUrl?: string;
  r2Key?: string;
  r2Url?: string;
  tempUrl?: string;
  fileRecord?: any;
  error?: string;
  prompt?: string;
}

// Helper function to determine which service to use based on model
function isOpenAIModel(model?: string): boolean {
  return model === "dall-e-3" || model === "gpt-image-1";
}

// Helper function to generate image using the appropriate service with caching
async function generateImageWithService(
  prompt: string,
  style?: string,
  imageSize?: string,
  model?: string,
  quality?: "low" | "medium" | "high",
  aspectRatio?: "square" | "portrait" | "landscape",
  storeInR2?: boolean,
  userId?: string,
  projectId?: string,
  segmentId?: string,
): Promise<ImageResult> {
  let result: ImageResult;
  
  if (isOpenAIModel(model)) {
    // Use OpenAI service for DALL-E 3 and GPT-Image-1
    result = await OpenAIService.generateImage({
      prompt,
      style,
      imageSize,
      quality,
      aspectRatio,
      storeInR2,
      userId,
      projectId,
      segmentId,
    });
  } else {
    // Use FalAI service for Flux models
    // Note: FalAI service doesn't yet support R2 storage
    result = await FalAIService.generateImage(
      prompt,
      style,
      imageSize,
      model,
    );
  }
  
  return {
    ...result,
    prompt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageGenerationRequest = await request.json();

    // Get user session if R2 storage is requested
    let userId: string | undefined;
    if ((body.type === "single" && body.storeInR2) || 
        (body.type === "batch" && body.storeInR2)) {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: 'Authentication required for R2 storage' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    if (body.type === "single") {
      // Single image generation for regeneration
      const result = await generateImageWithService(
        body.prompt,
        body.style,
        body.imageSize,
        body.model,
        body.quality,
        body.aspectRatio,
        body.storeInR2,
        userId,
        body.projectId,
        body.segmentId,
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
            promptData.quality,
            promptData.aspectRatio,
            body.storeInR2,
            userId,
            body.projectId,
            promptData.segmentId,
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
