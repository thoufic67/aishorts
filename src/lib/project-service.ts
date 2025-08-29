import { db } from '@/db/schema';
import { 
  projects, 
  projectSegments, 
  projectFiles,
  projectLayers,
  projectTracks,
  overlayAssets,
  type Project,
  type NewProject,
  type ProjectSegment,
  type NewProjectSegment,
  type ProjectFile,
  type NewProjectFile,
  type ProjectLayer,
  type NewProjectLayer,
  type ProjectTrack,
  type NewProjectTrack,
  type OverlayAsset,
  type NewOverlayAsset
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { R2Storage } from './r2-storage';

// Types for service operations
export interface CreateProjectData {
  title: string;
  description?: string;
  idea: string;
  scriptStyleId?: string;
  format?: { width: number; height: number };
  settings?: any;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  script?: string;
  scriptStyleId?: string;
  duration?: number;
  status?: string;
  format?: { width: number; height: number };
  settings?: any;
}

export interface CreateSegmentData {
  order: number;
  text: string;
  imagePrompt: string;
  duration?: number;
  audioVolume?: number;
  playBackRate?: number;
  withBlur?: boolean;
  backgroundMinimized?: boolean;
  wordTimings?: any;
}

export interface UpdateSegmentData {
  order?: number;
  text?: string;
  imagePrompt?: string;
  duration?: number;
  audioVolume?: number;
  playBackRate?: number;
  withBlur?: boolean;
  backgroundMinimized?: boolean;
  wordTimings?: any;
}

export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(userId: string, data: CreateProjectData): Promise<Project> {
    try {
      const [project] = await db.insert(projects).values({
        userId,
        title: data.title,
        description: data.description,
        idea: data.idea,
        scriptStyleId: data.scriptStyleId,
        format: data.format,
        settings: data.settings,
      }).returning();

      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * Get a project by ID (with user ownership check)
   */
  static async getProject(projectId: string, userId: string): Promise<Project | null> {
    try {
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

      return project || null;
    } catch (error) {
      console.error('Error getting project:', error);
      throw new Error('Failed to get project');
    }
  }

  /**
   * Get project with all segments and files (with files properly associated to segments)
   */
  static async getProjectWithDetails(projectId: string, userId: string) {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) return null;

      const segments = await this.getProjectSegments(projectId, userId);
      const files = await this.getProjectFiles(projectId, userId);
      const layers = await this.getProjectLayers(projectId, userId);
      const tracks = await this.getProjectTracks(projectId, userId);

      // Associate files with their respective segments and populate imageUrl/audioUrl
      const segmentsWithFiles = await Promise.all(segments.map(async segment => {
        const segmentFiles = files.filter(file => file.segmentId === segment.id);
        
        // Get overlay asset if referenced
        let overlay = null;
        if (segment.overlayId) {
          overlay = await this.getOverlayAsset(segment.overlayId);
        }

        // Find image and audio URLs from files or direct URLs
        const imageFile = segmentFiles.find(f => f.fileType === 'image');
        const audioFile = segmentFiles.find(f => f.fileType === 'audio');
        
        return {
          ...segment,
          files: segmentFiles,
          imageUrl: segment.imageUrl || imageFile?.r2Url || "",
          audioUrl: segment.audioUrl || audioFile?.r2Url || "",
          overlay,
        };
      }));

      // Files not associated with any segment (project-level files)
      const projectFiles = files.filter(file => !file.segmentId);

      return {
        ...project,
        segments: segmentsWithFiles,
        files: projectFiles,
        layers,
        tracks,
      };
    } catch (error) {
      console.error('Error getting project with details:', error);
      throw new Error('Failed to get project details');
    }
  }

  /**
   * Update a project
   */
  static async updateProject(
    projectId: string, 
    userId: string, 
    data: UpdateProjectData
  ): Promise<Project> {
    try {
      // First verify ownership
      const existingProject = await this.getProject(projectId, userId);
      if (!existingProject) {
        throw new Error('Project not found or access denied');
      }

      const [updatedProject] = await db
        .update(projects)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .returning();

      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * Delete a project and all associated data
   */
  static async deleteProject(projectId: string, userId: string): Promise<void> {
    try {
      // First verify ownership
      const existingProject = await this.getProject(projectId, userId);
      if (!existingProject) {
        throw new Error('Project not found or access denied');
      }

      // Delete associated files from R2 storage
      const files = await this.getProjectFiles(projectId, userId);
      for (const file of files) {
        try {
          await R2Storage.deleteFile(file.r2Key);
        } catch (error) {
          console.warn(`Failed to delete R2 file ${file.r2Key}:`, error);
        }
      }

      // Delete project (cascade will handle segments and files)
      await db
        .delete(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * Get all projects for a user
   */
  static async getUserProjects(userId: string): Promise<Project[]> {
    try {
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt));

      return userProjects;
    } catch (error) {
      console.error('Error getting user projects:', error);
      throw new Error('Failed to get user projects');
    }
  }

  // SEGMENT OPERATIONS

  /**
   * Create a new segment
   */
  static async createSegment(
    projectId: string, 
    userId: string, 
    data: CreateSegmentData
  ): Promise<ProjectSegment> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const [segment] = await db.insert(projectSegments).values({
        projectId,
        order: data.order,
        text: data.text,
        imagePrompt: data.imagePrompt,
        duration: data.duration,
        audioVolume: data.audioVolume,
        playBackRate: data.playBackRate,
        withBlur: data.withBlur,
        backgroundMinimized: data.backgroundMinimized,
        wordTimings: data.wordTimings,
      }).returning();

      return segment;
    } catch (error) {
      console.error('Error creating segment:', error);
      throw new Error('Failed to create segment');
    }
  }

  /**
   * Create multiple segments in a batch
   */
  static async createSegmentsBatch(
    projectId: string, 
    userId: string, 
    segmentsData: CreateSegmentData[]
  ): Promise<ProjectSegment[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Prepare all segment data for batch insert
      const segmentValues = segmentsData.map(data => ({
        projectId,
        order: data.order,
        text: data.text,
        imagePrompt: data.imagePrompt,
        duration: data.duration,
        audioVolume: data.audioVolume,
        playBackRate: data.playBackRate,
        withBlur: data.withBlur,
        backgroundMinimized: data.backgroundMinimized,
        wordTimings: data.wordTimings,
      }));

      // Batch insert all segments
      const segments = await db.insert(projectSegments).values(segmentValues).returning();

      return segments;
    } catch (error) {
      console.error('Error creating segments batch:', error);
      throw new Error('Failed to create segments batch');
    }
  }

  /**
   * Get all segments for a project
   */
  static async getProjectSegments(projectId: string, userId: string): Promise<ProjectSegment[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const segments = await db
        .select()
        .from(projectSegments)
        .where(eq(projectSegments.projectId, projectId))
        .orderBy(projectSegments.order);

      return segments;
    } catch (error) {
      console.error('Error getting project segments:', error);
      throw new Error('Failed to get project segments');
    }
  }

  /**
   * Update a segment
   */
  static async updateSegment(
    segmentId: string, 
    userId: string, 
    data: UpdateSegmentData
  ): Promise<ProjectSegment> {
    try {
      // First get the segment to verify project ownership
      const [existingSegment] = await db
        .select({ segment: projectSegments, project: projects })
        .from(projectSegments)
        .innerJoin(projects, eq(projectSegments.projectId, projects.id))
        .where(and(eq(projectSegments.id, segmentId), eq(projects.userId, userId)));

      if (!existingSegment) {
        throw new Error('Segment not found or access denied');
      }

      const [updatedSegment] = await db
        .update(projectSegments)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(projectSegments.id, segmentId))
        .returning();

      return updatedSegment;
    } catch (error) {
      console.error('Error updating segment:', error);
      throw new Error('Failed to update segment');
    }
  }

  /**
   * Delete a segment
   */
  static async deleteSegment(segmentId: string, userId: string): Promise<void> {
    try {
      // First get the segment to verify project ownership
      const [existingSegment] = await db
        .select({ segment: projectSegments, project: projects })
        .from(projectSegments)
        .innerJoin(projects, eq(projectSegments.projectId, projects.id))
        .where(and(eq(projectSegments.id, segmentId), eq(projects.userId, userId)));

      if (!existingSegment) {
        throw new Error('Segment not found or access denied');
      }

      // Delete associated files from R2
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.segmentId, segmentId));

      for (const file of files) {
        try {
          await R2Storage.deleteFile(file.r2Key);
        } catch (error) {
          console.warn(`Failed to delete R2 file ${file.r2Key}:`, error);
        }
      }

      await db.delete(projectSegments).where(eq(projectSegments.id, segmentId));
    } catch (error) {
      console.error('Error deleting segment:', error);
      throw new Error('Failed to delete segment');
    }
  }

  // FILE OPERATIONS

  /**
   * Create a file record
   */
  static async createFile(data: NewProjectFile): Promise<ProjectFile> {
    try {
      const [file] = await db.insert(projectFiles).values(data).returning();
      return file;
    } catch (error) {
      console.error('Error creating file record:', error);
      throw new Error('Failed to create file record');
    }
  }

  /**
   * Link a file to a project
   */
  static async linkFileToProject(fileId: string, projectId: string, userId: string): Promise<void> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      await db
        .update(projectFiles)
        .set({ projectId })
        .where(eq(projectFiles.id, fileId));
    } catch (error) {
      console.error('Error linking file to project:', error);
      throw new Error('Failed to link file to project');
    }
  }

  /**
   * Get all files for a project
   */
  static async getProjectFiles(projectId: string, userId: string): Promise<ProjectFile[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, projectId))
        .orderBy(desc(projectFiles.createdAt));

      return files;
    } catch (error) {
      console.error('Error getting project files:', error);
      throw new Error('Failed to get project files');
    }
  }

  /**
   * Get file by ID with project ownership check
   */
  static async getFile(fileId: string, userId: string): Promise<ProjectFile | null> {
    try {
      const [result] = await db
        .select({ file: projectFiles, project: projects })
        .from(projectFiles)
        .innerJoin(projects, eq(projectFiles.projectId, projects.id))
        .where(and(eq(projectFiles.id, fileId), eq(projects.userId, userId)));

      return result?.file || null;
    } catch (error) {
      console.error('Error getting file:', error);
      throw new Error('Failed to get file');
    }
  }

  /**
   * Update file status
   */
  static async updateFileStatus(
    fileId: string, 
    userId: string, 
    status: 'uploading' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      // Verify ownership first
      const file = await this.getFile(fileId, userId);
      if (!file) {
        throw new Error('File not found or access denied');
      }

      await db
        .update(projectFiles)
        .set({ uploadStatus: status })
        .where(eq(projectFiles.id, fileId));
    } catch (error) {
      console.error('Error updating file status:', error);
      throw new Error('Failed to update file status');
    }
  }

  /**
   * Delete a file record and R2 object
   */
  static async deleteFile(fileId: string, userId: string): Promise<void> {
    try {
      const file = await this.getFile(fileId, userId);
      if (!file) {
        throw new Error('File not found or access denied');
      }

      // Delete from R2
      try {
        await R2Storage.deleteFile(file.r2Key);
      } catch (error) {
        console.warn(`Failed to delete R2 file ${file.r2Key}:`, error);
      }

      // Delete from database
      await db.delete(projectFiles).where(eq(projectFiles.id, fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get project statistics
   */
  static async getProjectStats(projectId: string, userId: string) {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const segments = await this.getProjectSegments(projectId, userId);
      const files = await this.getProjectFiles(projectId, userId);

      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
      const filesByType = files.reduce((acc, file) => {
        acc[file.fileType] = (acc[file.fileType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        segmentCount: segments.length,
        fileCount: files.length,
        totalFileSize: totalSize,
        filesByType,
        status: project.status,
        duration: project.duration,
      };
    } catch (error) {
      console.error('Error getting project stats:', error);
      throw new Error('Failed to get project statistics');
    }
  }

  // ============= LAYER OPERATIONS =============

  /**
   * Get all layers for a project
   */
  static async getProjectLayers(projectId: string, userId: string): Promise<ProjectLayer[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const layers = await db
        .select()
        .from(projectLayers)
        .where(eq(projectLayers.projectId, projectId))
        .orderBy(projectLayers.order);

      return layers;
    } catch (error) {
      console.error('Error getting project layers:', error);
      throw new Error('Failed to get project layers');
    }
  }

  /**
   * Create default layers for a project if none exist
   */
  static async createDefaultLayers(projectId: string, userId: string): Promise<ProjectLayer[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      // Check if layers already exist
      const existingLayers = await this.getProjectLayers(projectId, userId);
      if (existingLayers.length > 0) {
        return existingLayers;
      }

      // Create default captions layer
      const captionsLayer = await db.insert(projectLayers).values({
        projectId,
        type: 'captions',
        captionStyle: {
          fontSize: 75,
          fontFamily: 'Inter',
          activeWordColor: '#FFFFFF',
          inactiveWordColor: '#CCCCCC',
          backgroundColor: 'transparent',
          fontWeight: '700',
          textTransform: 'none',
          textShadow: '.1em .1em .1em #000,.1em -.1em .1em #000,-.1em .1em .1em #000,-.1em -.1em .1em #000,.1em .1em .2em #000,.1em -.1em .2em #000,-.1em .1em .2em #000,-.1em -.1em .2em #000,0 0 .1em #000,0 0 .2em #000,0 0 .3em #000,0 0 .4em #000,0 0 .5em #000,0 0 .6em #000',
          wordAnimation: ['none'],
          showEmojis: true,
          fromBottom: 49,
          wordsPerBatch: 3,
        },
        volume: 0.2,
        order: 0,
      }).returning();

      return captionsLayer;
    } catch (error) {
      console.error('Error creating default layers:', error);
      throw new Error('Failed to create default layers');
    }
  }

  // ============= TRACK OPERATIONS =============

  /**
   * Get all tracks for a project
   */
  static async getProjectTracks(projectId: string, userId: string): Promise<ProjectTrack[]> {
    try {
      // Verify project ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        throw new Error('Project not found or access denied');
      }

      const tracks = await db
        .select()
        .from(projectTracks)
        .where(eq(projectTracks.projectId, projectId))
        .orderBy(projectTracks.order);

      return tracks;
    } catch (error) {
      console.error('Error getting project tracks:', error);
      throw new Error('Failed to get project tracks');
    }
  }

  // ============= OVERLAY ASSET OPERATIONS =============

  /**
   * Get overlay asset by ID
   */
  static async getOverlayAsset(assetId: string): Promise<OverlayAsset | null> {
    try {
      const [asset] = await db
        .select()
        .from(overlayAssets)
        .where(eq(overlayAssets.id, assetId));

      return asset || null;
    } catch (error) {
      console.error('Error getting overlay asset:', error);
      throw new Error('Failed to get overlay asset');
    }
  }

  /**
   * Get all public overlay assets
   */
  static async getPublicOverlayAssets(): Promise<OverlayAsset[]> {
    try {
      const assets = await db
        .select()
        .from(overlayAssets)
        .where(eq(overlayAssets.isPublic, true))
        .orderBy(desc(overlayAssets.createdAt));

      return assets;
    } catch (error) {
      console.error('Error getting public overlay assets:', error);
      throw new Error('Failed to get public overlay assets');
    }
  }

  /**
   * Create overlay asset
   */
  static async createOverlayAsset(data: NewOverlayAsset): Promise<OverlayAsset> {
    try {
      const [asset] = await db.insert(overlayAssets).values(data).returning();
      return asset;
    } catch (error) {
      console.error('Error creating overlay asset:', error);
      throw new Error('Failed to create overlay asset');
    }
  }
}