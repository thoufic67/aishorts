import OpenAI from "openai";
import { getScriptStyle } from "@/lib/script-config";
import { R2Storage } from "@/lib/r2-storage";
import { ProjectService } from "@/lib/project-service";
import { FileUtils } from "@/lib/file-utils";

interface OpenAIScriptResponse {
  script: string;
}

export interface GenerateScriptParams {
  userPrompt: string;
  scriptStyleId: string;
  duration: number; // in seconds
}

export interface GenerateImageParams {
  prompt: string;
  style?: string;
  imageSize?: string;
  quality?: "low" | "medium" | "high";
  aspectRatio?: "square" | "portrait" | "landscape";
  storeInR2?: boolean;
  userId?: string;
  projectId?: string;
  segmentId?: string;
}

export class OpenAIService {
  private static openai: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not found in environment variables");
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  static async generateScript({
    userPrompt,
    scriptStyleId,
    duration,
  }: GenerateScriptParams): Promise<{
    success: boolean;
    script?: string;
    error?: string;
  }> {
    try {
      const client = this.getClient();
      const style = getScriptStyle(scriptStyleId);

      if (!style) {
        return { success: false, error: "Invalid script style" };
      }

      // Build the system prompt using the style's system prompt and duration guidance
      const systemPrompt = this.buildSystemPromptFromConfig(
        style.systemPrompt,
        duration,
      );

      // Build the user prompt with context
      const contextualPrompt = this.buildUserPrompt(
        userPrompt,
        style.name,
        duration,
      );

      const response = await client.chat.completions.create({
        model: style.model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: contextualPrompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.8,
        top_p: 0.9,
      });

      const script = response.choices[0]?.message?.content;

      if (!script) {
        return {
          success: false,
          error: "No script generated from OpenAI",
        };
      }

      return {
        success: true,
        script,
      };
    } catch (error) {
      console.error("Error generating script with OpenAI:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate script",
      };
    }
  }

  private static buildSystemPromptFromConfig(
    baseSystemPrompt: string,
    duration: number,
  ): string {
    const durationGuidance = `
The script should be approximately ${duration} seconds long. Consider:
- For 15-30 seconds: Focus on one key hook and quick payoff
- For 30-60 seconds: Allow for setup, development, and conclusion
- For 60+ seconds: Include multiple story beats and deeper engagement

Structure your script with clear timing in mind. Each sentence should flow naturally and be easy to speak aloud.`;

    const outputConstraints = `
Return ONLY the script text with no explanations, no section headers, no additional commentary. Each line should be a complete sentence or thought that flows naturally into the next. Write in a way that's perfect for voice-over and visual storytelling.`;

    return `${baseSystemPrompt}

${durationGuidance}

${outputConstraints}`;
  }

  private static buildUserPrompt(
    userPrompt: string,
    styleName: string,
    duration: number,
  ): string {
    return `Create a ${duration}-second ${styleName} video script based on this idea: "${userPrompt}"

Make it viral-worthy, engaging, and perfectly timed for the specified duration. Focus on creating content that will captivate viewers and encourage shares.`;
  }

