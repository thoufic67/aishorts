/**
 * Get the duration of an audio file from its URL
 */
export function getAudioDuration(audioUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      reject(new Error('Audio API not available (server-side)'));
      return;
    }

    const audio = new Audio();
    let hasResolved = false;
    
    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };

    const onLoadedMetadata = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        resolve(audio.duration);
      } else {
        reject(new Error('Invalid audio duration'));
      }
    };
    
    const onError = (e: Event) => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      reject(new Error(`Failed to load audio: ${e.type}`));
    };
    
    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();
      reject(new Error('Audio loading timeout'));
    }, 15000); // 15 second timeout
    
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);
    
    // Ensure the URL is absolute for better compatibility
    if (audioUrl.startsWith('/')) {
      audioUrl = `${window.location.origin}${audioUrl}`;
    }
    
    audio.crossOrigin = 'anonymous'; // Handle CORS if needed
    audio.src = audioUrl;
    audio.load();
  });
}

/**
 * Estimate audio duration based on text (fallback method)
 * @param text The text content
 * @param wordsPerMinute Average speaking rate (default: 150 WPM)
 */
export function estimateAudioDuration(text: string, wordsPerMinute: number = 150): number {
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  return (wordCount / wordsPerMinute) * 60;
}