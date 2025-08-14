"use client";

import React from "react";
import {
  Composition,
  AbsoluteFill,
  Video,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Sequence,
  Audio,
  staticFile,
} from "remotion";
import type {
  Video as VideoType,
  VideoSegment,
  WordTiming,
} from "@/types/video";
import { SingleAudioSequence } from "./audio-single-sequence";

interface VideoCompositionProps {
  video: VideoType;
  useSingleAudio?: boolean; // Option to use single audio approach for better performance
}

interface AudioSequencesProps {
  segments: VideoSegment[];
  fps: number;
}

// Audio compression function to prevent volume spikes and distortion
const compressVolume = (volume: number, threshold = 0.7, ratio = 3): number => {
  if (volume <= threshold) return volume;
  const excess = volume - threshold;
  return threshold + excess / ratio;
};

const AudioSequences: React.FC<AudioSequencesProps> = React.memo(
  ({ segments, fps }) => {
    const currentFrame = useCurrentFrame();

    // Get audio segments to render (windowed approach for performance)
    const getAudioSegmentsToRender = React.useMemo(() => {
      // Find current segment index based on frame position
      let cumulativeFrames = 0;
      let currentSegmentIndex = -1;

      for (let i = 0; i < segments.length; i++) {
        const segmentFrames = Math.round(segments[i].duration * fps);
        if (
          currentFrame >= cumulativeFrames &&
          currentFrame < cumulativeFrames + segmentFrames
        ) {
          currentSegmentIndex = i;
          break;
        }
        cumulativeFrames += segmentFrames;
      }

      // If frame is past all segments, use last segment
      if (currentSegmentIndex === -1) {
        currentSegmentIndex = segments.length - 1;
      }

      // Render current segment ± 1 adjacent (windowed approach)
      const windowSize = 1;
      const startIndex = Math.max(0, currentSegmentIndex - windowSize);
      const endIndex = Math.min(
        segments.length - 1,
        currentSegmentIndex + windowSize,
      );

      return segments
        .slice(startIndex, endIndex + 1)
        .map((segment, relativeIndex) => ({
          segment,
          originalIndex: startIndex + relativeIndex,
        }));
    }, [segments, fps, currentFrame]);

    // Memoize frame calculations for windowed segments
    const segmentFrameData = React.useMemo(() => {
      return getAudioSegmentsToRender.map(({ segment, originalIndex }) => {
        const segmentFrames = Math.round(segment.duration * fps);
        const startFrame = segments
          .slice(0, originalIndex)
          .reduce((acc, seg) => acc + Math.round(seg.duration * fps), 0);
        return { segment, segmentFrames, startFrame, index: originalIndex };
      });
    }, [getAudioSegmentsToRender, segments, fps]);

    return (
      <>
        {segmentFrameData.map(
          ({ segment, segmentFrames, startFrame, index }) => {
            return segment.audioUrl ? (
              <Sequence
                key={`audio-${segment._id}`}
                from={startFrame}
                durationInFrames={segmentFrames}
                name={`Voice Segment ${index + 1}`}
              >
                <Audio
                  src={segment.audioUrl}
                  volume={(frame) => {
                    // Significantly reduced voice volume to prevent distortion
                    const maxVoiceVolume = 0.65; // Reduced from 0.85
                    const baseVolume = Math.min(
                      segment.audioVolume || 0.75, // Reduced from 0.9
                      maxVoiceVolume,
                    );

                    // Apply compression to prevent volume spikes
                    const targetVolume = compressVolume(baseVolume);

                    // Extended fade in for smoother transitions
                    const fadeInFrames = 9; // Increased from 6
                    if (frame < fadeInFrames) {
                      const fadeVolume = interpolate(
                        frame,
                        [0, fadeInFrames],
                        [0, targetVolume],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        },
                      );
                      return compressVolume(fadeVolume);
                    }

                    // Extended fade out for smoother transitions
                    const fadeOutFrames = 9; // Increased from 6
                    const fadeOutStart = segmentFrames - fadeOutFrames;
                    if (frame > fadeOutStart) {
                      const fadeVolume = interpolate(
                        frame,
                        [fadeOutStart, segmentFrames],
                        [targetVolume, 0],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        },
                      );
                      return compressVolume(fadeVolume);
                    }

                    return targetVolume;
                  }}
                  name={`Voice: "${segment.text.substring(0, 30)}..."`}
                  acceptableTimeShiftInSeconds={0.05}
                />
              </Sequence>
            ) : null;
          },
        )}
      </>
    );
  },
);

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  video,
  useSingleAudio = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  // Get current words and their states for rendering
  const getCurrentWordsData = () => {
    if (!activeSegment.wordTimings.length) {
      return {
        displayText: activeSegment.text,
        words: [
          { text: activeSegment.text, isActive: true, isCompleted: false },
        ],
      };
    }

    const wordsData: Array<{
      text: string;
      isActive: boolean;
      isCompleted: boolean;
    }> = [];
    let allWords: Array<{ text: string; start: number; end: number }> = [];

    // Flatten all words from word timings to get proper sequence
    for (const timing of activeSegment.wordTimings) {
      for (const word of timing.words) {
        allWords.push({
          text: word.text,
          start: word.start,
          end: word.end,
        });
      }
    }

    // Sort words by start time to ensure proper order
    allWords.sort((a, b) => a.start - b.start);

    // Process words to determine states
    for (const word of allWords) {
      const wordActive = relativeTime >= word.start && relativeTime <= word.end;
      const wordCompleted = relativeTime > word.end;

      wordsData.push({
        text: word.text,
        isActive: wordActive,
        isCompleted: wordCompleted,
      });
    }

    // Build display text based on wordsPerBatch setting
    const wordsPerBatch = captionStyle.wordsPerBatch || 3;
    const activeWordIndex = wordsData.findIndex((w) => w.isActive);
    const completedWords = wordsData.filter((w) => w.isCompleted);

    let displayWords: typeof wordsData = [];

    if (activeWordIndex >= 0) {
      // Show words around the currently active word
      const startIndex = Math.max(
        0,
        activeWordIndex - Math.floor(wordsPerBatch / 2),
      );
      const endIndex = Math.min(wordsData.length, startIndex + wordsPerBatch);
      displayWords = wordsData.slice(startIndex, endIndex);
    } else if (completedWords.length > 0) {
      // Show the last few completed words
      const startIndex = Math.max(0, completedWords.length - wordsPerBatch);
      displayWords = completedWords.slice(startIndex);
    } else {
      // Show first few words as preview
      displayWords = wordsData.slice(0, wordsPerBatch);
    }

    const displayText = displayWords.map((w) => w.text).join(" ");

    return { displayText, words: displayWords };
  };

  const { displayText, words } = getCurrentWordsData();

  // Create a subtle animation effect
  const scaleEffect = interpolate(frame % 60, [0, 30, 60], [1, 1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Get segments to render (only current and adjacent segments)
  const getSegmentsToRender = () => {
    const currentSegmentIndex = (() => {
      let cumulativeFrames = 0;
      for (let i = 0; i < video.segments.length; i++) {
        const segmentFrames = Math.round(video.segments[i].duration * fps);
        const segmentEndFrame = cumulativeFrames + segmentFrames;
        if (frame >= cumulativeFrames && frame < segmentEndFrame) {
          return i;
        }
        cumulativeFrames = segmentEndFrame;
      }
      return video.segments.length - 1;
    })();

    // Render current segment and ±1 adjacent segments
    const windowSize = 1;
    const startIndex = Math.max(0, currentSegmentIndex - windowSize);
    const endIndex = Math.min(
      video.segments.length - 1,
      currentSegmentIndex + windowSize,
    );

    return video.segments
      .slice(startIndex, endIndex + 1)
      .map((segment, relativeIndex) => ({
        segment,
        originalIndex: startIndex + relativeIndex,
      }));
  };

  const segmentsToRender = getSegmentsToRender();

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* Sequential Video/Media Segments - Optimized rendering */}
      {segmentsToRender.map(({ segment, originalIndex }) => {
        const segmentFrames = Math.round(segment.duration * fps);
        const startFrame = video.segments
          .slice(0, originalIndex)
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
                <>
                  {/* Check if it's a video or image based on file extension */}
                  {segment.imageUrl.endsWith(".mp4") ||
                  segment.imageUrl.endsWith(".webm") ? (
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
                  ) : (
                    <Img
                      src={segment.imageUrl}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `scale(${scaleEffect})`,
                      }}
                    />
                  )}
                </>
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

      {/* Background Music - Loops for entire video duration */}
      <Audio
        src={staticFile("demo/temporex.mp3")}
        volume={(frame) => {
          // Check if any voice audio is currently playing for ducking
          const getCurrentSegment = () => {
            let cumulativeFrames = 0;
            for (const segment of video.segments) {
              const segmentFrames = Math.round(segment.duration * fps);
              const segmentEndFrame = cumulativeFrames + segmentFrames;
              if (frame >= cumulativeFrames && frame < segmentEndFrame) {
                return segment;
              }
              cumulativeFrames = segmentEndFrame;
            }
            return null;
          };

          const currentSegment = getCurrentSegment();
          const baseVolume = currentSegment?.audioUrl ? 0.03 : 0.08; // Reduced duck volume to prevent conflicts

          // Smooth fade in at the beginning
          const fadeInFrames = 30; // 1 second at 30fps
          if (frame < fadeInFrames) {
            return interpolate(frame, [0, fadeInFrames], [0, baseVolume], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          }

          // Calculate total duration in frames
          const totalDurationInSeconds = video.segments.reduce(
            (acc, segment) => acc + (segment.duration || 5),
            0,
          );
          const totalFrames = Math.round(totalDurationInSeconds * fps);

          // Smooth fade out at the end
          const fadeOutStart = totalFrames - 30; // Last 1 second
          if (frame > fadeOutStart) {
            return interpolate(
              frame,
              [fadeOutStart, totalFrames],
              [baseVolume, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
          }

          return baseVolume;
        }}
        loop
        name="Background Music"
        acceptableTimeShiftInSeconds={0.1}
      />

      {/* Voice Audio Sequences - Choose between windowed or single audio approach */}
      {useSingleAudio ? (
        <SingleAudioSequence segments={video.segments} fps={fps} />
      ) : (
        <AudioSequences segments={video.segments} fps={fps} />
      )}

      {/* Dynamic Captions with Word-by-Word Timing */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
          paddingBottom: `${captionStyle.fromBottom}%`,
        }}
      >
        <div
          style={{
            fontSize: captionStyle.fontSize,
            fontWeight: captionStyle.fontWeight,
            fontFamily: captionStyle.fontFamily,
            textAlign: "center",
            textShadow: captionStyle.textShadow,
            textTransform: captionStyle.textTransform as any,
            backgroundColor: captionStyle.backgroundColor,
            lineHeight: 1.3,
            maxWidth: "90%",
            padding:
              captionStyle.backgroundColor !== "transparent"
                ? "16px 32px"
                : "0",
            borderRadius:
              captionStyle.backgroundColor !== "transparent" ? "12px" : "0",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.3em",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {words.length > 0 ? (
            words.map((word, index) => {
              return (
                <span
                  key={index}
                  style={{
                    color: word.isActive
                      ? captionStyle.activeWordColor
                      : word.isCompleted
                        ? captionStyle.activeWordColor
                        : captionStyle.inactiveWordColor,
                    opacity: word.isCompleted ? 0.85 : word.isActive ? 1 : 0.6,
                    // transform: `scale(${word.isActive ? pulse : 1})`,
                    display: "inline-block",
                    textShadow: word.isActive
                      ? `${captionStyle.textShadow}, 0 0 25px ${captionStyle.activeWordColor}60, 0 0 40px ${captionStyle.activeWordColor}30`
                      : captionStyle.textShadow,
                    filter: word.isActive ? "brightness(1.2)" : "brightness(1)",
                    fontWeight: word.isActive ? "900" : captionStyle.fontWeight,
                  }}
                >
                  {word.text}
                </span>
              );
            })
          ) : (
            <span
              style={{
                color: captionStyle.activeWordColor,
              }}
            >
              {displayText}
            </span>
          )}
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
  // Calculate total duration in frames from all segments (ensuring voice is not cut)
  const totalDurationInSeconds = video.segments.reduce(
    (acc, segment) => acc + (segment.duration || 5), // Use actual duration or fallback to 5 seconds
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
