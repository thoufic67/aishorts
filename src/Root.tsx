import { Composition } from "remotion";
import { VideoComposition } from "./components/video-editor/video-composition";
import { VIDEO_DATA } from "./lib/video-mock-data";

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
        component={VideoComposition}
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
