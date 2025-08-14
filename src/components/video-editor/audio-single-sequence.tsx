import React from "react";
import { useCurrentFrame, interpolate, Audio } from "remotion";
import type { VideoSegment } from "@/types/video";

interface SingleAudioSequenceProps {
  segments: VideoSegment[];
  fps: number;
}

/**
 * Alternative audio implementation that renders only one audio segment at a time
 * This approach eliminates audio conflicts and reduces processing load
 * Use this if the windowed approach still causes distortion
 */
export const SingleAudioSequence: React.FC<SingleAudioSequenceProps> =
  React.memo(({ segments, fps }) => {
    const currentFrame = useCurrentFrame();

    // Find the currently active audio segment
    const getCurrentAudioData = React.useMemo(() => {
      let cumulativeFrames = 0;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentFrames = Math.round(segment.duration * fps);
        const segmentEndFrame = cumulativeFrames + segmentFrames;

        // Check if current frame is within this segment
        if (
          currentFrame >= cumulativeFrames &&
          currentFrame < segmentEndFrame &&
          segment.audioUrl
        ) {
          const relativeFrame = currentFrame - cumulativeFrames;

          return {
            segment,
            segmentFrames,
            startFrame: cumulativeFrames,
            relativeFrame,
            index: i,
          };
        }

        cumulativeFrames = segmentEndFrame;
      }

      return null;
    }, [segments, fps, currentFrame]);

    // Only render audio if there's an active segment with audio
    if (!getCurrentAudioData) {
      return null;
    }

    const { segment, segmentFrames, startFrame, relativeFrame } =
      getCurrentAudioData;

    return (
      <Audio
        key={`single-audio-${segment._id}-${startFrame}`} // Key includes startFrame for proper re-mounting
        src={segment.audioUrl}
        startFrom={relativeFrame} // Start from the correct position within the audio file
        volume={(frame) => {
          // Use the relative frame within the current segment
          const localFrame = frame;

          // Compressed volume to prevent distortion
          const maxVoiceVolume = 0.6; // Conservative volume
          const baseVolume = Math.min(
            segment.audioVolume || 0.7,
            maxVoiceVolume,
          );

          // Apply compression
          const compressVolume = (volume: number) => {
            const threshold = 0.65;
            const ratio = 3;
            if (volume <= threshold) return volume;
            const excess = volume - threshold;
            return threshold + excess / ratio;
          };

          const targetVolume = compressVolume(baseVolume);

          // Smooth fade in
          const fadeInFrames = 6;
          if (localFrame < fadeInFrames) {
            return interpolate(
              localFrame,
              [0, fadeInFrames],
              [0, targetVolume],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
          }

          // Smooth fade out
          const fadeOutFrames = 6;
          const fadeOutStart = segmentFrames - fadeOutFrames;
          if (localFrame > fadeOutStart) {
            return interpolate(
              localFrame,
              [fadeOutStart, segmentFrames],
              [targetVolume, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
          }

          return targetVolume;
        }}
        name={`Single Voice: "${segment.text.substring(0, 30)}..."`}
        acceptableTimeShiftInSeconds={0.02} // Tighter sync for single audio
      />
    );
  });

SingleAudioSequence.displayName = "SingleAudioSequence";
