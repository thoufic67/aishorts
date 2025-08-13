interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenRouterService {
  private static API_KEY_STORAGE_KEY = "openrouter_api_key";
  private static BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async generateScript(
    idea: string,
    inspirationUrls?: string,
    transcripts?: string[],
  ): Promise<{ success: boolean; script?: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: "OpenRouter API key not found" };
    }

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: "system",
          content: `You are an expert viral video script writer. Create engaging, high-conversion short-form video scripts (60 seconds max) that follow proven viral patterns. Return ONLY the script text with no explanations, no section headers, no additional commentary. Each line should be a complete sentence or thought that flows naturally into the next.`,
        },
      ];

      let userPrompt = `Create a viral video script based on this idea: "${idea}"`;

      if (inspirationUrls) {
        userPrompt += `\n\nInspiration URLs: ${inspirationUrls}`;
      }

      if (transcripts && transcripts.length > 0) {
        userPrompt += `\n\nTranscripts from inspiration videos:\n${transcripts.join("\n\n---\n\n")}`;
        userPrompt += `\n\nAnalyze these transcripts for style, tone, and structure patterns to create a similar but original script.`;
      }

      messages.push({ role: "user", content: userPrompt });

      const response = await fetch(this.BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "VideoAI Script Generator",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages,
          temperature: 0.8,
          max_tokens: 1000,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      const script = data.choices[0]?.message?.content;

      if (!script) {
        throw new Error("No script generated");
      }

      return { success: true, script };
    } catch (error) {
      console.error("Error generating script:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate script",
      };
    }
  }

  static async regenerateSection(
    originalScript: string,
    selectedText: string,
    instruction?: string,
  ): Promise<{ success: boolean; newText?: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: "OpenRouter API key not found" };
    }

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: "system",
          content:
            "You are an expert video script editor. Rewrite the selected section to be more engaging while maintaining the overall script flow and style.",
        },
        {
          role: "user",
          content: `Original script: "${originalScript}"
  
  Selected section to rewrite: "${selectedText}"
  
  ${instruction ? `Additional instruction: ${instruction}` : ""}
  
  Please rewrite just the selected section to be more engaging, viral, and compelling while maintaining the same meaning and flow.`,
        },
      ];

      const response = await fetch(this.BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "VideoAI Script Editor",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages,
          temperature: 0.7,
          max_tokens: 300,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      const newText = data.choices[0]?.message?.content;

      if (!newText) {
        throw new Error("No rewritten text generated");
      }

      return { success: true, newText };
    } catch (error) {
      console.error("Error regenerating section:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to regenerate section",
      };
    }
  }
}
