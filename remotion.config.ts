// Remotion configuration
// Note: This file is used by Remotion CLI but may not be needed for the @remotion/player usage

const config = {
  videoImageFormat: "jpeg" as const,
  overwriteOutput: true,
  pixelFormat: "yuv420p" as const,
  codec: "h264" as const,
  crf: 18,
  imageSequence: false,
};

export default config;
