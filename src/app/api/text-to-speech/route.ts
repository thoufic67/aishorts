import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";
import { R2Storage } from "@/lib/r2-storage";

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

    const { text, voice = "echo", index, projectId, segmentId } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 },
      );
    }

    if (typeof index !== "number") {
      return NextResponse.json(
        { error: "Index is required and must be a number" },
        { status: 400 },
      );
    }

    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    // Generate project ID if not provided
    const finalProjectId = projectId || `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Upload to R2 storage
    const { key, url } = await R2Storage.uploadAudio(
      buffer,
      session.user.id!,
      finalProjectId,
      index,
      segmentId
    );

    return NextResponse.json({ 
      audioUrl: url,
      key,
      projectId: finalProjectId
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
