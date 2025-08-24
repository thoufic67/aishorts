import React from "react";
import { AbsoluteFill } from "remotion";

interface VideoWatermarkProps {
  show: boolean;
}

export const VideoWatermark: React.FC<VideoWatermarkProps> = ({ show }) => {
  if (!show) return null;

  return (
    <AbsoluteFill className="flex w-full items-start justify-end p-8">
      <div className="align-center flex gap-4 rounded-lg p-2 text-4xl text-white backdrop-blur-sm">
        <span style={{ color: "#fbbf24" }}>⚡</span>
        <span>CursorShorts.com</span>
      </div>
    </AbsoluteFill>
  );
};
