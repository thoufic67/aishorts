import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

export async function POST(req: NextRequest) {
  try {
    const {
      videoData,
      audioTracks,
      backgroundMusicUrl,
      quality = "medium",
    } = await req.json();

    console.log("Starting video export with audio...");

    // First, export the video without audio using the existing endpoint
    const videoExportResponse = await fetch(
      `${req.nextUrl.origin}/api/export-video`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoData, quality }),
      },
    );

    if (!videoExportResponse.ok) {
      const errorResponse = await videoExportResponse.json();
      if (videoExportResponse.status === 503) {
        // Export-video endpoint is not configured
        return NextResponse.json(
          {
            success: false,
            error: "Video export functionality is not available. Missing required Remotion dependencies.",
            details: errorResponse.error || "The export-video endpoint is not properly configured.",
          },
          { status: 503 }
        );
      }
      throw new Error(`Failed to export video (${videoExportResponse.status}): ${errorResponse.error || 'Unknown error'}`);
    }

    const videoResult = await videoExportResponse.json();
    const videoPath = path.join(
      process.cwd(),
      "public",
      videoResult.downloadUrl,
    );

    // Create temp directory for audio processing
    const tempDir = path.join(process.cwd(), "public", "temp");
    if (!fs.existsSync(tempDir)) {
      await fsPromises.mkdir(tempDir, { recursive: true });
    }

    // Generate unique filename for final output
    const timestamp = Date.now();
    const finalFilename = `video_with_audio_${videoData._id}_${timestamp}.mp4`;
    const finalOutputPath = path.join(
      process.cwd(),
      "public",
      "exports",
      finalFilename,
    );

    // Prepare FFmpeg command to combine video with audio
    const ffmpegArgs = [
      "-i",
      videoPath, // Input video
    ];

    // Add background music if provided
    if (backgroundMusicUrl) {
      const bgMusicPath = path.join(
        process.cwd(),
        "public",
        backgroundMusicUrl.replace("/", ""),
      );
      if (fs.existsSync(bgMusicPath)) {
        ffmpegArgs.push("-i", bgMusicPath);
      }
    }

    // Add voice segments
    const voiceInputs = [];
    const filterComplexParts = [];
    let inputIndex = backgroundMusicUrl ? 2 : 1; // Start after video and optional background music

    // Process each voice segment
    for (let i = 0; i < videoData.segments.length; i++) {
      const segment = videoData.segments[i];
      if (segment.audioUrl) {
        // Create temporary audio file for this segment
        const tempAudioPath = path.join(tempDir, `segment_${i}.mp3`);

        try {
          // Download or copy the audio file
          if (segment.audioUrl.startsWith("http")) {
            // Download from URL
            const response = await fetch(segment.audioUrl);
            const buffer = await response.arrayBuffer();
            await fsPromises.writeFile(tempAudioPath, Buffer.from(buffer));
          } else {
            // Copy from local file
            const localPath = path.join(
              process.cwd(),
              "public",
              segment.audioUrl.replace("/", ""),
            );
            await fsPromises.copyFile(localPath, tempAudioPath);
          }

          ffmpegArgs.push("-i", tempAudioPath);
          voiceInputs.push({
            index: inputIndex,
            segment,
            tempPath: tempAudioPath,
          });
          inputIndex++;
        } catch (error) {
          console.warn(`Failed to process audio for segment ${i}:`, error);
        }
      }
    }

    // Build filter_complex for audio mixing
    let filterComplex = "";

    if (backgroundMusicUrl && voiceInputs.length > 0) {
      // Mix background music with voice segments
      // First, create a ducked background track
      filterComplex += `[1:a]aloop=loop=-1:size=2e+09[bg_loop];`;

      // Apply ducking when voice is present
      let currentTime = 0;
      const duckingFilters = [];

      for (let i = 0; i < videoData.segments.length; i++) {
        const segment = videoData.segments[i];
        const segmentDuration = segment.duration || 5;

        if (segment.audioUrl) {
          // Find the corresponding voice input
          const voiceInput = voiceInputs.find((v) => v.segment === segment);
          if (voiceInput) {
            // Create silence for positioning
            filterComplex += `[${voiceInput.index}:a]adelay=${currentTime * 1000}|${currentTime * 1000}[voice_${i}];`;
          }
        }

        currentTime += segmentDuration;
      }

      // Mix all audio tracks
      const voiceLabels = voiceInputs.map((_, i) => `[voice_${i}]`).join("");
      if (voiceLabels) {
        filterComplex += `[bg_loop]${voiceLabels}amix=inputs=${voiceInputs.length + 1}:duration=longest:dropout_transition=2,volume=0.8[final_audio]`;
      } else {
        filterComplex += `[bg_loop]volume=0.3[final_audio]`;
      }
    } else if (voiceInputs.length > 0) {
      // Only voice audio, no background music
      if (voiceInputs.length === 1) {
        filterComplex = `[1:a]copy[final_audio]`;
      } else {
        const voiceLabels = voiceInputs.map((_, i) => `[${i + 1}:a]`).join("");
        filterComplex = `${voiceLabels}amix=inputs=${voiceInputs.length}:duration=longest[final_audio]`;
      }
    } else if (backgroundMusicUrl) {
      // Only background music
      filterComplex = `[1:a]aloop=loop=-1:size=2e+09,volume=0.3[final_audio]`;
    }

    // Add filter_complex if we have audio
    if (filterComplex) {
      ffmpegArgs.push("-filter_complex", filterComplex);
      ffmpegArgs.push("-map", "0:v", "-map", "[final_audio]");
    } else {
      // No audio, just copy video
      ffmpegArgs.push("-c:v", "copy");
    }

    // Output settings
    ffmpegArgs.push(
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ar",
      "44100",
      "-y", // Overwrite output file
      finalOutputPath,
    );

    console.log("FFmpeg command:", "ffmpeg", ffmpegArgs.join(" "));

    // Execute FFmpeg
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stdout.on("data", (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });

      ffmpeg.stderr.on("data", (data) => {
        console.log(`FFmpeg stderr: ${data}`);
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log("FFmpeg completed successfully");
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on("error", (error) => {
        reject(error);
      });
    });

    // Cleanup temporary files
    try {
      for (const voiceInput of voiceInputs) {
        await fsPromises.unlink(voiceInput.tempPath);
      }
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp files:", cleanupError);
    }

    // Also cleanup the temporary video file
    try {
      await fsPromises.unlink(videoPath);
    } catch (cleanupError) {
      console.warn("Failed to cleanup temp video file:", cleanupError);
    }

    const downloadUrl = `/exports/${finalFilename}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename: finalFilename,
      message: "Video with audio exported successfully",
    });
  } catch (error) {
    console.error("Video export with audio error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
