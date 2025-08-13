import { auth } from "@/auth";
import { OpenAIService, type GenerateScriptParams } from "@/lib/openai-service";
import { NextRequest, NextResponse } from "next/server";

// Define the request body interface
interface GenerateScriptRequestBody {
  userPrompt: string;
  scriptStyleId: string;
  duration: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate request body
    let body: GenerateScriptRequestBody;

    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    // Validate required fields
    const { userPrompt, scriptStyleId, duration } = body;

    if (
      !userPrompt ||
      typeof userPrompt !== "string" ||
      userPrompt.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "userPrompt is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    if (!scriptStyleId || typeof scriptStyleId !== "string") {
      return NextResponse.json(
        { error: "scriptStyleId is required" },
        { status: 400 },
      );
    }

    if (!duration || typeof duration !== "number" || duration <= 0) {
      return NextResponse.json(
        { error: "duration is required and must be a positive number" },
        { status: 400 },
      );
    }

    // Validate duration constraints (reasonable limits)
    if (duration < 10 || duration > 300) {
      return NextResponse.json(
        { error: "duration must be between 10 and 300 seconds" },
        { status: 400 },
      );
    }

    // Sanitize and prepare parameters
    const params: GenerateScriptParams = {
      userPrompt: userPrompt.trim(),
      scriptStyleId,
      duration,
    };

    // Generate the script using OpenAI service
    const result = await OpenAIService.generateScript(params);

    if (!result.success) {
      console.error("Script generation failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to generate script" },
        { status: 500 },
      );
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      script: result.script,
      metadata: {
        userPrompt: params.userPrompt,
        scriptStyleId: params.scriptStyleId,
        duration: params.duration,
        generatedAt: new Date().toISOString(),
        userId: session.user.id,
      },
    });
  } catch (error) {
    console.error("Unexpected error in generate-script API:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to generate scripts." },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to generate scripts." },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to generate scripts." },
    { status: 405 },
  );
}
