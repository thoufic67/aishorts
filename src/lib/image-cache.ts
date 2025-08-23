import crypto from 'crypto';

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

export class ImageCache {
  private static CACHE_KEY = "ai_image_cache";
  private static MAX_CACHE_SIZE = 1000; // Maximum number of cached images
  private static CACHE_EXPIRY_DAYS = 30; // Cache expiry in days
  
  /**
   * Generate a hash key for the cache based on prompt, model, and style
   */
  private static generateCacheKey(
    prompt: string,
    model: string = "flux-schnell",
    style?: string
  ): string {
    const content = `${prompt}|${model}|${style || ""}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Get cached images from localStorage
   */
  private static getCache(): ImageCacheStorage {
    try {
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
  static getCachedImage(
    prompt: string,
    model: string = "flux-schnell",
    style?: string
  ): string | null {
    const cache = this.getCache();
    const key = this.generateCacheKey(prompt, model, style);
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
    
    return cached.url;
  }
  
  /**
   * Cache a generated image
   */
  static cacheImage(
    prompt: string,
    imageUrl: string,
    model: string = "flux-schnell",
    style?: string
  ): void {
    const cache = this.getCache();
    const key = this.generateCacheKey(prompt, model, style);
    const now = Date.now();
    
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
    localStorage.removeItem(this.CACHE_KEY);
  }
  
  /**
   * Check if an image URL is already cached (prevent duplicate caching)
   */
  static isImageCached(imageUrl: string): boolean {
    const cache = this.getCache();
    return Object.values(cache).some(cached => cached.url === imageUrl);
  }
}