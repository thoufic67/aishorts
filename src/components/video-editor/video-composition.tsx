"use client";

import {
  Composition,
  AbsoluteFill,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
} from "remotion";
import type {
  Video as VideoType,
  VideoSegment,
  WordTiming,
} from "@/types/video";

interface VideoCompositionProps {
  video: VideoType;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  video,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeInSeconds = frame / fps;

  // Calculate which segment should be showing based on current time
  const getCurrentSegmentAndTime = () => {
    let cumulativeFrames = 0;

    for (const segment of video.segments) {
      const segmentFrames = Math.round(segment.duration * fps);
      const segmentEndFrame = cumulativeFrames + segmentFrames;

      if (frame >= cumulativeFrames && frame < segmentEndFrame) {
        const relativeFrame = frame - cumulativeFrames;
        const relativeTime = relativeFrame / fps;
        return { segment, relativeTime, cumulativeFrames, segmentFrames };
      }

      cumulativeFrames = segmentEndFrame;
    }

    // If frame is past all segments, return the last segment
    const lastSegment = video.segments[video.segments.length - 1];
    const lastSegmentFrames = Math.round(lastSegment.duration * fps);
    return {
      segment: lastSegment,
      relativeTime: lastSegment.duration,
      cumulativeFrames: cumulativeFrames - lastSegmentFrames,
      segmentFrames: lastSegmentFrames,
    };
  };

  const { segment: activeSegment, relativeTime } = getCurrentSegmentAndTime();

  // Get current words from word timings based on relative time within the segment
  const getCurrentWords = () => {
    if (!activeSegment.wordTimings.length) return activeSegment.text;

    // Find all words that should be highlighted at current time
    const activeWords: string[] = [];
    let lastActiveText = "";

    for (const timing of activeSegment.wordTimings) {
      if (relativeTime >= timing.start) {
        lastActiveText = timing.text;

        // Also check individual words within this timing
        for (const word of timing.words) {
          if (relativeTime >= word.start && relativeTime <= word.end) {
            activeWords.push(word.text);
          }
        }
      }
    }

    // Return the most recent phrase or active words
    return activeWords.length > 0 ? activeWords.join(" ") : lastActiveText;
  };

  // Get caption style from layers
  const getCaptionStyle = () => {
    const captionLayer = video.layers.find(
      (layer) => layer.type === "captions",
    );
    if (captionLayer) {
      return captionLayer.captionStyle;
    }

    // Default caption style
    return {
      fontSize: 75,
      fontFamily: "Inter",
      activeWordColor: "#FFFFFF",
      inactiveWordColor: "#CCCCCC",
      backgroundColor: "transparent",
      fontWeight: "700",
      textTransform: "none",
      textShadow:
        ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000",
      showEmojis: true,
      fromBottom: 49,
      wordsPerBatch: 3,
    };
  };

  const captionStyle = getCaptionStyle();

  // Create a subtle animation effect
  const scaleEffect = interpolate(frame % 60, [0, 30, 60], [1, 1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* Sequential Video/Media Segments */}
      {video.segments.map((segment, index) => {
        const segmentFrames = Math.round(segment.duration * fps);
        const startFrame = video.segments
          .slice(0, index)
          .reduce((acc, seg) => acc + Math.round(seg.duration * fps), 0);

        return (
          <Sequence
            key={segment._id}
            from={startFrame}
            durationInFrames={segmentFrames}
          >
            <AbsoluteFill>
              {/* Background Video/Image */}
              {segment.imageUrl && (
                <Video
                  src={segment.imageUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: `scale(${scaleEffect})`,
                  }}
                  muted
                />
              )}

              {/* Media from media array if no imageUrl */}
              {!segment.imageUrl &&
                segment.media &&
                segment.media.length > 0 && (
                  <Video
                    src={segment.media[0].url}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: `scale(${scaleEffect})`,
                    }}
                    muted
                  />
                )}

              {/* Overlay Video */}
              {segment.overlay && (
                <Video
                  src={segment.overlay.url}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.7,
                    mixBlendMode: "overlay",
                  }}
                  muted
                />
              )}

              {/* Fallback gradient background if no media */}
              {!segment.imageUrl &&
                (!segment.media || segment.media.length === 0) && (
                  <AbsoluteFill
                    style={{
                      background:
                        "linear-gradient(45deg, #8b4513 0%, #d4a574 30%, #654321 70%, #2c1810 100%)",
                      opacity: 0.8,
                    }}
                  />
                )}
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Audio is handled separately outside of Remotion for better optimization */}

      {/* Dynamic Captions with Word Timing */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "flex-center",
          justifyContent: "center",
          padding: 60,
          paddingBottom: `${captionStyle.fromBottom}%`,
        }}
      >
        <div
          style={{
            color: captionStyle.activeWordColor,
            fontSize: captionStyle.fontSize,
            fontWeight: captionStyle.fontWeight,
            fontFamily: captionStyle.fontFamily,
            textAlign: "center",
            textShadow: captionStyle.textShadow,
            textTransform: captionStyle.textTransform as any,
            backgroundColor: captionStyle.backgroundColor,
            lineHeight: 1.2,
            maxWidth: "90%",
            padding:
              captionStyle.backgroundColor !== "transparent"
                ? "12px 24px"
                : "0",
            borderRadius:
              captionStyle.backgroundColor !== "transparent" ? "8px" : "0",
          }}
        >
          {getCurrentWords()}
        </div>
      </AbsoluteFill>

      {/* Watermark */}
      {video.watermark && (
        <AbsoluteFill
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              padding: "6px 12px",
              borderRadius: 20,
              backdropFilter: "blur(4px)",
              fontSize: 12,
              color: "white",
              fontWeight: "500",
            }}
          >
            <span style={{ color: "#fbbf24" }}>⚡</span>
            <span>EasyShortsVideo.ai</span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// Wrapper component for Remotion with proper typing
const VideoCompositionWrapper: React.FC<any> = (props) => {
  return <VideoComposition {...props} />;
};

// Define the composition for Remotion with proper video data
export const RemotionVideo: React.FC<{ video: VideoType }> = ({ video }) => {
  // Calculate total duration in frames from all segments
  const totalDurationInSeconds = video.segments.reduce(
    (acc, segment) => acc + segment.duration,
    0,
  );
  const totalFrames = Math.round(totalDurationInSeconds * 30); // 30 fps

  return (
    <Composition
      id="VideoComposition"
      component={VideoCompositionWrapper}
      durationInFrames={totalFrames}
      fps={30}
      width={video.format.width}
      height={video.format.height}
      defaultProps={{
        video,
      }}
    />
  );
};
