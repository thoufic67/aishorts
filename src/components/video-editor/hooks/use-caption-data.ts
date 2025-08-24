import type { Video, VideoSegment } from "@/types/video";

interface CaptionStyle {
  fontSize: number;
  fontFamily: string;
  activeWordColor: string;
  inactiveWordColor: string;
  backgroundColor: string;
  fontWeight: string;
  textTransform: string;
  textShadow: string;
  showEmojis: boolean;
  fromBottom: number;
  wordsPerBatch: number;
}

interface WordData {
  text: string;
  isActive: boolean;
  isCompleted: boolean;
}

export const useCaptionData = (
  video: Video,
  activeSegment: VideoSegment,
  relativeTime: number,
) => {
  const getCaptionStyle = (): CaptionStyle => {
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

  const getCurrentWordsData = (captionStyle: CaptionStyle) => {
    if (!activeSegment.wordTimings.length) {
      return {
        displayText: activeSegment.text,
        words: [
          { text: activeSegment.text, isActive: true, isCompleted: false },
        ],
      };
    }

    const wordsData: WordData[] = [];
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

    let displayWords: WordData[] = [];

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

  return {
    getCaptionStyle,
    getCurrentWordsData,
  };
};