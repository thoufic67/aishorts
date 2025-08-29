/**
 * ProjectClient - Database-backed replacement for ProjectStorage
 * Maintains the same interface for backward compatibility while using API calls
 */

import { ApiClient } from './api-client';
import {
  Project,
  ProjectWithDetails,
  ProjectSegment,
  ProjectFile,
  CreateProjectData,
  UpdateProjectData,
  CreateSegmentData,
  UpdateSegmentData,
  LegacyProjectData,
  migrateLegacyProject,
  ApiError,
} from '@/types/project';

// Legacy compatibility interface
export interface VideoSegmentData {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  order: number;
}

export interface ProjectData extends LegacyProjectData {}

interface ProjectClientCache {
  projects: Map<string, ProjectWithDetails>;
  lastFetch: number;
  cacheDuration: number; // 5 minutes
}

export class ProjectClient {
  private static cache: ProjectClientCache = {
    projects: new Map(),
    lastFetch: 0,
    cacheDuration: 5 * 60 * 1000, // 5 minutes
  };

  private static currentProjectId: string | null = null;

  /**
   * Generate a project ID (for compatibility)
   */
  static generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new project
   */
  static async createProject(idea: string, title?: string): Promise<Project> {
    const projectData: CreateProjectData = {
      idea,
      title: title || `Video Project ${new Date().toLocaleDateString()}`,
    };

    try {
      const project = await ApiClient.createProject(projectData);
      
      // Convert to ProjectWithDetails format for cache
      const projectWithDetails: ProjectWithDetails = {
        ...project,
        segments: [],
        files: [],
        layers: [],
        tracks: []
      };
      
      // Update cache
      this.cache.projects.set(project.id, projectWithDetails);
      
      // Set as current project
      this.setCurrentProject(project.id);
      
      return projectWithDetails;
    } catch (error) {
      console.error('Failed to create project:', error);
      
      // Fallback to localStorage for offline mode
      const fallbackProject = this.createProjectOffline(idea, title);
      return fallbackProject;
    }
  }

  /**
   * Get a project by ID
   */
  static async getProject(projectId: string): Promise<ProjectWithDetails | null> {
    try {
      // Check cache first
      const cached = this.cache.projects.get(projectId);
      if (cached && this.isCacheValid()) {
        return cached;
      }

      const project = await ApiClient.getProject(projectId);
      
      // Update cache
      this.cache.projects.set(projectId, project);
      
      return project;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      
      console.error('Failed to get project:', error);
      
      // Fallback to localStorage
      const fallbackProject = this.getProjectOffline(projectId);
      return fallbackProject;
    }
  }

