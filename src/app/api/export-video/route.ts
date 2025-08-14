import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

export async function POST(req: NextRequest) {
  try {
    const { videoData, quality = "medium" } = await req.json();

    console.log("Starting video export process...");

    // Try to dynamically import Remotion modules
    let bundle: any, renderMedia: any, selectComposition: any;
    
    try {
      // Use require to handle pnpm module resolution
      const bundlerPath = require.resolve("@remotion/bundler");
      const rendererPath = require.resolve("@remotion/renderer");
      
      const bundlerModule = require(bundlerPath);
      const rendererModule = require(rendererPath);
      
      bundle = bundlerModule.bundle;
      renderMedia = rendererModule.renderMedia;
      selectComposition = rendererModule.selectComposition;
      
      console.log("Successfully loaded Remotion modules");
    } catch (moduleError) {
      console.error("Failed to load Remotion modules:", moduleError);
      return NextResponse.json(
        {
          success: false,
          error: "Video export functionality requires additional dependencies.",
          details: `Module resolution failed: ${moduleError instanceof Error ? moduleError.message : 'Unknown error'}`,
        },
        { status: 503 }
      );
    }

    // Create temp directory for output if it doesn't exist
    const outputDir = path.join(process.cwd(), "public", "exports");
    if (!fs.existsSync(outputDir)) {
      await fsPromises.mkdir(outputDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `video_${videoData._id}_${timestamp}.mp4`;
    const fullOutputPath = path.join(outputDir, filename);

    // Bundle the Remotion video
    console.log("Bundling Remotion composition...");
    const bundleLocation = await bundle({
      entryPoint: path.resolve("src/Root.tsx"),
      webpackOverride: (config: any) => {
        // Ensure proper handling of Next.js and Remotion
        return {
          ...config,
          resolve: {
            ...config.resolve,
            alias: {
              ...config.resolve?.alias,
              "@": path.resolve(process.cwd(), "src"),
            },
          },
        };
      },
    });

    console.log("Bundle created at:", bundleLocation);

    // Get composition details
    const compositions = await selectComposition({
      serveUrl: bundleLocation,
      id: "VideoComposition",
      inputProps: {
        video: videoData,
      },
    });

    console.log("Composition selected:", compositions);

    // Set quality parameters
    const qualitySettings = {
      low: { crf: 28, scale: 0.5 },
      medium: { crf: 23, scale: 0.75 },
      high: { crf: 18, scale: 1 },
    };

    const settings =
      qualitySettings[quality as keyof typeof qualitySettings] ||
      qualitySettings.medium;

    // Render the video
    console.log("Starting video render...");
    await renderMedia({
      composition: compositions,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: fullOutputPath,
      inputProps: {
        video: videoData,
      },
      // Quality settings
      crf: settings.crf,
      pixelFormat: "yuv420p",
      // Scale if needed for performance
      scale: settings.scale,
      // Audio settings
      enforceAudioTrack: false, // We handle audio externally
      muted: true, // Mute Remotion audio since we use external audio
      // Performance settings
      concurrency: 1, // Conservative for server rendering
      // Timeout
      timeoutInMilliseconds: 300000, // 5 minutes timeout
    });

    console.log("Video rendered successfully:", fullOutputPath);

    // Return the URL to download the video
    const downloadUrl = `/exports/${filename}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
      message: "Video exported successfully",
    });
  } catch (error) {
    console.error("Video export error:", error);

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

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "video-export",
  });
}
