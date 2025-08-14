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
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const currentSegmentIndexRef = useRef<number>(-1);
  const segmentStartTimesRef = useRef<number[]>([]);
  const isPlayingRef = useRef<boolean>(false);

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

    // Initialize background music
    const backgroundMusic = new Audio("/demo/temporex.mp3");
    backgroundMusic.preload = "metadata";
    backgroundMusic.volume = volume * 0.08; // 8% volume for background music
    backgroundMusic.loop = true;
    backgroundMusicRef.current = backgroundMusic;

    audioRefs.current = audioMap;

    return () => {
      // Cleanup audio elements
      audioMap.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      });
      audioRefs.current.clear();
      
      // Cleanup background music
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = "";
        backgroundMusicRef.current = null;
      }
      
      currentSegmentIndexRef.current = -1;
      isPlayingRef.current = false;
    };
  }, [segments, volume]);

  // Update volume for all audio elements
  useEffect(() => {
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
    
    // Update background music volume
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = volume * 0.08; // 8% volume for background music
    }
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
      const previousSegmentIndex = currentSegmentIndexRef.current;
      
      // Start background music if not playing
      if (backgroundMusicRef.current && backgroundMusicRef.current.paused) {
        backgroundMusicRef.current.currentTime = currentTime;
        backgroundMusicRef.current.play().catch((error) => {
          if (error.name !== 'AbortError') {
            console.error('Background music play error:', error);
          }
        });
      }
      
      // First, pause all audio elements to prevent overlapping
      audioRefs.current.forEach((audio, index) => {
        if (index !== currentSegmentIndex && !audio.paused) {
          audio.pause();
        }
      });
      
      if (currentAudio) {
        // Only start playback if we switched segments or audio is not playing
        const segmentChanged = previousSegmentIndex !== currentSegmentIndex;
        const audioNotPlaying = currentAudio.paused || currentAudio.ended;
        
        // Sync audio time with segment local time
        const timeDiff = Math.abs(currentAudio.currentTime - segmentLocalTime);
        const needsSeek = timeDiff > 0.2; // Increased threshold to reduce frequent seeking
        
        if (needsSeek) {
          currentAudio.currentTime = Math.max(0, Math.min(segmentLocalTime, currentAudio.duration || 0));
        }
        
        // Only call play() if audio is not already playing or we need to start a new segment
        if (audioNotPlaying || segmentChanged) {
          currentAudio.play().catch((error) => {
            // Only log if it's not an interruption error
            if (error.name !== 'AbortError') {
              console.error('Audio play error:', error);
            }
          });
        }
      }
      
      currentSegmentIndexRef.current = currentSegmentIndex;
      isPlayingRef.current = true;
    } else {
      // Pause all audio when not playing
      if (isPlayingRef.current) {
        audioRefs.current.forEach((audio) => {
          if (!audio.paused) {
            audio.pause();
          }
        });
        
        // Pause background music
        if (backgroundMusicRef.current && !backgroundMusicRef.current.paused) {
          backgroundMusicRef.current.pause();
        }
        
        isPlayingRef.current = false;
      }
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
            const segmentLocalTime = currentTime - segmentStart;
            audio.currentTime = Math.max(0, Math.min(segmentLocalTime, audio.duration || 0));
          }
          break;
        }
      }
    }
  }, [currentTime, isPlaying, segments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Ensure all audio is stopped when component unmounts
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
      
      // Stop background music
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.currentTime = 0;
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}