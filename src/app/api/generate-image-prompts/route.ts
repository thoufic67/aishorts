import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";
import { parseStructuredOutput, API_SCHEMAS } from "@/lib/api-utils";
import { getDefaultImageStyle, getImageStyle } from "@/lib/image-config";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { chunks, styleId, style = "dark and eerie" } = await request.json();

    // Get the image style configuration from id or fallback
    const imageStyle =
      (styleId && getImageStyle(styleId)) || getDefaultImageStyle();

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json(
        { error: "Chunks array is required" },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating detailed image prompts for AI image generation. For each script chunk provided, create a compelling visual prompt that:

1. Captures the essence and mood of the text
2. Is optimized for the ${style} visual style
3. Includes cinematic composition details
4. Specifies lighting, atmosphere, and visual effects
5. Is detailed enough to generate high-quality, engaging images

Base image style: ${imageStyle.systemPrompt}

Style guidelines for "${style}":
- Dark, moody atmosphere with dramatic lighting
- Eerie and mysterious elements
- Deep shadows and contrast
- Cinematic wide shots
- Epic composition
- Professional photography quality

IMPORTANT: Each prompt should start with or incorporate the base style: "${imageStyle.systemPrompt}" and then add specific details relevant to the script content.

The response will be structured as a JSON object with a "prompts" array containing the image generation prompts in the same order as the script chunks.`,
        },
        {
          role: "user",
          content: `Generate image prompts for these script chunks:\n${chunks.map((chunk, i) => `${i + 1}. ${chunk}`).join("\n")}`,
        },
      ],
      temperature: 0.7,
      response_format: {
        type: "json_schema",
        json_schema: API_SCHEMAS.imagePrompts,
      },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate image prompts" },
        { status: 500 },
      );
    }

    const parseResult = parseStructuredOutput<{ prompts: string[] }>(content);

    if (!parseResult.success) {
      console.error("Failed to parse structured output:", parseResult.error);
      console.error("Raw content:", content);

      return NextResponse.json(
        {
          error: "Failed to parse image prompts",
          details:
            process.env.NODE_ENV === "development"
              ? {
                  parseError: parseResult.error,
                  rawContent: parseResult.rawContent,
                }
              : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ prompts: parseResult.data!.prompts });
  } catch (error) {
    console.error("Error generating image prompts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
