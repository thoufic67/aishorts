import { Composition } from "remotion";
import { VideoComposition } from "./components/video-editor/video-composition";
import { VIDEO_DATA } from "./lib/video-mock-data";
import type { Video } from "./types/video";

// Create a wrapper component that matches Remotion's expected signature
const VideoCompositionWrapper: React.FC<{ video: Video }> = (props) => {
  return <VideoComposition {...props} />;
};

export const RemotionRoot: React.FC = () => {
  // Calculate total duration in frames from all segments
  const totalDurationInSeconds = VIDEO_DATA.video.segments.reduce(
    (acc, segment) => acc + segment.duration,
    0,
  );
  const totalFrames = Math.round(totalDurationInSeconds * 30); // 30 fps

  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoCompositionWrapper}
        durationInFrames={totalFrames}
        fps={30}
        width={VIDEO_DATA.video.format.width}
        height={VIDEO_DATA.video.format.height}
        defaultProps={{
          video: VIDEO_DATA.video,
        }}
      />
    </>
  );
};
