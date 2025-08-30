import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Video,
} from "remotion";
import React, { useEffect, useMemo } from "react";

// Use Inter font directly
const fontFamily = "Inter, sans-serif";

// Types based on the API response
interface WordTiming {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

interface MediaItem {
  effect: string;
  url: string;
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
  withBlur: boolean;
  volume?: number;
}

interface Segment {
  text: string;
  imagePrompt: string;
  imageUrl: string;
  audioUrl: string;
  duration: number;
  wordTimings: WordTiming[];
  order: number;
  media: MediaItem[];
  withBlur: boolean;
}

interface CaptionStyle {
  fontSize: number;
  fontFamily: string;
  activeWordColor: string;
  inactiveWordColor: string;
  backgroundColor: string;
  fontWeight: string;
  textTransform: string;
  textShadow: string;
  fromBottom: number;
  wordsPerBatch: number;
}

interface Layer {
  type: string;
  captionStyle: CaptionStyle;
  volume: number;
  url?: string;
  assetId?: {
    url: string;
  };
}

interface VideoData {
  segments: Segment[];
  layers: Layer[];
  format: {
    width: number;
    height: number;
  };
}

// Sample data from the API response
const videoData: VideoData = {
  segments: [
    {
      text: "Have you ever been made to feel guilty for having your own feelings in a relationship? Let me share a scenario.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a serene outdoor setting with a person looking contemplative, sitting on a bench, surrounded by nature, expressing deep thoughts.",
      imageUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_0.mp4",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_0.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 5.433438,
      withBlur: false,
      wordTimings: [
        {
          text: "Have you ever",
          start: 0,
          end: 0.6600000262260437,
          words: [
            {
              text: "Have",
              start: 0,
              end: 0.3199999928474426,
            },
            {
              text: "you",
              start: 0.3199999928474426,
              end: 0.47999998927116394,
            },
            {
              text: "ever",
              start: 0.47999998927116394,
              end: 0.6600000262260437,
            },
          ],
        },
        {
          text: "been made to",
          start: 0.6600000262260437,
          end: 1.1799999475479126,
          words: [
            {
              text: "been",
              start: 0.6600000262260437,
              end: 0.8199999928474426,
            },
            {
              text: "made",
              start: 0.8199999928474426,
              end: 0.9599999785423279,
            },
            {
              text: "to",
              start: 0.9599999785423279,
              end: 1.1799999475479126,
            },
          ],
        },
        {
          text: "feel guilty for",
          start: 1.1799999475479126,
          end: 1.8200000524520874,
          words: [
            {
              text: "feel",
              start: 1.1799999475479126,
              end: 1.3200000524520874,
            },
            {
              text: "guilty",
              start: 1.3200000524520874,
              end: 1.559999942779541,
            },
            {
              text: "for",
              start: 1.559999942779541,
              end: 1.8200000524520874,
            },
          ],
        },
        {
          text: "having your own",
          start: 1.8200000524520874,
          end: 2.5399999618530273,
          words: [
            {
              text: "having",
              start: 1.8200000524520874,
              end: 2.0399999618530273,
            },
            {
              text: "your",
              start: 2.0399999618530273,
              end: 2.200000047683716,
            },
            {
              text: "own",
              start: 2.200000047683716,
              end: 2.5399999618530273,
            },
          ],
        },
        {
          text: "feelings in a",
          start: 2.5399999618530273,
          end: 3.0399999618530273,
          words: [
            {
              text: "feelings",
              start: 2.5399999618530273,
              end: 2.759999990463257,
            },
            {
              text: "in",
              start: 2.759999990463257,
              end: 2.9200000762939453,
            },
            {
              text: "a",
              start: 2.9200000762939453,
              end: 3.0399999618530273,
            },
          ],
        },
        {
          text: "relationship Let me",
          start: 3.0399999618530273,
          end: 4.380000114440918,
          words: [
            {
              text: "relationship",
              start: 3.0399999618530273,
              end: 3.440000057220459,
            },
            {
              text: "Let",
              start: 4.179999828338623,
              end: 4.239999771118164,
            },
            {
              text: "me",
              start: 4.239999771118164,
              end: 4.380000114440918,
            },
          ],
        },
        {
          text: "share a scenario",
          start: 4.380000114440918,
          end: 5.039999961853027,
          words: [
            {
              text: "share",
              start: 4.380000114440918,
              end: 4.539999961853027,
            },
            {
              text: "a",
              start: 4.539999961853027,
              end: 4.820000171661377,
            },
            {
              text: "scenario",
              start: 4.820000171661377,
              end: 5.039999961853027,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 0,
      media: [
        {
          effect: "blur",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_0.mp4",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167063ffe",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167063ffd",
    },
    {
      text: "Whenever I try to talk about how I feel hurt, my partner says… 'You’re too sensitive, you always overreact.'",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a couple in a cozy living room, the female partner looking upset and vulnerable, while the male partner gestures dismissively, both dressed casually.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_1.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_1.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 7.183625,
      withBlur: false,
      wordTimings: [
        {
          text: "Whenever I try",
          start: 0,
          end: 0.8199999928474426,
          words: [
            {
              text: "Whenever",
              start: 0,
              end: 0.41999998688697815,
            },
            {
              text: "I",
              start: 0.41999998688697815,
              end: 0.6399999856948853,
            },
            {
              text: "try",
              start: 0.6399999856948853,
              end: 0.8199999928474426,
            },
          ],
        },
        {
          text: "to talk about",
          start: 0.8199999928474426,
          end: 1.399999976158142,
          words: [
            {
              text: "to",
              start: 0.8199999928474426,
              end: 1.1799999475479126,
            },
            {
              text: "talk",
              start: 1.1799999475479126,
              end: 1.1799999475479126,
            },
            {
              text: "about",
              start: 1.1799999475479126,
              end: 1.399999976158142,
            },
          ],
        },
        {
          text: "how I feel",
          start: 1.399999976158142,
          end: 1.8799999952316284,
          words: [
            {
              text: "how",
              start: 1.399999976158142,
              end: 1.5399999618530273,
            },
            {
              text: "I",
              start: 1.5399999618530273,
              end: 1.7200000286102295,
            },
            {
              text: "feel",
              start: 1.7200000286102295,
              end: 1.8799999952316284,
            },
          ],
        },
        {
          text: "hurt my partner",
          start: 1.8799999952316284,
          end: 2.880000114440918,
          words: [
            {
              text: "hurt",
              start: 1.8799999952316284,
              end: 2.180000066757202,
            },
            {
              text: "my",
              start: 2.559999942779541,
              end: 2.700000047683716,
            },
            {
              text: "partner",
              start: 2.700000047683716,
              end: 2.880000114440918,
            },
          ],
        },
        {
          text: "says You're too",
          start: 2.880000114440918,
          end: 4.539999961853027,
          words: [
            {
              text: "says",
              start: 2.880000114440918,
              end: 3.299999952316284,
            },
            {
              text: "You're",
              start: 4.21999979019165,
              end: 4.300000190734863,
            },
            {
              text: "too",
              start: 4.300000190734863,
              end: 4.539999961853027,
            },
          ],
        },
        {
          text: "sensitive You always",
          start: 4.539999961853027,
          end: 5.619999885559082,
          words: [
            {
              text: "sensitive",
              start: 4.539999961853027,
              end: 4.860000133514404,
            },
            {
              text: "You",
              start: 5.239999771118164,
              end: 5.320000171661377,
            },
            {
              text: "always",
              start: 5.320000171661377,
              end: 5.619999885559082,
            },
          ],
        },
        {
          text: "overreact",
          start: 5.619999885559082,
          end: 6.239999771118164,
          words: [
            {
              text: "overreact",
              start: 5.619999885559082,
              end: 6.239999771118164,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 1,
      media: [
        {
          effect: "panZoom",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_1.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167064000",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167063fff",
    },
    {
      text: "At first, I wonder if I’m truly overthinking.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of the female partner sitting alone at night, deep in thought, with a soft light illuminating her face, reflecting self-doubt.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_2.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_2.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 2.690563,
      withBlur: false,
      wordTimings: [
        {
          text: "At first I",
          start: 0,
          end: 0.8799999952316284,
          words: [
            {
              text: "At",
              start: 0,
              end: 0.3400000035762787,
            },
            {
              text: "first",
              start: 0.3400000035762787,
              end: 0.6399999856948853,
            },
            {
              text: "I",
              start: 0.7200000286102295,
              end: 0.8799999952316284,
            },
          ],
        },
        {
          text: "wonder if I'm",
          start: 0.8799999952316284,
          end: 1.440000057220459,
          words: [
            {
              text: "wonder",
              start: 0.8799999952316284,
              end: 1.0199999809265137,
            },
            {
              text: "if",
              start: 1.0199999809265137,
              end: 1.2400000095367432,
            },
            {
              text: "I'm",
              start: 1.2400000095367432,
              end: 1.440000057220459,
            },
          ],
        },
        {
          text: "truly overthinking",
          start: 1.440000057220459,
          end: 2.299999952316284,
          words: [
            {
              text: "truly",
              start: 1.440000057220459,
              end: 1.7599999904632568,
            },
            {
              text: "overthinking",
              start: 1.7599999904632568,
              end: 2.299999952316284,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 2,
      media: [
        {
          effect: "blur",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_2.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167064002",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167064001",
    },
    {
      text: "But slowly, I start to doubt myself so much that I stop sharing my feelings altogether.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of the female partner sitting quietly on a bed with her head down and arms crossed, portraying feelings of isolation and silence in a dimly lit room.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_3.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_3.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 4.440813,
      withBlur: false,
      wordTimings: [
        {
          text: "But slowly I",
          start: 0,
          end: 0.9200000166893005,
          words: [
            {
              text: "But",
              start: 0,
              end: 0.3799999952316284,
            },
            {
              text: "slowly",
              start: 0.3799999952316284,
              end: 0.7400000095367432,
            },
            {
              text: "I",
              start: 0.7400000095367432,
              end: 0.9200000166893005,
            },
          ],
        },
        {
          text: "start to doubt",
          start: 0.9200000166893005,
          end: 1.399999976158142,
          words: [
            {
              text: "start",
              start: 0.9200000166893005,
              end: 1.0800000429153442,
            },
            {
              text: "to",
              start: 1.0800000429153442,
              end: 1.3200000524520874,
            },
            {
              text: "doubt",
              start: 1.3200000524520874,
              end: 1.399999976158142,
            },
          ],
        },
        {
          text: "myself so much",
          start: 1.399999976158142,
          end: 2.1600000858306885,
          words: [
            {
              text: "myself",
              start: 1.399999976158142,
              end: 1.7799999713897705,
            },
            {
              text: "so",
              start: 1.7799999713897705,
              end: 1.9600000381469727,
            },
            {
              text: "much",
              start: 1.9600000381469727,
              end: 2.1600000858306885,
            },
          ],
        },
        {
          text: "that I stop",
          start: 2.1600000858306885,
          end: 2.7200000286102295,
          words: [
            {
              text: "that",
              start: 2.1600000858306885,
              end: 2.319999933242798,
            },
            {
              text: "I",
              start: 2.319999933242798,
              end: 2.559999942779541,
            },
            {
              text: "stop",
              start: 2.559999942779541,
              end: 2.7200000286102295,
            },
          ],
        },
        {
          text: "sharing my feelings",
          start: 2.7200000286102295,
          end: 3.559999942779541,
          words: [
            {
              text: "sharing",
              start: 2.7200000286102295,
              end: 3.0399999618530273,
            },
            {
              text: "my",
              start: 3.0399999618530273,
              end: 3.2799999713897705,
            },
            {
              text: "feelings",
              start: 3.2799999713897705,
              end: 3.559999942779541,
            },
          ],
        },
        {
          text: "altogether",
          start: 3.559999942779541,
          end: 4.059999942779541,
          words: [
            {
              text: "altogether",
              start: 3.559999942779541,
              end: 4.059999942779541,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 3,
      media: [
        {
          effect: "bounceAndFlash",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_3.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167064004",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167064003",
    },
    {
      text: "And I can’t help but ask—am I being unreasonable, or is this emotional manipulation?",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of the female partner looking in a mirror with a conflicted expression, surrounded by soft lighting, symbolizing her internal struggle.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_4.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_4.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 5.093875,
      withBlur: false,
      wordTimings: [
        {
          text: "And I can't",
          start: 0,
          end: 0.6800000071525574,
          words: [
            {
              text: "And",
              start: 0,
              end: 0.3199999928474426,
            },
            {
              text: "I",
              start: 0.3199999928474426,
              end: 0.46000000834465027,
            },
            {
              text: "can't",
              start: 0.46000000834465027,
              end: 0.6800000071525574,
            },
          ],
        },
        {
          text: "help but ask",
          start: 0.6800000071525574,
          end: 1.399999976158142,
          words: [
            {
              text: "help",
              start: 0.6800000071525574,
              end: 0.8600000143051147,
            },
            {
              text: "but",
              start: 0.8600000143051147,
              end: 1.0399999618530273,
            },
            {
              text: "ask",
              start: 1.0399999618530273,
              end: 1.399999976158142,
            },
          ],
        },
        {
          text: "am I being",
          start: 1.7999999523162842,
          end: 2.2200000286102295,
          words: [
            {
              text: "am",
              start: 1.7999999523162842,
              end: 1.840000033378601,
            },
            {
              text: "I",
              start: 1.840000033378601,
              end: 2.0399999618530273,
            },
            {
              text: "being",
              start: 2.0399999618530273,
              end: 2.2200000286102295,
            },
          ],
        },
        {
          text: "unreasonable or is",
          start: 2.2200000286102295,
          end: 3.4600000381469727,
          words: [
            {
              text: "unreasonable",
              start: 2.2200000286102295,
              end: 2.819999933242798,
            },
            {
              text: "or",
              start: 2.819999933242798,
              end: 3.319999933242798,
            },
            {
              text: "is",
              start: 3.319999933242798,
              end: 3.4600000381469727,
            },
          ],
        },
        {
          text: "this emotional manipulation",
          start: 3.4600000381469727,
          end: 4.619999885559082,
          words: [
            {
              text: "this",
              start: 3.4600000381469727,
              end: 3.680000066757202,
            },
            {
              text: "emotional",
              start: 3.680000066757202,
              end: 4.079999923706055,
            },
            {
              text: "manipulation",
              start: 4.079999923706055,
              end: 4.619999885559082,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 4,
      media: [
        {
          effect: "slideRight",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_4.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167064006",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167064005",
    },
    {
      text: "So what do you think?",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a person holding a phone, looking engaged and curious, set against a neutral background, inviting conversation.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_5.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_5.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 1.332188,
      withBlur: false,
      wordTimings: [
        {
          text: "So what do",
          start: 0,
          end: 0.6000000238418579,
          words: [
            {
              text: "So",
              start: 0,
              end: 0.36000001430511475,
            },
            {
              text: "what",
              start: 0.36000001430511475,
              end: 0.5,
            },
            {
              text: "do",
              start: 0.5,
              end: 0.6000000238418579,
            },
          ],
        },
        {
          text: "you think",
          start: 0.6000000238418579,
          end: 1,
          words: [
            {
              text: "you",
              start: 0.6000000238418579,
              end: 0.7400000095367432,
            },
            {
              text: "think",
              start: 0.7400000095367432,
              end: 1,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 5,
      media: [
        {
          effect: "blur",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_5.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce09167064008",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167064007",
    },
    {
      text: "Option A: They’re just being honest, and I really should learn to let small things go.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a whiteboard with hand written notes, including 'Option A' at the top, surrounded by colorful sticky notes, depicting the thought process.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_6.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_6.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 4.675875,
      withBlur: false,
      wordTimings: [
        {
          text: "Option A they're",
          start: 0,
          end: 1.2999999523162842,
          words: [
            {
              text: "Option",
              start: 0,
              end: 0.47999998927116394,
            },
            {
              text: "A",
              start: 0.47999998927116394,
              end: 0.8199999928474426,
            },
            {
              text: "they're",
              start: 1.1200000047683716,
              end: 1.2999999523162842,
            },
          ],
        },
        {
          text: "just being honest",
          start: 1.2999999523162842,
          end: 2.119999885559082,
          words: [
            {
              text: "just",
              start: 1.2999999523162842,
              end: 1.5199999809265137,
            },
            {
              text: "being",
              start: 1.5199999809265137,
              end: 1.7200000286102295,
            },
            {
              text: "honest",
              start: 1.7200000286102295,
              end: 2.119999885559082,
            },
          ],
        },
        {
          text: "and I really",
          start: 2.440000057220459,
          end: 2.880000114440918,
          words: [
            {
              text: "and",
              start: 2.440000057220459,
              end: 2.4800000190734863,
            },
            {
              text: "I",
              start: 2.4800000190734863,
              end: 2.5999999046325684,
            },
            {
              text: "really",
              start: 2.5999999046325684,
              end: 2.880000114440918,
            },
          ],
        },
        {
          text: "should learn to",
          start: 2.880000114440918,
          end: 3.440000057220459,
          words: [
            {
              text: "should",
              start: 2.880000114440918,
              end: 3.0399999618530273,
            },
            {
              text: "learn",
              start: 3.0399999618530273,
              end: 3.240000009536743,
            },
            {
              text: "to",
              start: 3.240000009536743,
              end: 3.440000057220459,
            },
          ],
        },
        {
          text: "let small things",
          start: 3.440000057220459,
          end: 4.099999904632568,
          words: [
            {
              text: "let",
              start: 3.440000057220459,
              end: 3.5799999237060547,
            },
            {
              text: "small",
              start: 3.5799999237060547,
              end: 3.880000114440918,
            },
            {
              text: "things",
              start: 3.880000114440918,
              end: 4.099999904632568,
            },
          ],
        },
        {
          text: "go",
          start: 4.099999904632568,
          end: 4.420000076293945,
          words: [
            {
              text: "go",
              start: 4.099999904632568,
              end: 4.420000076293945,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 6,
      media: [
        {
          effect: "blur",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_6.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce0916706400a",
        },
      ],
      elements: [],
      _id: "68af342b49dce09167064009",
    },
    {
      text: "Option B: This is emotional manipulation because they dismiss my feelings instead of addressing them.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a table with two contrasting signs labeled 'Option A' and 'Option B', set in a modern office environment, showcasing deliberation.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_7.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_7.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 5.851375,
      withBlur: false,
      wordTimings: [
        {
          text: "Option B this",
          start: 0,
          end: 1.3799999952316284,
          words: [
            {
              text: "Option",
              start: 0,
              end: 0.46000000834465027,
            },
            {
              text: "B",
              start: 0.46000000834465027,
              end: 0.8600000143051147,
            },
            {
              text: "this",
              start: 1.2999999523162842,
              end: 1.3799999952316284,
            },
          ],
        },
        {
          text: "is emotional manipulation",
          start: 1.3799999952316284,
          end: 2.640000104904175,
          words: [
            {
              text: "is",
              start: 1.3799999952316284,
              end: 1.5800000429153442,
            },
            {
              text: "emotional",
              start: 1.5800000429153442,
              end: 2.0399999618530273,
            },
            {
              text: "manipulation",
              start: 2.0399999618530273,
              end: 2.640000104904175,
            },
          ],
        },
        {
          text: "because they dismiss",
          start: 2.640000104904175,
          end: 3.6600000858306885,
          words: [
            {
              text: "because",
              start: 2.640000104904175,
              end: 3.0999999046325684,
            },
            {
              text: "they",
              start: 3.0999999046325684,
              end: 3.299999952316284,
            },
            {
              text: "dismiss",
              start: 3.299999952316284,
              end: 3.6600000858306885,
            },
          ],
        },
        {
          text: "my feelings instead",
          start: 3.6600000858306885,
          end: 4.739999771118164,
          words: [
            {
              text: "my",
              start: 3.6600000858306885,
              end: 3.9800000190734863,
            },
            {
              text: "feelings",
              start: 3.9800000190734863,
              end: 4.340000152587891,
            },
            {
              text: "instead",
              start: 4.340000152587891,
              end: 4.739999771118164,
            },
          ],
        },
        {
          text: "of addressing them",
          start: 4.739999771118164,
          end: 5.559999942779541,
          words: [
            {
              text: "of",
              start: 4.739999771118164,
              end: 4.940000057220459,
            },
            {
              text: "addressing",
              start: 4.940000057220459,
              end: 5.199999809265137,
            },
            {
              text: "them",
              start: 5.199999809265137,
              end: 5.559999942779541,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 7,
      media: [
        {
          effect: "blur",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_7.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce0916706400c",
        },
      ],
      elements: [],
      _id: "68af342b49dce0916706400b",
    },
    {
      text: "Which option would you choose? Share your thoughts and experiences in the comments—I want to hear your story.",
      imagePrompt:
        "4k ultra realistic, sony A7RIV image of a person typing on a laptop, surrounded by a warm and inviting home office atmosphere, encouraging interaction.",
      imageUrl:
        "https://strshrt.xyz/temp/68af33c549dce09167063792/image_8.jpeg",
      audioUrl: "https://strshrt.xyz/temp/68af33c549dce09167063792/audio_8.mp3",
      audioVolume: 1,
      playBackRate: 1,
      duration: 5.799125,
      withBlur: false,
      wordTimings: [
        {
          text: "Which option would",
          start: 0,
          end: 0.8399999737739563,
          words: [
            {
              text: "Which",
              start: 0,
              end: 0.3799999952316284,
            },
            {
              text: "option",
              start: 0.3799999952316284,
              end: 0.6800000071525574,
            },
            {
              text: "would",
              start: 0.6800000071525574,
              end: 0.8399999737739563,
            },
          ],
        },
        {
          text: "you choose Share",
          start: 0.8399999737739563,
          end: 1.9199999570846558,
          words: [
            {
              text: "you",
              start: 0.8399999737739563,
              end: 1,
            },
            {
              text: "choose",
              start: 1,
              end: 1.3600000143051147,
            },
            {
              text: "Share",
              start: 1.9199999570846558,
              end: 1.9199999570846558,
            },
          ],
        },
        {
          text: "your thoughts and",
          start: 1.9199999570846558,
          end: 2.680000066757202,
          words: [
            {
              text: "your",
              start: 1.9199999570846558,
              end: 2.1600000858306885,
            },
            {
              text: "thoughts",
              start: 2.1600000858306885,
              end: 2.4000000953674316,
            },
            {
              text: "and",
              start: 2.4000000953674316,
              end: 2.680000066757202,
            },
          ],
        },
        {
          text: "experiences in the",
          start: 2.680000066757202,
          end: 3.5,
          words: [
            {
              text: "experiences",
              start: 2.680000066757202,
              end: 3.119999885559082,
            },
            {
              text: "in",
              start: 3.119999885559082,
              end: 3.359999895095825,
            },
            {
              text: "the",
              start: 3.359999895095825,
              end: 3.5,
            },
          ],
        },
        {
          text: "comments I want",
          start: 3.5,
          end: 4.699999809265137,
          words: [
            {
              text: "comments",
              start: 3.5,
              end: 3.9000000953674316,
            },
            {
              text: "I",
              start: 4.460000038146973,
              end: 4.539999961853027,
            },
            {
              text: "want",
              start: 4.539999961853027,
              end: 4.699999809265137,
            },
          ],
        },
        {
          text: "to hear your",
          start: 4.699999809265137,
          end: 5.21999979019165,
          words: [
            {
              text: "to",
              start: 4.699999809265137,
              end: 4.860000133514404,
            },
            {
              text: "hear",
              start: 4.860000133514404,
              end: 4.940000057220459,
            },
            {
              text: "your",
              start: 4.940000057220459,
              end: 5.21999979019165,
            },
          ],
        },
        {
          text: "story",
          start: 5.21999979019165,
          end: 5.420000076293945,
          words: [
            {
              text: "story",
              start: 5.21999979019165,
              end: 5.420000076293945,
            },
          ],
        },
      ],
      backgroundMinimized: false,
      order: 8,
      media: [
        {
          effect: "panZoom",
          url: "https://strshrt.xyz/temp/68af33c549dce09167063792/image_8.jpeg",
          withBlur: false,
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          borderRadius: 10,
          volume: 0,
          _id: "68af342b49dce0916706400e",
        },
      ],
      elements: [],
      _id: "68af342b49dce0916706400d",
    },
  ],
  layers: [
    {
      type: "backgroundAudio",
      captionStyle: {
        fontSize: 80,
        fontFamily: "Inter",
        activeWordColor: "#ffcd00",
        inactiveWordColor: "#FFFFFF",
        backgroundColor: "#000000",
        fontWeight: "900",
        textTransform: "uppercase",
        textShadow:
          ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000",
        fromBottom: 0,
        wordsPerBatch: 2,
      },
      volume: 0.08,
      assetId: {
        url: "https://strshrt.xyz/assets/66ae67c2d4dd8e5e64104bfb/audio.mp3",
      },
    },
    {
      type: "captions",
      captionStyle: {
        fontSize: 75,
        fontFamily: "Inter",
        activeWordColor: "#FFFFFF",
        inactiveWordColor: "#CCCCCC",
        backgroundColor: "transparent",
        fontWeight: "700",
        textTransform: "none",
        textShadow:
          ".1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000",
        fromBottom: 50,
        wordsPerBatch: 3,
      },
      volume: 0.2,
    },
  ],
  format: {
    width: 1080,
    height: 1920,
  },
};

// Visual effects components
const VisualEffect: React.FC<{
  effect: string;
  children: React.ReactNode;
  duration: number;
}> = ({ effect, children, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = frame / (fps * duration);

  switch (effect) {
    case "blur":
      return (
        <div
          style={{ filter: `blur(${interpolate(progress, [0, 1], [5, 0])}px)` }}
        >
          {children}
        </div>
      );

    case "panZoom":
      const scale = interpolate(progress, [0, 1], [1, 1.1], {
        extrapolateRight: "clamp",
      });
      return (
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
        >
          {children}
        </div>
      );

    case "slideRight":
      const slideX = interpolate(progress, [0, 0.3], [-100, 0], {
        extrapolateRight: "clamp",
      });
      return (
        <div style={{ transform: `translateX(${slideX}%)` }}>{children}</div>
      );

    case "bounceAndFlash":
      const bounce = spring({
        frame: frame % (fps * 0.5),
        fps,
        config: { damping: 10, stiffness: 200 },
      });
      const flash = Math.sin(frame * 0.2) > 0 ? 1 : 0.9;
      return (
        <div
          style={{
            transform: `scale(${1 + bounce * 0.05})`,
            opacity: flash,
          }}
        >
          {children}
        </div>
      );

    default:
      return <>{children}</>;
  }
};

// Captions component with word-level timing
const Captions: React.FC<{
  segment: Segment;
  segmentStartTime: number;
  style: CaptionStyle;
}> = ({ segment, segmentStartTime, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps - segmentStartTime;

  const activeWords = useMemo(() => {
    const words: Array<{ text: string; isActive: boolean }> = [];

    segment.wordTimings.forEach((timing) => {
      if (timing.words) {
        timing.words.forEach((word) => {
          const isActive = currentTime >= word.start && currentTime <= word.end;
          words.push({ text: word.text, isActive });
        });
      } else {
        const isActive =
          currentTime >= timing.start && currentTime <= timing.end;
        words.push({ text: timing.text, isActive });
      }
    });

    return words;
  }, [currentTime, segment.wordTimings]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: `${style.fromBottom}px`,
        left: 0,
        right: 0,
        padding: "20px",
        textAlign: "center",
        fontFamily: fontFamily,
        fontSize: `${style.fontSize}px`,
        fontWeight: style.fontWeight as any,
        textTransform: style.textTransform as any,
        textShadow: style.textShadow,
        backgroundColor: style.backgroundColor,
        zIndex: 10,
      }}
    >
      {activeWords.map((word, index) => (
        <span
          key={index}
          style={{
            color: word.isActive
              ? style.activeWordColor
              : style.inactiveWordColor,
            marginRight: "8px",
            transition: "color 0.1s ease",
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};

// Main segment component
const SegmentComponent: React.FC<{
  segment: Segment;
  segmentStartTime: number;
  captionStyle: CaptionStyle;
}> = ({ segment, segmentStartTime, captionStyle }) => {
  const mediaItem = segment.media[0];

  const isVideo = segment.imageUrl.endsWith(".mp4");
  useEffect(() => {
    console.log("thoufic segment component", segment);
  }, []);

  return (
    <AbsoluteFill>
      <VisualEffect effect={mediaItem.effect} duration={segment.duration}>
        {isVideo ? (
          <Video
            src={segment.imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: `${mediaItem.borderRadius}px`,
              filter: mediaItem.withBlur ? "blur(10px)" : "none",
            }}
          />
        ) : (
          <Img
            src={segment.imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: `${mediaItem.borderRadius}px`,
              filter: mediaItem.withBlur ? "blur(10px)" : "none",
            }}
          />
        )}
      </VisualEffect>

      <Audio src={segment.audioUrl} volume={1} />

      <AbsoluteFill>
        <Captions
          segment={segment}
          segmentStartTime={segmentStartTime}
          style={captionStyle}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Main video composition
export const AIVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  // Calculate cumulative start times for each segment
  const segmentTimings = useMemo(() => {
    let currentTime = 0;
    return videoData.segments.map((segment) => {
      const startTime = currentTime;
      currentTime += segment.duration;
      return {
        segment,
        startTime,
        startFrame: Math.round(startTime * fps),
        durationInFrames: Math.round(segment.duration * fps),
      };
    });
  }, [fps]);

  // Find caption style from layers
  const captionLayer = videoData.layers.find(
    (layer) => layer.type === "captions",
  );
  const backgroundAudioLayer = videoData.layers.find(
    (layer) => layer.type === "backgroundAudio",
  );

  const totalDurationInFrames = Math.round(
    segmentTimings.reduce((acc, { segment }) => acc + segment.duration, 0) *
      fps,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Background Audio */}
      {backgroundAudioLayer?.assetId?.url && (
        <Audio
          src={backgroundAudioLayer.assetId.url}
          volume={backgroundAudioLayer.volume}
          loop
        />
      )}

      {/* Render each segment as a sequence */}
      {segmentTimings.map(
        ({ segment, startFrame, durationInFrames, startTime }) => (
          <Sequence
            key={segment.order}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <SegmentComponent
              segment={segment}
              segmentStartTime={startTime}
              captionStyle={
                captionLayer?.captionStyle || {
                  fontSize: 75,
                  fontFamily: "Inter",
                  activeWordColor: "#FFFFFF",
                  inactiveWordColor: "#CCCCCC",
                  backgroundColor: "transparent",
                  fontWeight: "700",
                  textTransform: "none",
                  textShadow: ".1em .1em .1em #000",
                  fromBottom: 50,
                  wordsPerBatch: 3,
                }
              }
            />
          </Sequence>
        ),
      )}
    </AbsoluteFill>
  );
};

// Export composition configuration
export const VideoConfig = {
  id: "AIVideo",
  component: AIVideo,
  durationInFrames: Math.round(
    videoData.segments.reduce((acc, segment) => acc + segment.duration, 0) * 30,
  ),
  fps: 30,
  //   height: 1920,
  //   width: 1080,
  width: videoData.format.width,
  height: videoData.format.height,
};
