import { ProjectService } from './project-service';
import { R2Storage } from './r2-storage';
import { FileUtils } from './file-utils';

// Types matching the localStorage structure
export interface VideoSegmentData {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  order: number;
}

export interface ProjectData {
  id: string;
  title: string;
  idea: string;
  inspirationUrls: string;
  script: string;
  transcripts: string[];
  scriptLines: string[];
  generatedImages: { [key: number]: string };
  generatedVideos: { [key: number]: string };
  segments?: VideoSegmentData[];
  createdAt: number;
  updatedAt: number;
}

export class MigrationUtils {
  private static PROJECTS_KEY = "ai_video_projects";
  private static CURRENT_PROJECT_KEY = "current_project_id";

  /**
   * Read localStorage data (client-side only)
   */
  static getLocalStorageProjects(): { [key: string]: ProjectData } {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is only available in the browser');
    }
    
    const stored = localStorage.getItem(this.PROJECTS_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  /**
   * Migrate a single project from localStorage to database
   */
  static async migrateProject(
    localProject: ProjectData, 
    userId: string,
    uploadToR2: boolean = true
  ): Promise<{
    success: boolean;
    projectId?: string;
    segmentCount?: number;
    fileCount?: number;
    error?: string;
  }> {
    try {
      console.log(`Migrating project: ${localProject.title}`);

      // Create the main project
      const dbProject = await ProjectService.createProject(userId, {
        title: localProject.title,
        description: localProject.inspirationUrls || undefined,
        idea: localProject.idea,
        scriptStyleId: undefined, // LocalStorage doesn't have this
        format: { width: 1080, height: 1920 }, // Default format
        settings: {
          originalId: localProject.id,
          migratedAt: new Date().toISOString(),
          script: localProject.script,
          transcripts: localProject.transcripts,
          scriptLines: localProject.scriptLines,
        },
      });

      // Update with script if available
      if (localProject.script) {
        await ProjectService.updateProject(dbProject.id, userId, {
          script: localProject.script,
          status: 'script-ready',
        });
      }

      let segmentCount = 0;
      let fileCount = 0;

      // Migrate segments
      if (localProject.segments && localProject.segments.length > 0) {
        for (let i = 0; i < localProject.segments.length; i++) {
          const segment = localProject.segments[i];
          
          // Create segment
          const dbSegment = await ProjectService.createSegment(
            dbProject.id,
            userId,
            {
              order: segment.order !== undefined ? segment.order : i,
              text: segment.text,
              imagePrompt: segment.imagePrompt,
              duration: segment.duration,
              audioVolume: 1.0,
              playBackRate: 1.0,
              withBlur: false,
              backgroundMinimized: false,
            }
          );

          segmentCount++;

          // Migrate segment image if available
          if (segment.imageUrl && uploadToR2) {
            try {
              const imageFile = await this.migrateUrlToR2(
                segment.imageUrl,
                userId,
                dbProject.id,
                dbSegment.id,
                'image',
                `segment-${i}-image.jpg`
              );
              
              if (imageFile) {
                fileCount++;
              }
            } catch (error) {
              console.warn(`Failed to migrate image for segment ${i}:`, error);
            }
          }

          // Migrate segment audio if available
          if (segment.audioUrl && uploadToR2) {
            try {
              const audioFile = await this.migrateUrlToR2(
                segment.audioUrl,
                userId,
                dbProject.id,
                dbSegment.id,
                'audio',
                `segment-${i}-audio.mp3`
              );
              
              if (audioFile) {
                fileCount++;
              }
            } catch (error) {
              console.warn(`Failed to migrate audio for segment ${i}:`, error);
            }
          }
        }
      }

      // Migrate standalone generated images
      if (localProject.generatedImages && uploadToR2) {
        for (const [lineIndex, imageUrl] of Object.entries(localProject.generatedImages)) {
          try {
            const imageFile = await this.migrateUrlToR2(
              imageUrl,
              userId,
              dbProject.id,
              undefined,
              'image',
              `generated-image-${lineIndex}.jpg`
            );
            
            if (imageFile) {
              fileCount++;
            }
          } catch (error) {
            console.warn(`Failed to migrate generated image ${lineIndex}:`, error);
          }
        }
      }

      // Migrate standalone generated videos
      if (localProject.generatedVideos && uploadToR2) {
        for (const [lineIndex, videoUrl] of Object.entries(localProject.generatedVideos)) {
          try {
            const videoFile = await this.migrateUrlToR2(
              videoUrl,
              userId,
              dbProject.id,
              undefined,
              'video',
              `generated-video-${lineIndex}.mp4`
            );
            
            if (videoFile) {
              fileCount++;
            }
          } catch (error) {
            console.warn(`Failed to migrate generated video ${lineIndex}:`, error);
          }
        }
      }

      return {
        success: true,
        projectId: dbProject.id,
        segmentCount,
        fileCount,
      };

    } catch (error) {
      console.error('Error migrating project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Migrate URL-based files to R2 storage
   */
  private static async migrateUrlToR2(
    url: string,
    userId: string,
    projectId: string,
    segmentId: string | undefined,
    fileType: 'image' | 'video' | 'audio' | 'overlay',
    fileName: string
  ): Promise<any> {
    try {
      // Skip if URL is already an R2 URL
      if (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com')) {
        console.log(`Skipping R2 URL: ${url}`);
        return null;
      }

      // Check if this is a local file path (starts with / or contains /temp/)
      if (url.startsWith('/') || url.includes('/temp/')) {
        return await this.migrateLocalFileToR2(url, userId, projectId, segmentId, fileType, fileName);
      }

      // Upload URL to R2
      const uploadResult = await R2Storage.uploadFromUrl(
        url,
        userId,
        projectId,
        fileType,
        segmentId
      );

      // Determine file size and MIME type
      let mimeType = 'application/octet-stream';
      let fileSize = 1024 * 1024; // Default 1MB

      if (fileType === 'image') {
        mimeType = 'image/jpeg';
        fileSize = 2 * 1024 * 1024; // 2MB for images
      } else if (fileType === 'video') {
        mimeType = 'video/mp4';
        fileSize = 10 * 1024 * 1024; // 10MB for videos
      } else if (fileType === 'audio') {
        mimeType = 'audio/mpeg';
        fileSize = 5 * 1024 * 1024; // 5MB for audio
      }

      // Create file record
      const fileRecord = await ProjectService.createFile({
        projectId,
        segmentId: segmentId || null,
        fileType,
        fileName: FileUtils.sanitizeFilename(fileName),
        originalName: fileName,
        mimeType,
        fileSize,
        r2Key: uploadResult.key,
        r2Url: uploadResult.url,
        tempUrl: url, // Keep original URL as temp
        uploadStatus: 'completed',
        metadata: {
          migratedFrom: url,
          migratedAt: new Date().toISOString(),
        },
      });

      return fileRecord;
    } catch (error) {
      console.error(`Failed to migrate file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Migrate local file to R2 storage (client-side only)
   */
  private static async migrateLocalFileToR2(
    filePath: string,
    userId: string,
    projectId: string,
    segmentId: string | undefined,
    fileType: 'image' | 'video' | 'audio' | 'overlay',
    fileName: string
  ): Promise<any> {
    try {
      // This only works in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Local file migration is only available in the browser');
      }

      // Try to fetch the file from the local path
      // This assumes the file is accessible via the web server (e.g., in public directory)
      let fileUrl = filePath;
      
      // Convert absolute path to relative public path if needed
      if (filePath.startsWith('/temp/')) {
        // Files in /temp/ are typically served from public/temp/
        fileUrl = filePath; // Keep as is since Next.js serves public files from root
      }

      // Try to fetch the file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`File not accessible: ${filePath} (Status: ${response.status})`);
      }

      // Get file as blob
      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());

      // Determine content type
      let contentType = blob.type || 'application/octet-stream';
      if (fileType === 'audio') {
        contentType = 'audio/mpeg'; // Default to MP3
        if (filePath.includes('.wav')) contentType = 'audio/wav';
        if (filePath.includes('.m4a')) contentType = 'audio/mp4';
      } else if (fileType === 'image') {
        contentType = 'image/jpeg'; // Default to JPEG
        if (filePath.includes('.png')) contentType = 'image/png';
        if (filePath.includes('.webp')) contentType = 'image/webp';
      } else if (fileType === 'video') {
        contentType = 'video/mp4'; // Default to MP4
        if (filePath.includes('.webm')) contentType = 'video/webm';
      }

      // Generate unique filename with proper extension
      const fileExtension = this.getFileExtension(contentType, filePath);
      const uniqueFileName = `${fileName.replace(/\.[^/.]+$/, '')}.${fileExtension}`;

      // Create organized folder structure
      const folderPath = segmentId 
        ? `${userId}/${projectId}/${segmentId}/${fileType}`
        : `${userId}/${projectId}/${fileType}`;
      
      const key = `${folderPath}/${crypto.randomUUID()}.${fileExtension}`;

      // Upload to R2
      const url = await R2Storage.uploadFile(buffer, key, contentType);

      // Create file record
      const fileRecord = await ProjectService.createFile({
        projectId,
        segmentId,
        fileType,
        fileName: uniqueFileName,
        originalName: fileName,
        mimeType: contentType,
        fileSize: buffer.length,
        r2Key: key,
        r2Url: url,
        tempUrl: filePath, // Store original path for reference
        uploadStatus: 'completed',
        metadata: {
          originalPath: filePath,
          migratedAt: new Date().toISOString(),
        },
      });

      console.log(`✅ Local file migrated: ${filePath} → ${url}`);
      return fileRecord;
    } catch (error) {
      console.error(`Failed to migrate local file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Get file extension from content type or file path
   */
  private static getFileExtension(contentType: string, filePath: string): string {
    // Try to get from file path first
    const pathExtension = filePath.split('.').pop()?.toLowerCase();
    if (pathExtension && ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(pathExtension)) {
      return pathExtension;
    }

    // Fallback to content type mapping
    const typeMap: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/mp4': 'm4a',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    
    return typeMap[contentType] || 'bin';
  }

  /**
   * Migrate all localStorage projects to database
   */
  static async migrateAllProjects(
    userId: string,
    uploadToR2: boolean = true,
    onProgress?: (current: number, total: number, projectTitle: string) => void
  ): Promise<{
    success: boolean;
    totalProjects: number;
    migratedProjects: number;
    failedProjects: string[];
    totalSegments: number;
    totalFiles: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      totalProjects: 0,
      migratedProjects: 0,
      failedProjects: [] as string[],
      totalSegments: 0,
      totalFiles: 0,
      errors: [] as string[],
    };

    try {
      const localProjects = this.getLocalStorageProjects();
      const projectIds = Object.keys(localProjects);
      result.totalProjects = projectIds.length;

      console.log(`Starting migration of ${result.totalProjects} projects`);

      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const project = localProjects[projectId];

        onProgress?.(i + 1, result.totalProjects, project.title);

        const migrationResult = await this.migrateProject(project, userId, uploadToR2);

        if (migrationResult.success) {
          result.migratedProjects++;
          result.totalSegments += migrationResult.segmentCount || 0;
          result.totalFiles += migrationResult.fileCount || 0;
          console.log(`✅ Migrated: ${project.title}`);
        } else {
          result.failedProjects.push(project.title);
          result.errors.push(`${project.title}: ${migrationResult.error}`);
          console.error(`❌ Failed: ${project.title} - ${migrationResult.error}`);
        }
      }

      result.success = result.migratedProjects > 0;

      console.log(`Migration complete: ${result.migratedProjects}/${result.totalProjects} projects migrated`);
      console.log(`Total segments: ${result.totalSegments}`);
      console.log(`Total files: ${result.totalFiles}`);

      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Clear localStorage after successful migration
   */
  static clearLocalStorage(): void {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is only available in the browser');
    }

    localStorage.removeItem(this.PROJECTS_KEY);
    localStorage.removeItem(this.CURRENT_PROJECT_KEY);
    console.log('✅ LocalStorage cleared');
  }

  /**
   * Backup localStorage data to JSON
   */
  static exportLocalStorageData(): string {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is only available in the browser');
    }

    const projects = this.getLocalStorageProjects();
    const currentProjectId = localStorage.getItem(this.CURRENT_PROJECT_KEY);

    const backup = {
      projects,
      currentProjectId,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Get migration statistics without actually migrating
   */
  static getMigrationStats(): {
    totalProjects: number;
    totalSegments: number;
    totalImages: number;
    totalVideos: number;
    estimatedFiles: number;
  } {
    if (typeof window === 'undefined') {
      throw new Error('localStorage is only available in the browser');
    }

    const projects = this.getLocalStorageProjects();
    let totalSegments = 0;
    let totalImages = 0;
    let totalVideos = 0;

    Object.values(projects).forEach(project => {
      if (project.segments) {
        totalSegments += project.segments.length;
        totalImages += project.segments.filter(s => s.imageUrl).length;
        totalVideos += project.segments.filter(s => s.audioUrl).length; // audioUrl counts as video content
      }
      
      totalImages += Object.keys(project.generatedImages || {}).length;
      totalVideos += Object.keys(project.generatedVideos || {}).length;
    });

    return {
      totalProjects: Object.keys(projects).length,
      totalSegments,
      totalImages,
      totalVideos,
      estimatedFiles: totalImages + totalVideos,
    };
  }
}