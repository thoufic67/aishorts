import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";
import { parseStructuredOutput, API_SCHEMAS } from "@/lib/api-utils";

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

    const { script } = await request.json();

    if (!script || typeof script !== "string") {
      return NextResponse.json(
        { error: "Script is required and must be a string" },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a video script segmenter. Break down the provided script into meaningful chunks WITHOUT modifying the original text. Each chunk should:
1. Be 3-5 seconds of speaking time (roughly 8-15 words)
2. Form a complete thought or sentence fragment that makes sense
3. Be suitable for generating a single image that represents the content
4. Flow naturally from one chunk to the next
5. There can be a maximum of only 10 chunks
6. IMPORTANT: Use the EXACT original text without any modifications, corrections, or improvements

The response will be structured as a JSON object with a "chunks" array containing the original script segments.`,
        },
        {
          role: "user",
          content: script,
        },
      ],
      temperature: 1,
      response_format: {
        type: "json_schema",
        json_schema: API_SCHEMAS.scriptChunks,
      },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate script chunks" },
        { status: 500 },
      );
    }

    const parseResult = parseStructuredOutput<{ chunks: string[] }>(content);

    if (!parseResult.success) {
      console.error("Failed to parse structured output:", parseResult.error);
      console.error("Raw content:", content);

      return NextResponse.json(
        {
          error: "Failed to parse script chunks",
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

    return NextResponse.json({ chunks: parseResult.data!.chunks });
  } catch (error) {
    console.error("Error breaking script:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
