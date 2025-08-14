import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import OpenAI from "openai";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

    const { text, voice = "echo", index } = await request.json();

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

    // Create temp directory if it doesn't exist
    const tempDir = join(process.cwd(), "public", "temp");
    await mkdir(tempDir, { recursive: true });

    // Generate unique filename
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `audio_${index}_${Date.now()}.mp3`;
    const filepath = join(tempDir, filename);

    // Convert response to buffer and save
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await writeFile(filepath, buffer);

    // Return the public URL
    const audioUrl = `/temp/${filename}`;

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