  static async generateImage({
    prompt,
    style,
    imageSize = "1024x1792", // Default to vertical 9:16 ratio
    aspectRatio = "portrait", // Default to portrait for short videos
    storeInR2 = true,
    userId,
    projectId,
    segmentId,
  }: GenerateImageParams): Promise<{
    success: boolean;
    imageUrl?: string;
    r2Key?: string;
    r2Url?: string;
    tempUrl?: string;
    fileRecord?: any;
    error?: string;
  }> {
    try {
      const client = this.getClient();

      // Build the enhanced prompt with style if provided
      const enhancedPrompt = style
        ? `${prompt}, ${style}`
        : `${prompt}, high quality, detailed, professional`;

      // Determine size based on aspectRatio parameter or imageSize fallback
      let size: "1024x1024" | "1024x1792" | "1792x1024";

      // Prioritize aspectRatio parameter over imageSize for GPT-Image-1
      if (aspectRatio) {
        switch (aspectRatio) {
          case "square":
            size = "1024x1024";
            break;
          case "portrait":
            size = "1024x1792";
            break;
          case "landscape":
            size = "1792x1024";
            break;
          default:
            size = "1024x1792"; // Default to portrait
        }
      } else {
        // Fallback to imageSize for backward compatibility
        switch (imageSize) {
          case "square_hd":
          case "1024x1024":
            size = "1024x1024";
            break;
          case "portrait_16_9":
          case "1024x1792":
            size = "1024x1792";
            break;
          case "landscape_16_9":
          case "1792x1024":
            size = "1792x1024";
            break;
          default:
            size = "1024x1792"; // Default to portrait
        }
      }

      const response = await client.images.generate({
        model: "gpt-image-1",
        prompt: enhancedPrompt,
        size: "1024x1024", // Use the calculated size variable
        quality: "low",
      });

      const imageData = response.data?.[0];

      if (!imageData) {
        return {
          success: false,
          error: "No image generated from OpenAI",
        };
      }

      // Handle both URL and base64 response formats
      let imageUrl: string;
      if (imageData.url) {
        imageUrl = imageData.url;
      } else if (imageData.b64_json) {
        // Convert base64 to data URL
        imageUrl = `data:image/png;base64,${imageData.b64_json}`;
      } else {
        return {
          success: false,
          error: "No image URL or base64 data received from OpenAI",
        };
      }

      // Store in R2 if requested
      if (storeInR2 && userId && projectId) {
        try {
          let r2Key: string;
          let r2Url: string;
          let fileRecord: any;

          // Handle base64 data
          if (imageData.b64_json) {
            const uploadResult = await R2Storage.uploadImageFromBase64(
              `data:image/png;base64,${imageData.b64_json}`,
              userId,
              projectId,
              segmentId,
            );
            r2Key = uploadResult.key;
            r2Url = uploadResult.url;
          } else if (imageData.url) {
            // Handle URL - fetch and upload
            const uploadResult = await R2Storage.uploadFromUrl(
              imageData.url,
              userId,
              projectId,
              "image",
              segmentId,
            );
            r2Key = uploadResult.key;
            r2Url = uploadResult.url;
          } else {
            return {
              success: false,
              error: "No image data available for R2 storage",
            };
          }

          // Create file record in database
          const fileName = `generated-image-${Date.now()}.png`;
          const mimeType = "image/png";

          // Estimate file size (rough approximation for PNG)
          const estimatedSize = 1024 * 1024; // 1MB default

          fileRecord = await ProjectService.createFile({
            projectId,
            segmentId: segmentId || null,
            fileType: "image",
            fileName: FileUtils.sanitizeFilename(fileName),
            originalName: fileName,
            mimeType,
            fileSize: estimatedSize,
            r2Key,
            r2Url,
            tempUrl: imageUrl, // Keep original URL as temp
            uploadStatus: "completed",
            metadata: {
              prompt: prompt,
              style: style,
              generatedAt: new Date().toISOString(),
              model: "gpt-image-1",
              size: size,
            },
          });

          return {
            success: true,
            imageUrl: r2Url, // Return R2 URL
            r2Key,
            r2Url,
            tempUrl: imageUrl, // Original temp URL
            fileRecord,
          };
        } catch (r2Error) {
          console.error("Error storing image in R2:", r2Error);
          // Return original image URL if R2 storage fails
          return {
            success: true,
            imageUrl,
            error: "Image generated but R2 storage failed",
          };
        }
      }

      return {
        success: true,
        imageUrl,
      };
    } catch (error) {
      console.error("Error generating image with OpenAI:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      };
    }
  }

  static async editImage({
    imageUrl,
    prompt,
    maskUrl,
  }: {
    imageUrl: string;
    prompt: string;
    maskUrl?: string;
  }): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      const client = this.getClient();

      // Note: This is a placeholder for future image editing functionality
      // OpenAI's image editing requires uploading files, which is more complex
      // For now, we'll return an error indicating this feature is not yet implemented
      return {
        success: false,
        error:
          "Image editing feature is not yet implemented. Use generateImage instead.",
      };
    } catch (error) {
      console.error("Error editing image with OpenAI:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to edit image",
      };
    }
  }
}
