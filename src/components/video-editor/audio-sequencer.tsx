"use client";

import { useEffect, useRef } from "react";
import type { VideoSegment } from "@/types/video";

interface AudioSequencerProps {
  segments: VideoSegment[];
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  onTimeUpdate?: (time: number) => void;
}

export function AudioSequencer({
  segments,
  isPlaying,
  currentTime,
  volume,
  onTimeUpdate,
}: AudioSequencerProps) {
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const currentSegmentIndexRef = useRef<number>(-1);
  const segmentStartTimesRef = useRef<number[]>([]);

  // Calculate segment start times
  useEffect(() => {
    const startTimes: number[] = [];
    let cumulativeTime = 0;
    
    for (let i = 0; i < segments.length; i++) {
      startTimes.push(cumulativeTime);
      cumulativeTime += segments[i].duration;
    }
    
    segmentStartTimesRef.current = startTimes;
  }, [segments]);

  // Initialize audio elements
  useEffect(() => {
    const audioMap = new Map<number, HTMLAudioElement>();

    segments.forEach((segment, index) => {
      if (segment.audioUrl) {
        const audio = new Audio(segment.audioUrl);
        audio.preload = "metadata";
        audio.volume = volume;
        audioMap.set(index, audio);
      }
    });

    audioRefs.current = audioMap;

    return () => {
      // Cleanup audio elements
      audioMap.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioRefs.current.clear();
    };
  }, [segments, volume]);

  // Update volume for all audio elements
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume]);

  // Handle playback based on current time
  useEffect(() => {
    const segmentStartTimes = segmentStartTimesRef.current;
    
    // Find current segment based on time
    let currentSegmentIndex = -1;
    let segmentLocalTime = 0;
    
    for (let i = 0; i < segments.length; i++) {
      const segmentStart = segmentStartTimes[i];
      const segmentEnd = segmentStart + segments[i].duration;
      
      if (currentTime >= segmentStart && currentTime < segmentEnd) {
        currentSegmentIndex = i;
        segmentLocalTime = currentTime - segmentStart;
        break;
      }
    }

    // Handle audio playback
    if (isPlaying && currentSegmentIndex >= 0) {
      const currentAudio = audioRefs.current.get(currentSegmentIndex);
      
      if (currentAudio) {
        // Sync audio time with segment local time
        const timeDiff = Math.abs(currentAudio.currentTime - segmentLocalTime);
        if (timeDiff > 0.1) {
          currentAudio.currentTime = segmentLocalTime;
        }
        
        // Play current segment audio
        currentAudio.play().catch(console.error);
        
        // Pause all other audio elements
        audioRefs.current.forEach((audio, index) => {
          if (index !== currentSegmentIndex) {
            audio.pause();
          }
        });
      }
      
      currentSegmentIndexRef.current = currentSegmentIndex;
    } else {
      // Pause all audio when not playing
      audioRefs.current.forEach((audio) => {
        audio.pause();
      });
      currentSegmentIndexRef.current = -1;
    }
  }, [isPlaying, currentTime, segments]);

  // Handle time seeking when not playing
  useEffect(() => {
    if (!isPlaying) {
      const segmentStartTimes = segmentStartTimesRef.current;
      
      // Find current segment and set audio time
      for (let i = 0; i < segments.length; i++) {
        const segmentStart = segmentStartTimes[i];
        const segmentEnd = segmentStart + segments[i].duration;
        
        if (currentTime >= segmentStart && currentTime < segmentEnd) {
          const audio = audioRefs.current.get(i);
          if (audio) {
            audio.currentTime = currentTime - segmentStart;
          }
          break;
        }
      }
    }
  }, [currentTime, isPlaying, segments]);

  // This component doesn't render anything visible
  return null;
}