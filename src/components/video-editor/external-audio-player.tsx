"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { VideoSegment } from "@/types/video";

interface ExternalAudioPlayerProps {
  segments: VideoSegment[];
  isPlaying: boolean;
  currentTime: number;
  backgroundMusicUrl?: string;
  fps?: number;
  volume?: number;
  isMuted?: boolean;
}

export function ExternalAudioPlayer({
  segments,
  isPlaying,
  currentTime,
  backgroundMusicUrl = "/demo/temporex.mp3",
  fps = 30,
  volume = 1,
  isMuted = false,
}: ExternalAudioPlayerProps) {
  // Refs for audio elements
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentVoiceRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);

  // Volume constants - adjusted for better balance
  const BACKGROUND_MUSIC_NORMAL = 0.4; // Increased from 0.08 for audibility
  const BACKGROUND_MUSIC_DUCKED = 0.15; // Increased from 0.03
  const VOICE_VOLUME = 0.85; // Increased from 0.65

  // Initialize audio on first user interaction
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initAudio = () => {
      if (!isInitialized) {
        setIsInitialized(true);
      }
    };

    // Initialize on user interaction to comply with browser policies
    const handleUserInteraction = () => {
      if (!isInitialized) {
        initAudio();
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [isInitialized]);

  // Smooth volume transition to prevent clicks/pops
  const smoothVolumeTransition = useCallback(
    (audio: HTMLAudioElement, targetVolume: number, duration: number = 200) => {
      if (!audio) return;

      const startVolume = audio.volume;
      const volumeDiff = targetVolume - startVolume;
      const steps = 20;
      const stepTime = duration / steps;
      let currentStep = 0;

      // Clear any existing fade
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      fadeIntervalRef.current = setInterval(() => {
        if (currentStep >= steps) {
          audio.volume = Math.max(0, Math.min(1, targetVolume));
          clearInterval(fadeIntervalRef.current!);
          fadeIntervalRef.current = null;
          return;
        }

        const progress = currentStep / steps;
        const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2; // Smooth easing
        audio.volume = Math.max(
          0,
          Math.min(1, startVolume + volumeDiff * easeProgress),
        );
        currentStep++;
      }, stepTime);
    },
    [],
  );

  // Preload all audio files
  useEffect(() => {
    if (!isInitialized) return;

    // Load background music
    if (backgroundMusicUrl && !backgroundMusicRef.current) {
      const bgAudio = new Audio(backgroundMusicUrl);
      bgAudio.loop = true;
      bgAudio.volume = 0; // Start at 0 to prevent audio pop
      bgAudio.preload = "auto";

      // Set crossOrigin to avoid CORS issues
      try {
        bgAudio.crossOrigin = "anonymous";
      } catch (e) {
        console.warn("Could not set crossOrigin on background music");
      }

      backgroundMusicRef.current = bgAudio;

      // Fade in the background music after loading
      bgAudio.addEventListener(
        "canplaythrough",
        () => {
          smoothVolumeTransition(
            bgAudio,
            (isMuted ? 0 : volume) * BACKGROUND_MUSIC_NORMAL,
            500,
          );
        },
        { once: true },
      );
    }

    // Preload voice segments
    segments.forEach((segment) => {
      if (segment.audioUrl && !voiceAudioRefs.current.has(segment._id)) {
        const audio = new Audio(segment.audioUrl);
        audio.preload = "auto";
        audio.volume = (isMuted ? 0 : volume) * VOICE_VOLUME;

        try {
          audio.crossOrigin = "anonymous";
        } catch (e) {
          console.warn("Could not set crossOrigin on voice audio");
        }

        voiceAudioRefs.current.set(segment._id, audio);
      }
    });

    return () => {
      // Cleanup audio elements
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = "";
      }
      voiceAudioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      voiceAudioRefs.current.clear();
    };
  }, [
    segments,
    backgroundMusicUrl,
    isInitialized,
    volume,
    isMuted,
    smoothVolumeTransition,
  ]);

  // Calculate which segment should be playing
  const getCurrentSegmentIndex = useCallback(() => {
    let cumulativeTime = 0;

    for (let i = 0; i < segments.length; i++) {
      const segmentDuration = segments[i].duration || 5;

      // Debug logging for timing issues
      if (
        currentTime >= cumulativeTime &&
        currentTime < cumulativeTime + segmentDuration
      ) {
        const relativeTime = currentTime - cumulativeTime;
        const progress = ((relativeTime / segmentDuration) * 100).toFixed(1);

        // Only log significant changes to avoid spam
        // if (Math.floor(relativeTime) !== Math.floor(relativeTime - 0.1)) {
        //   console.log(
        //     `Segment ${i}: ${relativeTime.toFixed(1)}s / ${segmentDuration.toFixed(1)}s (${progress}%)`,
        //   );
        // }

        return i;
      }
      cumulativeTime += segmentDuration;
    }

    return -1;
  }, [segments, currentTime]);

  // Handle playback state changes
  useEffect(() => {
    if (!isInitialized) return;

    const bgMusic = backgroundMusicRef.current;

    if (isPlaying) {
      // Start background music with proper volume
      if (bgMusic && bgMusic.paused) {
        // Check if there's currently a voice playing to set appropriate volume
        const currentSegmentIndex = getCurrentSegmentIndex();
        const hasVoice =
          currentSegmentIndex >= 0 && segments[currentSegmentIndex]?.audioUrl;
        const targetVolume =
          (isMuted ? 0 : volume) *
          (hasVoice ? BACKGROUND_MUSIC_DUCKED : BACKGROUND_MUSIC_NORMAL);

        bgMusic.volume = targetVolume;

        bgMusic.play().catch((error) => {
          console.warn("Failed to play background music:", error);
          // Try to resume if it's a user interaction issue
          if (error.name === "NotAllowedError") {
            console.log("Audio playback requires user interaction");
          }
        });
      }
    } else {
      // Pause all audio
      if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
      }
      if (currentVoiceRef.current && !currentVoiceRef.current.paused) {
        currentVoiceRef.current.pause();
      }
    }
  }, [
    isPlaying,
    isInitialized,
    volume,
    isMuted,
    getCurrentSegmentIndex,
    segments,
  ]);

  // Handle voice segment changes and synchronization
  useEffect(() => {
    if (!isInitialized || !isPlaying) return;

    const currentSegmentIndex = getCurrentSegmentIndex();

    if (currentSegmentIndex === -1) {
      // No segment should be playing
      if (currentVoiceRef.current && !currentVoiceRef.current.paused) {
        currentVoiceRef.current.pause();
        currentVoiceRef.current = null;
      }
      return;
    }

    const segment = segments[currentSegmentIndex];

    if (!segment.audioUrl) {
      // Current segment has no audio
      if (currentVoiceRef.current && !currentVoiceRef.current.paused) {
        currentVoiceRef.current.pause();
        currentVoiceRef.current = null;
      }

      // Restore background music volume when no voice
      if (backgroundMusicRef.current && !backgroundMusicRef.current.paused) {
        smoothVolumeTransition(
          backgroundMusicRef.current,
          (isMuted ? 0 : volume) * BACKGROUND_MUSIC_NORMAL,
          300,
        );
      }
      return;
    }

    const voiceAudio = voiceAudioRefs.current.get(segment._id);

    if (!voiceAudio) return;

    // Calculate segment start time
    let segmentStartTime = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      segmentStartTime += segments[i].duration || 5;
    }

    const relativeTime = currentTime - segmentStartTime;

    // Switch to new voice segment if needed
    if (currentVoiceRef.current !== voiceAudio) {
      // Stop previous voice
      if (currentVoiceRef.current && !currentVoiceRef.current.paused) {
        currentVoiceRef.current.pause();
      }

      // Start new voice segment
      currentVoiceRef.current = voiceAudio;
      voiceAudio.currentTime = Math.max(0, relativeTime);

      // Apply audio ducking for background music with smooth transition
      if (backgroundMusicRef.current && !backgroundMusicRef.current.paused) {
        smoothVolumeTransition(
          backgroundMusicRef.current,
          (isMuted ? 0 : volume) * BACKGROUND_MUSIC_DUCKED,
          200,
        );
      }

      // Set voice volume before playing
      voiceAudio.volume = (isMuted ? 0 : volume) * VOICE_VOLUME;

      voiceAudio.play().catch((error) => {
        console.warn("Failed to play voice audio:", error);
      });
    } else {
      // Sync existing voice audio
      const timeDiff = Math.abs(voiceAudio.currentTime - relativeTime);

      // Only sync if difference is significant (>0.1 seconds)
      if (timeDiff > 0.1) {
        voiceAudio.currentTime = Math.max(0, relativeTime);
      }
    }

    // Handle voice segment ending - use actual duration with small buffer
    const segmentDuration = segment.duration || 5;
    const endBuffer = 0.1; // 100ms buffer to ensure clean ending

    if (relativeTime >= segmentDuration - endBuffer) {
      if (voiceAudio && !voiceAudio.paused) {
        // Check if audio actually ended (more reliable than time comparison)
        if (voiceAudio.ended || relativeTime >= segmentDuration) {
          voiceAudio.pause();
          voiceAudio.currentTime = 0;
          currentVoiceRef.current = null;

          console.log(
            `Segment ${currentSegmentIndex} audio ended at ${relativeTime.toFixed(2)}s`,
          );

          // Restore background music volume with smooth transition
          if (
            backgroundMusicRef.current &&
            !backgroundMusicRef.current.paused
          ) {
            smoothVolumeTransition(
              backgroundMusicRef.current,
              (isMuted ? 0 : volume) * BACKGROUND_MUSIC_NORMAL,
              300,
            );
          }
        }
      }
    }
  }, [
    currentTime,
    segments,
    isPlaying,
    isInitialized,
    getCurrentSegmentIndex,
    volume,
    isMuted,
    smoothVolumeTransition,
  ]);

  // Handle seeking - sync all audio when user seeks
  useEffect(() => {
    if (!isInitialized) return;

    const bgMusic = backgroundMusicRef.current;

    if (bgMusic) {
      // Background music loops, so we calculate position within loop
      const musicDuration = bgMusic.duration || 1;
      if (musicDuration > 0 && isFinite(musicDuration)) {
        const targetTime = currentTime % musicDuration;
        // Only update if difference is significant to prevent noise
        if (Math.abs(bgMusic.currentTime - targetTime) > 0.5) {
          bgMusic.currentTime = targetTime;
        }
      }
    }

    // Voice audio syncing is handled in the main effect above
  }, [currentTime, isInitialized]);

  // Handle volume and mute changes
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;

    // Update background music volume with current ducking state
    if (backgroundMusicRef.current && !backgroundMusicRef.current.paused) {
      const currentSegmentIndex = getCurrentSegmentIndex();
      const hasVoice =
        currentSegmentIndex >= 0 && segments[currentSegmentIndex]?.audioUrl;
      const targetBgVolume =
        effectiveVolume *
        (hasVoice ? BACKGROUND_MUSIC_DUCKED : BACKGROUND_MUSIC_NORMAL);

      smoothVolumeTransition(backgroundMusicRef.current, targetBgVolume, 200);
    } else if (backgroundMusicRef.current) {
      // If paused, set volume directly
      backgroundMusicRef.current.volume =
        effectiveVolume * BACKGROUND_MUSIC_NORMAL;
    }

    // Update voice volumes
    voiceAudioRefs.current.forEach((audio) => {
      const voiceVolume = effectiveVolume * VOICE_VOLUME;
      if (!audio.paused) {
        smoothVolumeTransition(audio, voiceVolume, 200);
      } else {
        audio.volume = voiceVolume;
      }
    });
  }, [
    volume,
    isMuted,
    getCurrentSegmentIndex,
    segments,
    smoothVolumeTransition,
  ]);

  // Render nothing - this is a pure audio controller component
  return null;
}
