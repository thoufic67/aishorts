"use client";

import React from "react";
import {
  Composition,
  AbsoluteFill,
} from "remotion";
import type {
  Video as VideoType,
} from "@/types/video";
import { useSegmentTiming } from "./hooks/use-segment-timing";
import { useCaptionData } from "./hooks/use-caption-data";
import { VideoSegmentRenderer } from "./video-segment-renderer";
import { DynamicCaptions } from "./dynamic-captions";
import { VideoWatermark } from "./video-watermark";

interface VideoCompositionProps {
  video: VideoType;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  video,
}) => {
  const { getCurrentSegmentAndTime, getSegmentsToRender, fps } = useSegmentTiming(video);
  const { getCaptionStyle, getCurrentWordsData } = useCaptionData(video, getCurrentSegmentAndTime().segment, getCurrentSegmentAndTime().relativeTime);

  const { segment: activeSegment, relativeTime } = getCurrentSegmentAndTime();
  const segmentsToRender = getSegmentsToRender();
  const captionStyle = getCaptionStyle();
  const { displayText, words } = getCurrentWordsData(captionStyle);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a" }}>
      {/* Sequential Video/Media Segments - Optimized rendering */}
      <VideoSegmentRenderer
        segmentsToRender={segmentsToRender}
        fps={fps}
        segments={video.segments}
      />

      {/* Dynamic Captions with Word-by-Word Timing */}
      <DynamicCaptions
        words={words}
        displayText={displayText}
        captionStyle={captionStyle}
      />

      {/* Watermark */}
      <VideoWatermark show={!!video.watermark} />
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
