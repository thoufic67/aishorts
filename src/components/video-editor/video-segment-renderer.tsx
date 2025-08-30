import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  Audio,
} from "remotion";
import type { VideoSegment } from "@/types/video";

interface VideoSegmentRendererProps {
  segmentsToRender: Array<{
    segment: VideoSegment;
    originalIndex: number;
  }>;
  fps: number;
  segments: VideoSegment[];
}

export const VideoSegmentRenderer: React.FC<VideoSegmentRendererProps> = ({
  segmentsToRender,
  fps,
  segments,
}) => {
  return (
    <>
      {segmentsToRender.map(({ segment, originalIndex }) => (
        <SegmentComponent
          key={segment.id || segment._id}
          segment={segment}
          originalIndex={originalIndex}
          fps={fps}
          segments={segments}
        />
      ))}
    </>
  );
};

interface SegmentComponentProps {
  segment: VideoSegment;
  originalIndex: number;
  fps: number;
  segments: VideoSegment[];
}

const SegmentComponent: React.FC<SegmentComponentProps> = ({
  segment,
  originalIndex,
  fps,
  segments,
}) => {
  const frame = useCurrentFrame();

  // Calculate frames for this segment
  const segmentFrames = Math.round(segment.duration * fps);
  const startFrame = segments
    .slice(0, originalIndex)
    .reduce((acc, seg) => acc + Math.round(seg.duration * fps), 0);

  // Create a subtle animation effect
  const scaleEffect = interpolate(frame % 60, [0, 30, 60], [1, 1.02, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Sequence from={startFrame} durationInFrames={segmentFrames}>
      <AbsoluteFill>
        {/* Background Video/Image */}
        {segment.imageUrl && (
          <MediaElement src={segment.imageUrl} scaleEffect={scaleEffect} />
        )}
        <Audio src={segment.audioUrl} volume={segment.audioVolume} />

        {/* Media from files array if no imageUrl */}
        {!segment.imageUrl && segment.files && segment.files.length > 0 && (
          <MediaElement
            src={
              segment.files.find(
                (file) =>
                  file.fileType === "image" || file.fileType === "video",
              )?.r2Url || ""
            }
            scaleEffect={scaleEffect}
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
          (!segment.files ||
            segment.files.length === 0 ||
            !segment.files.find(
              (file) => file.fileType === "image" || file.fileType === "video",
            )) && <FallbackBackground />}
      </AbsoluteFill>
    </Sequence>
  );
};

interface MediaElementProps {
  src: string;
  scaleEffect: number;
}

const MediaElement: React.FC<MediaElementProps> = ({ src, scaleEffect }) => {
  const isBase64Image = src.startsWith("data:image/");
  const isVideo =
    !isBase64Image && (src.endsWith(".mp4") || src.endsWith(".webm"));

  const mediaStyle = {
    width: "100%",
    height: "100%",
    objectFit: "contain" as const,
    transform: `scale(${scaleEffect})`,
  };

  if (isVideo) {
    return <Video src={src} style={mediaStyle} muted />;
  }

  return <Img src={src} style={mediaStyle} />;
};

const FallbackBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(45deg, #8b4513 0%, #d4a574 30%, #654321 70%, #2c1810 100%)",
      opacity: 0.8,
    }}
  />
);
