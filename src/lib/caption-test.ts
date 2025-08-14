// Caption timing test utility
import { VIDEO_DATA } from "./video-mock-data";
import type { VideoSegment, WordTiming } from "@/types/video";

export function testCaptionTiming() {
  const segments = VIDEO_DATA.video.segments;
  
  console.log("=== Caption Timing Analysis ===");
  
  segments.forEach((segment, segmentIndex) => {
    console.log(`\n--- Segment ${segmentIndex} ---`);
    console.log(`Text: "${segment.text}"`);
    console.log(`Duration: ${segment.duration}s`);
    console.log(`Word Timings Count: ${segment.wordTimings.length}`);
    
    if (segment.wordTimings.length > 0) {
      console.log("Word timing details:");
      
      segment.wordTimings.forEach((timing, timingIndex) => {
        console.log(`  Timing ${timingIndex}: "${timing.text}" (${timing.start}s - ${timing.end}s)`);
        
        timing.words.forEach((word, wordIndex) => {
          console.log(`    Word ${wordIndex}: "${word.text}" (${word.start}s - ${word.end}s)`);
        });
      });
      
      // Verify timing continuity
      const allWords = segment.wordTimings.flatMap(t => t.words);
      const sortedWords = allWords.sort((a, b) => a.start - b.start);
      
      let hasGaps = false;
      for (let i = 0; i < sortedWords.length - 1; i++) {
        const currentEnd = sortedWords[i].end;
        const nextStart = sortedWords[i + 1].start;
        if (nextStart > currentEnd + 0.1) { // Allow 0.1s tolerance
          console.log(`    ⚠️  Gap detected: ${currentEnd}s to ${nextStart}s`);
          hasGaps = true;
        }
      }
      
      if (!hasGaps) {
        console.log("    ✅ Word timing appears continuous");
      }
    }
  });
  
  // Test caption layer styles
  const captionLayers = VIDEO_DATA.video.layers.filter(layer => layer.type === "captions");
  console.log(`\n=== Caption Layers ===`);
  console.log(`Found ${captionLayers.length} caption layer(s)`);
  
  captionLayers.forEach((layer, index) => {
    console.log(`\nLayer ${index}:`, {
      fontSize: layer.captionStyle.fontSize,
      fontFamily: layer.captionStyle.fontFamily,
      activeWordColor: layer.captionStyle.activeWordColor,
      inactiveWordColor: layer.captionStyle.inactiveWordColor,
      backgroundColor: layer.captionStyle.backgroundColor,
      wordsPerBatch: layer.captionStyle.wordsPerBatch,
      fromBottom: layer.captionStyle.fromBottom,
    });
  });
}

// Function to get word at specific time in a segment
export function getWordAtTime(segment: VideoSegment, timeInSegment: number) {
  if (!segment.wordTimings.length) return null;
  
  const allWords = segment.wordTimings.flatMap(t => t.words);
  const sortedWords = allWords.sort((a, b) => a.start - b.start);
  
  return sortedWords.find(word => 
    timeInSegment >= word.start && timeInSegment <= word.end
  ) || null;
}

// Function to get all active words at specific time
export function getActiveWordsAtTime(segment: VideoSegment, timeInSegment: number) {
  if (!segment.wordTimings.length) return [];
  
  const allWords = segment.wordTimings.flatMap(t => t.words);
  
  return allWords.filter(word => 
    timeInSegment >= word.start && timeInSegment <= word.end
  );
}