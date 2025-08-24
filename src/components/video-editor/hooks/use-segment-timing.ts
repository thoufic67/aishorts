import { useCurrentFrame, useVideoConfig } from "remotion";
import type { Video } from "@/types/video";

export const useSegmentTiming = (video: Video) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

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

  return {
    frame,
    fps,
    getCurrentSegmentAndTime,
    getSegmentsToRender,
  };
};