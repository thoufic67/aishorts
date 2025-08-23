"use client";

interface CachedImage {
  url: string;
  prompt: string;
  model: string;
  style?: string;
  createdAt: number;
  lastUsed: number;
}

interface ImageCacheStorage {
  [hash: string]: CachedImage;
}

export class ImageCacheClient {
  private static CACHE_KEY = "ai_image_cache";
  private static MAX_CACHE_SIZE = 1000; // Maximum number of cached images
  private static CACHE_EXPIRY_DAYS = 30; // Cache expiry in days
  
  /**
   * Generate a hash key for the cache based on prompt, model, and style
   */
  private static async generateCacheKey(
    prompt: string,
    model: string = "flux-schnell",
    style?: string
  ): Promise<string> {
    const content = `${prompt}|${model}|${style || ""}`;
    
    // Use Web Crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Get cached images from localStorage
   */
  private static getCache(): ImageCacheStorage {
    try {
      if (typeof window === 'undefined') return {};
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.warn('Failed to parse image cache:', error);
      return {};
    }
  }
  
  /**
   * Save cache to localStorage
   */
  private static saveCache(cache: ImageCacheStorage): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save image cache:', error);
      // If quota exceeded, try clearing old entries
      this.cleanupCache(true);
    }
  }
  
  /**
   * Check if a cached image exists and is still valid
   */
  static async getCachedImage(
    prompt: string,
    model: string = "flux-schnell",
    style?: string
  ): Promise<string | null> {
    const cache = this.getCache();
    const key = await this.generateCacheKey(prompt, model, style);
    const cached = cache[key];
    
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is expired
    const now = Date.now();
    const expiryTime = cached.createdAt + (this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    if (now > expiryTime) {
      // Remove expired entry
      delete cache[key];
      this.saveCache(cache);
      return null;
    }
    
    // Update last used timestamp
    cached.lastUsed = now;
    cache[key] = cached;
    this.saveCache(cache);
    
    console.log('✓ Retrieved image from cache:', prompt.substring(0, 50) + '...');
    return cached.url;
  }
  
  /**
   * Cache a generated image
   */
  static async cacheImage(
    prompt: string,
    imageUrl: string,
    model: string = "flux-schnell",
    style?: string
  ): Promise<void> {
    const cache = this.getCache();
    const key = await this.generateCacheKey(prompt, model, style);
    const now = Date.now();
    
    // Don't cache if already exists
    if (cache[key]) {
      return;
    }
    
    cache[key] = {
      url: imageUrl,
      prompt,
      model,
      style,
      createdAt: now,
      lastUsed: now
    };
    
    // Cleanup if cache is getting too large
    if (Object.keys(cache).length > this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }
    
    this.saveCache(cache);
    console.log('✓ Cached new image:', prompt.substring(0, 50) + '...');
  }
  
  /**
   * Clean up old or least used cache entries
   */
  private static cleanupCache(aggressive = false): void {
    const cache = this.getCache();
    const now = Date.now();
    const entries = Object.entries(cache);
    
    // Remove expired entries first
    const validEntries = entries.filter(([, cached]) => {
      const expiryTime = cached.createdAt + (this.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      return now <= expiryTime;
    });
    
    // If still too many entries or aggressive cleanup, remove least recently used
    let cleanedEntries = validEntries;
    const targetSize = aggressive ? Math.floor(this.MAX_CACHE_SIZE * 0.7) : this.MAX_CACHE_SIZE;
    
    if (cleanedEntries.length > targetSize) {
      cleanedEntries = validEntries
        .sort((a, b) => b[1].lastUsed - a[1].lastUsed) // Sort by most recently used
        .slice(0, targetSize);
    }
    
    // Rebuild cache
    const cleanedCache: ImageCacheStorage = {};
    cleanedEntries.forEach(([key, cached]) => {
      cleanedCache[key] = cached;
    });
    
    this.saveCache(cleanedCache);
    console.log('✓ Cleaned up image cache, entries:', Object.keys(cleanedCache).length);
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalEntries: number;
    cacheSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const cache = this.getCache();
    const entries = Object.values(cache);
    
    if (entries.length === 0) {
      return { totalEntries: 0, cacheSize: 0 };
    }
    
    const timestamps = entries.map(entry => entry.createdAt);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);
    
    return {
      totalEntries: entries.length,
      cacheSize: JSON.stringify(cache).length,
      oldestEntry: new Date(oldestTimestamp),
      newestEntry: new Date(newestTimestamp)
    };
  }
  
  /**
   * Clear all cached images
   */
  static clearCache(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.CACHE_KEY);
      console.log('✓ Cleared image cache');
    }
  }
  
  /**
   * Check if an image URL is already cached (prevent duplicate caching)
   */
  static isImageCached(imageUrl: string): boolean {
    const cache = this.getCache();
    return Object.values(cache).some(cached => cached.url === imageUrl);
  }
}