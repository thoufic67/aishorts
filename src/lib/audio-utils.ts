/**
 * Get the duration of an audio file from its URL with multiple retry strategies
 */
export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      reject(new Error("Audio API not available (server-side)"));
      return;
    }

    const audio = new Audio();
    let hasResolved = false;
    let retryCount = 0;
    const maxRetries = 3;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("canplaythrough", onCanPlayThrough);
      audio.removeEventListener("error", onError);
      // Don't clear the src immediately to allow duration to stabilize
    };

    const resolveWithDuration = (duration: number) => {
      if (hasResolved) return;

      // Validate duration is reasonable (between 0.1 and 300 seconds)
      if (
        duration &&
        !isNaN(duration) &&
        isFinite(duration) &&
        duration > 0.1 &&
        duration < 300
      ) {
        hasResolved = true;
        cleanup();
        console.log(
          `Audio duration resolved: ${duration.toFixed(2)}s for ${audioUrl}`,
        );
        resolve(duration);
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.warn(
          `Invalid duration ${duration}, retrying... (attempt ${retryCount}/${maxRetries})`,
        );
        setTimeout(() => loadAudio(), 500 * retryCount);
      } else {
        hasResolved = true;
        cleanup();
        reject(new Error(`Invalid audio duration: ${duration}`));
      }
    };

    const onLoadedMetadata = () => {
      if (hasResolved) return;

      // Sometimes duration is not immediately available even after loadedmetadata
      if (audio.duration && audio.duration !== Infinity) {
        resolveWithDuration(audio.duration);
      }
      // Don't reject here, wait for other events
    };

    const onDurationChange = () => {
      if (hasResolved) return;

      // Duration change event is more reliable for some audio formats
      if (audio.duration && audio.duration !== Infinity) {
        resolveWithDuration(audio.duration);
      }
    };

    const onCanPlayThrough = () => {
      if (hasResolved) return;

      // Final fallback - audio is fully loaded
      if (audio.duration && audio.duration !== Infinity) {
        resolveWithDuration(audio.duration);
      } else {
        // If we still don't have duration, force load the entire audio
        audio.currentTime = 1e101; // Seek to end to force duration calculation
        audio.addEventListener(
          "seeked",
          () => {
            audio.currentTime = 0;
            if (audio.duration && audio.duration !== Infinity) {
              resolveWithDuration(audio.duration);
            }
          },
          { once: true },
        );
      }
    };

    const onError = (e: Event | Error) => {
      if (hasResolved) return;

      if (retryCount < maxRetries) {
        retryCount++;
        console.warn(
          `Audio loading error, retrying... (attempt ${retryCount}/${maxRetries}):`,
          e,
        );
        setTimeout(() => loadAudio(), 500 * retryCount);
      } else {
        hasResolved = true;
        cleanup();
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        reject(
          new Error(
            `Failed to load audio after ${maxRetries} attempts: ${errorMessage}`,
          ),
        );
      }
    };

    const loadAudio = () => {
      // Reset audio element for retry
      audio.src = "";

      // Add all event listeners
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.addEventListener("durationchange", onDurationChange);
      audio.addEventListener("canplaythrough", onCanPlayThrough);
      audio.addEventListener("error", onError);

      // Ensure the URL is absolute for better compatibility
      let fullUrl = audioUrl;
      if (audioUrl.startsWith("/")) {
        fullUrl = `${window.location.origin}${audioUrl}`;
      }

      // Set audio properties for better loading
      audio.preload = "metadata";
      audio.crossOrigin = "anonymous"; // Handle CORS if needed

      try {
        audio.src = fullUrl;
        audio.load();
      } catch (error) {
        onError(error as Error);
      }
    };

    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      audio.src = "";
      reject(new Error("Audio loading timeout after 30 seconds"));
    }, 30000); // 30 second timeout

    // Start loading
    loadAudio();
  });
}

/**
 * Get audio duration with fallback to estimation
 * This is the recommended method to use for reliable duration calculation
 */
