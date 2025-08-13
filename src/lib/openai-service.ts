import OpenAI from "openai";
import { getScriptStyle } from "@/lib/script-config";

interface OpenAIScriptResponse {
  script: string;
}

export interface GenerateScriptParams {
  userPrompt: string;
  scriptStyleId: string;
  duration: number; // in seconds
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
}