  /**
   * Update a project
   */
  static async updateProject(projectId: string, data: Partial<Project>): Promise<void> {
    try {
      const updateData: UpdateProjectData = {
        title: data.title,
        description: data.description,
        script: data.script,
        scriptStyleId: data.scriptStyleId,
        duration: data.duration,
        status: data.status,
        format: data.format,
        settings: data.settings,
      };

      const updatedProject = await ApiClient.updateProject(projectId, updateData);
      
      // Update cache - convert to ProjectWithDetails
      const projectWithDetails: ProjectWithDetails = {
        ...updatedProject,
        segments: (updatedProject.segments || []).map(segment => ({ ...segment, files: [] })),
        files: updatedProject.files || [],
        layers: [],
        tracks: []
      };
      this.cache.projects.set(projectId, projectWithDetails);
    } catch (error) {
      console.error('Failed to update project:', error);
      
      // Fallback to localStorage
      this.updateProjectOffline(projectId, data);
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<void> {
    try {
      await ApiClient.deleteProject(projectId);
      
      // Remove from cache
      this.cache.projects.delete(projectId);
      
      // Clear current project if it was the deleted one
      if (this.currentProjectId === projectId) {
        this.currentProjectId = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('current_project_id');
        }
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      
      // Fallback to localStorage
      this.deleteProjectOffline(projectId);
    }
  }

  /**
   * Get all projects for the current user
   */
  static async getUserProjects(): Promise<Project[]> {
    try {
      // Check cache first
      if (this.isCacheValid() && this.cache.projects.size > 0) {
        return Array.from(this.cache.projects.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      }

      const projects = await ApiClient.getUserProjects();
      
      // Update cache - convert Project to ProjectWithDetails
      this.cache.projects.clear();
      projects.forEach(project => {
        const projectWithDetails: ProjectWithDetails = {
          ...project,
          segments: (project.segments || []).map(segment => ({ ...segment, files: [] })),
          files: project.files || [],
          layers: [],
          tracks: []
        };
        this.cache.projects.set(project.id, projectWithDetails);
      });
      this.cache.lastFetch = Date.now();
      
      return projects.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to get user projects:', error);
      
      // Fallback to localStorage
      const fallbackProjects = this.getProjectsListOffline();
      return fallbackProjects;
    }
  }

  /**
   * Set current project ID
   */
  static setCurrentProject(projectId: string): void {
    this.currentProjectId = projectId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('current_project_id', projectId);
    }
  }

  /**
   * Get current project ID
   */
  static getCurrentProjectId(): string | null {
    if (this.currentProjectId) {
      return this.currentProjectId;
    }
    
    if (typeof window !== 'undefined') {
      this.currentProjectId = localStorage.getItem('current_project_id');
    }
    
    return this.currentProjectId;
  }

  /**
   * Get projects list (for compatibility)
   */
  static async getProjectsList(): Promise<Project[]> {
    return this.getUserProjects();
  }

  /**
   * Update a specific field of a project
   */
  static async updateProjectField(
    projectId: string,
    field: keyof Project,
    value: any
  ): Promise<void> {
    const updateData: any = {};
    updateData[field] = value;
    return this.updateProject(projectId, updateData);
  }

  // ============= SEGMENT MANAGEMENT =============

  /**
   * Update segments for a project
   */
  static async updateSegments(
    projectId: string,
    segments: VideoSegmentData[]
  ): Promise<void> {
    try {
      // Get current project to see existing segments
      const project = await this.getProject(projectId);
      if (!project) return;

      // Convert legacy segment data to new format
      const segmentPromises = segments.map(async (segment, index) => {
        const segmentData: CreateSegmentData = {
          order: segment.order || index,
          text: segment.text,
          imagePrompt: segment.imagePrompt,
          duration: segment.duration,
          audioVolume: 1.0,
          playBackRate: 1.0,
          withBlur: false,
          backgroundMinimized: false,
        };

        // Create or update segment
        if (project.segments && project.segments[index]) {
          const existingSegment = project.segments[index];
          return ApiClient.updateSegment(projectId, existingSegment.id, segmentData);
        } else {
          return ApiClient.createSegment(projectId, segmentData);
        }
      });

      await Promise.all(segmentPromises);
      
      // Refresh project in cache
      this.cache.projects.delete(projectId);
    } catch (error) {
      console.error('Failed to update segments:', error);
      
      // Fallback to localStorage
      this.updateSegmentsOffline(projectId, segments);
    }
  }

  /**
   * Create a single segment
   */
  static async createSegment(
    projectId: string,
    data: CreateSegmentData
  ): Promise<ProjectSegment> {
    try {
      const segment = await ApiClient.createSegment(projectId, data);
      
      // Invalidate project cache
      this.cache.projects.delete(projectId);
      
      return segment;
    } catch (error) {
      console.error('Failed to create segment:', error);
      throw error;
    }
  }

  /**
   * Update a segment
   */
  static async updateSegment(
    projectId: string,
    segmentId: string,
    data: UpdateSegmentData
  ): Promise<ProjectSegment> {
    try {
      const segment = await ApiClient.updateSegment(projectId, segmentId, data);
      
      // Invalidate project cache
      this.cache.projects.delete(projectId);
      
      return segment;
    } catch (error) {
      console.error('Failed to update segment:', error);
      throw error;
    }
  }

  // ============= LEGACY IMAGE/VIDEO MANAGEMENT =============

  /**
   * Update generated image (legacy compatibility)
   */
  static async updateGeneratedImage(
    projectId: string,
    lineIndex: number,
    imageUrl: string
  ): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project || !project.segments || !project.segments[lineIndex]) {
        return;
      }

      const segment = project.segments[lineIndex];
      
      // If this is a base64 data URL, upload it as a file
      if (imageUrl.startsWith('data:')) {
        const file = await ApiClient.uploadBase64File(
          imageUrl,
          `generated_image_${lineIndex}.png`,
          'image',
          projectId,
          segment.id
        );
        // The segment will be automatically associated with the file
      } else {
        // For external URLs, we might want to store them as metadata
        await this.updateSegment(projectId, segment.id, {
          // Store URL in metadata or handle differently based on requirements
        });
      }
    } catch (error) {
      console.error('Failed to update generated image:', error);
      
      // Fallback to localStorage
      this.updateGeneratedImageOffline(projectId, lineIndex, imageUrl);
    }
  }

  /**
   * Update generated video (legacy compatibility)
   */
  static async updateGeneratedVideo(
    projectId: string,
    lineIndex: number,
    videoUrl: string
  ): Promise<void> {
    try {
      // Similar logic to updateGeneratedImage but for video files
      const project = await this.getProject(projectId);
      if (!project || !project.segments || !project.segments[lineIndex]) {
        return;
      }

      // Handle video file upload/association
      // Implementation depends on how videos are handled in the new system
    } catch (error) {
      console.error('Failed to update generated video:', error);
      
      // Fallback to localStorage
      this.updateGeneratedVideoOffline(projectId, lineIndex, videoUrl);
    }
  }

  /**
   * Update segment image
   */
  static async updateSegmentImage(
    projectId: string,
    segmentIndex: number,
    imageUrl: string
  ): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project || !project.segments || !project.segments[segmentIndex]) {
      return;
    }

    const segment = project.segments[segmentIndex];

    if (imageUrl.startsWith('data:')) {
      await ApiClient.uploadBase64File(
        imageUrl,
        `segment_image_${segmentIndex}.png`,
        'image',
        projectId,
        segment.id
      );
    }
  }

  /**
   * Update segment audio
   */
  static async updateSegmentAudio(
    projectId: string,
    segmentIndex: number,
    audioUrl: string,
    duration?: number
  ): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project || !project.segments || !project.segments[segmentIndex]) {
      return;
    }

    const segment = project.segments[segmentIndex];

    // Update segment with duration if provided
    if (duration) {
      await this.updateSegment(projectId, segment.id, { duration });
    }

    if (audioUrl.startsWith('data:')) {
      await ApiClient.uploadBase64File(
        audioUrl,
        `segment_audio_${segmentIndex}.mp3`,
        'audio',
        projectId,
        segment.id
      );
    }
  }

  // ============= CACHE MANAGEMENT =============

  /**
   * Check if cache is valid
   */
  private static isCacheValid(): boolean {
    return Date.now() - this.cache.lastFetch < this.cache.cacheDuration;
  }

  /**
   * Clear cache
   */
  static clearCache(): void {
    this.cache.projects.clear();
    this.cache.lastFetch = 0;
  }

  /**
   * Force refresh cache
   */
  static async refreshCache(): Promise<void> {
    this.clearCache();
    await this.getUserProjects();
  }

  // ============= OFFLINE FALLBACK METHODS =============

  private static createProjectOffline(idea: string, title?: string): ProjectWithDetails {
    if (typeof window === 'undefined') {
      throw new Error('Cannot create offline project on server');
    }

    // Use old ProjectStorage logic as fallback
    const projectId = this.generateProjectId();
    const now = Date.now();
    
    const legacyProject: LegacyProjectData = {
      id: projectId,
      title: title || `Video Project ${new Date().toLocaleDateString()}`,
      idea,
      inspirationUrls: '',
      script: '',
      transcripts: [],
      scriptLines: [],
      generatedImages: {},
      generatedVideos: {},
      segments: [],
      createdAt: now,
      updatedAt: now,
    };

    // Store in localStorage
    const projects = this.getAllOfflineProjects();
    projects[projectId] = legacyProject;
    localStorage.setItem('ai_video_projects', JSON.stringify(projects));

    const migratedProject = migrateLegacyProject(legacyProject) as Project;
    return {
      ...migratedProject,
      segments: (migratedProject.segments || []).map(segment => ({ ...segment, files: [] })),
      files: [],
      layers: [],
      tracks: []
    } as ProjectWithDetails;
  }

  private static getProjectOffline(projectId: string): ProjectWithDetails | null {
    if (typeof window === 'undefined') return null;

    const projects = this.getAllOfflineProjects();
    const legacyProject = projects[projectId];
    
    if (!legacyProject) return null;
    
    const migratedProject = migrateLegacyProject(legacyProject) as Project;
    return {
      ...migratedProject,
      segments: (migratedProject.segments || []).map(segment => ({ ...segment, files: [] })),
      files: [],
      layers: [],
      tracks: []
    } as ProjectWithDetails;
  }

  private static updateProjectOffline(projectId: string, data: Partial<Project>): void {
    if (typeof window === 'undefined') return;

    const projects = this.getAllOfflineProjects();
    const project = projects[projectId];
    
    if (project) {
      // Update fields
      if (data.title) project.title = data.title;
      if (data.script) project.script = data.script;
      // Add other field updates as needed
      
      project.updatedAt = Date.now();
      projects[projectId] = project;
      localStorage.setItem('ai_video_projects', JSON.stringify(projects));
    }
  }

  private static deleteProjectOffline(projectId: string): void {
    if (typeof window === 'undefined') return;

    const projects = this.getAllOfflineProjects();
    delete projects[projectId];
    localStorage.setItem('ai_video_projects', JSON.stringify(projects));
  }

  private static getProjectsListOffline(): Project[] {
    if (typeof window === 'undefined') return [];

    const projects = this.getAllOfflineProjects();
    return Object.values(projects)
      .map(migrateLegacyProject)
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()) as Project[];
  }

  private static getAllOfflineProjects(): { [key: string]: LegacyProjectData } {
    if (typeof window === 'undefined') return {};

    const stored = localStorage.getItem('ai_video_projects');
    return stored ? JSON.parse(stored) : {};
  }

  private static updateSegmentsOffline(
    projectId: string,
    segments: VideoSegmentData[]
  ): void {
    if (typeof window === 'undefined') return;

    const projects = this.getAllOfflineProjects();
    const project = projects[projectId];
    
    if (project) {
      project.segments = segments;
      project.updatedAt = Date.now();
      projects[projectId] = project;
      localStorage.setItem('ai_video_projects', JSON.stringify(projects));
    }
  }

  private static updateGeneratedImageOffline(
    projectId: string,
    lineIndex: number,
    imageUrl: string
  ): void {
    if (typeof window === 'undefined') return;

    const projects = this.getAllOfflineProjects();
    const project = projects[projectId];
    
    if (project) {
      project.generatedImages[lineIndex] = imageUrl;
      project.updatedAt = Date.now();
      projects[projectId] = project;
      localStorage.setItem('ai_video_projects', JSON.stringify(projects));
    }
  }

  private static updateGeneratedVideoOffline(
    projectId: string,
    lineIndex: number,
    videoUrl: string
  ): void {
    if (typeof window === 'undefined') return;

    const projects = this.getAllOfflineProjects();
    const project = projects[projectId];
    
    if (project) {
      project.generatedVideos[lineIndex] = videoUrl;
      project.updatedAt = Date.now();
      projects[projectId] = project;
      localStorage.setItem('ai_video_projects', JSON.stringify(projects));
    }
  }
}

// Backward compatibility - export the same interface
export { ProjectClient as ProjectStorage };