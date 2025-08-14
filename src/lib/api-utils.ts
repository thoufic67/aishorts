/**
 * Utility functions for API routes
 */

export interface ParsedOpenAIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rawContent?: string;
}

/**
 * JSON Schema definitions for OpenAI structured outputs
 */
export const API_SCHEMAS = {
  scriptChunks: {
    name: "script_chunks_schema",
    strict: true,
    schema: {
      type: "object",
      properties: {
        chunks: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["chunks"],
      additionalProperties: false,
    },
  },
  imagePrompts: {
    name: "image_prompts_schema",
    strict: true,
    schema: {
      type: "object",
      properties: {
        prompts: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["prompts"],
      additionalProperties: false,
    },
  },
} as const;

/**
 * Parse OpenAI structured output response (guaranteed to be valid JSON)
 * @param content Raw content from OpenAI structured output response
 * @returns Parsed response with error handling
 */
export function parseStructuredOutput<T>(
  content: string,
): ParsedOpenAIResponse<T> {
  try {
    const parsed = JSON.parse(content) as T;
    return {
      success: true,
      data: parsed,
    };
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error
        ? parseError.message
        : "Unknown parsing error";

    return {
      success: false,
      error: `Structured output parsing failed: ${errorMessage}`,
      rawContent:
        content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    };
  }
}

/**
 * Safely parse OpenAI API response content that might include markdown formatting
 * @param content Raw content from OpenAI API response
 * @param validator Optional validator function to check the parsed data
 * @returns Parsed response with error handling
 * @deprecated Use structured outputs with parseStructuredOutput instead
 */
export function parseOpenAIResponse<T>(
  content: string,
  validator?: (data: any) => data is T,
): ParsedOpenAIResponse<T> {
  try {
    // Clean the content to handle markdown code blocks or other formatting
    let cleanedContent = content.trim();

    // Remove markdown code blocks if present
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    // Additional cleanup for common issues
    cleanedContent = cleanedContent.trim();

    const parsed = JSON.parse(cleanedContent);

    // Run validator if provided
    if (validator && !validator(parsed)) {
      return {
        success: false,
        error: "Parsed data failed validation",
        rawContent:
          content.substring(0, 200) + (content.length > 200 ? "..." : ""),
      };
    }

    return {
      success: true,
      data: parsed as T,
    };
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error
        ? parseError.message
        : "Unknown parsing error";

    return {
      success: false,
      error: `JSON parsing failed: ${errorMessage}`,
      rawContent:
        content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    };
  }
}

/**
 * Validator for string arrays
 */
export function isStringArray(data: any): data is string[] {
  return Array.isArray(data) && data.every((item) => typeof item === "string");
}

/**
 * Creates a standardized error response for API routes
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any,
) {
  const response: any = { error: message };

  // Only include details in development mode
  if (details && process.env.NODE_ENV === "development") {
    response.details = details;
  }

  return Response.json(response, { status });
}