export async function getAudioDurationWithFallback(
  audioUrl: string,
  text: string,
  voice?: string,
): Promise<number> {
  try {
    // Try to get actual duration
    const actualDuration = await getAudioDuration(audioUrl);

    // Validate against estimate to catch potential errors
    const estimatedDuration = estimateAudioDuration(text, voice);

    // If actual duration is way off from estimate, it might be wrong
    const ratio = actualDuration / estimatedDuration;
    if (ratio < 0.5 || ratio > 2.0) {
      console.warn(
        `Audio duration suspicious - actual: ${actualDuration.toFixed(2)}s, ` +
          `estimated: ${estimatedDuration.toFixed(2)}s (ratio: ${ratio.toFixed(2)})`,
      );

      // If the ratio is really off, prefer the estimate
      if (ratio < 0.3 || ratio > 3.0) {
        console.warn(
          "Using estimated duration due to suspicious actual duration",
        );
        return estimatedDuration;
      }
    }

    return actualDuration;
  } catch (error) {
    console.warn("Failed to get actual audio duration, using estimate:", error);
    return estimateAudioDuration(text, voice);
  }
}

/**
 * Estimate audio duration based on text (fallback method)
 * @param text The text content
 * @param voice Optional voice identifier to adjust WPM
 * @param baseWPM Base words per minute (default: 150)
 */
export function estimateAudioDuration(
  text: string,
  voice?: string,
  baseWPM: number = 150,
): number {
  // Clean the text and count words more accurately
  const cleanText = text
    .replace(/[^\w\s'-]/g, " ") // Keep words, spaces, apostrophes, and hyphens
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  const wordCount = cleanText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // Adjust WPM based on voice characteristics if known
  let adjustedWPM = baseWPM;

  if (voice) {
    // Adjust based on known voice speeds (you can expand this based on your TTS service)
    const voiceSpeedMap: Record<string, number> = {
      rachel: 140, // Slightly slower, more articulate
      alice: 150, // Normal speed
      charlie: 160, // Slightly faster
      matilda: 145, // Clear and moderate
      onyx: 135, // Deep and slower
      nova: 155, // Energetic and faster
      // Add more voice mappings as needed
    };

    adjustedWPM = voiceSpeedMap[voice.toLowerCase()] || baseWPM;
  }

  // Calculate base duration
  let duration = (wordCount / adjustedWPM) * 60;

  // Add padding for pauses
  // - Add 0.3s for each sentence (period, exclamation, question mark)
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0).length;
  duration += sentences * 0.3;

  // - Add 0.15s for each comma or semicolon
  const pauses = (text.match(/[,;]/g) || []).length;
  duration += pauses * 0.15;

  // Add a small buffer for speech processing (0.5s at start and end)
  duration += 1.0;

  // Ensure minimum duration
  duration = Math.max(duration, 1.0);

  console.log(
    `Estimated duration: ${duration.toFixed(2)}s ` +
      `(${wordCount} words at ${adjustedWPM} WPM, ${sentences} sentences, ${pauses} pauses)`,
  );

  return duration;
}

/**
 * Validate and fix segment durations for a video
 * Ensures all segments have valid durations
 */
export function validateSegmentDurations(segments: any[]): boolean {
  let isValid = true;

  segments.forEach((segment, index) => {
    if (
      !segment.duration ||
      segment.duration <= 0 ||
      !isFinite(segment.duration)
    ) {
      console.error(
        `Segment ${index} has invalid duration: ${segment.duration}`,
      );
      isValid = false;

      // Try to fix with estimation
      if (segment.text) {
        segment.duration = estimateAudioDuration(segment.text);
        console.log(
          `Fixed segment ${index} duration to: ${segment.duration.toFixed(2)}s`,
        );
      }
    } else if (segment.duration > 60) {
      console.warn(
        `Segment ${index} has unusually long duration: ${segment.duration.toFixed(2)}s`,
      );
    }
  });

  return isValid;
}
