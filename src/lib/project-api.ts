/**
 * Client-side API utilities for project management
 */

export interface CreateProjectData {
  title: string;
  description?: string;
  idea: string;
  script?: string;
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
  status?: 'draft' | 'script-ready' | 'generating' | 'completed' | 'failed';
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

export interface CreateFileData {
  projectId: string;
  segmentId?: string;
  fileType: 'image' | 'video' | 'audio' | 'overlay';
  fileName: string;
  mimeType: string;
  fileSize: number;
  sourceUrl?: string;
  base64Data?: string;
  metadata?: any;
}

export class ProjectAPI {
  /**
   * Create a new project
   */
  static async createProject(data: CreateProjectData) {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create project');
    }

    return response.json();
  }

  /**
   * Get project by ID
   */
  static async getProject(projectId: string, includeDetails = false) {
    const url = includeDetails 
      ? `/api/projects/${projectId}?include=details`
      : `/api/projects/${projectId}`;
      
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch project');
    }

    return response.json();
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, data: UpdateProjectData) {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update project');
    }

    return response.json();
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete project');
    }

    return response.json();
  }

  /**
   * Get all projects for the current user
   */
  static async getUserProjects() {
    const response = await fetch('/api/projects');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch projects');
    }

    return response.json();
  }

  /**
   * Create multiple segments at once
   */
  static async createSegmentsBatch(projectId: string, segments: CreateSegmentData[]) {
    const response = await fetch(`/api/projects/${projectId}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create segments');
    }

    return response.json();
  }

  /**
   * Create a single segment
   */
  static async createSegment(projectId: string, segment: CreateSegmentData) {
    const response = await fetch(`/api/projects/${projectId}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(segment),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create segment');
    }

    return response.json();
  }

  /**
   * Update segment
   */
  static async updateSegment(projectId: string, segmentId: string, data: Partial<CreateSegmentData>) {
    const response = await fetch(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update segment');
    }

    return response.json();
  }

  /**
   * Get segments for a project
   */
  static async getProjectSegments(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}/segments`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch segments');
    }

    return response.json();
  }

  /**
   * Delete segment
   */
  static async deleteSegment(projectId: string, segmentId: string) {
    const response = await fetch(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete segment');
    }

    return response.json();
  }

  /**
   * Upload file to project
   */
  static async uploadFile(data: CreateFileData) {
    const response = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return response.json();
  }

  /**
   * Get files for a project
   */
  static async getProjectFiles(projectId: string, fileType?: string) {
    const url = new URL('/api/files', window.location.origin);
    url.searchParams.set('projectId', projectId);
    if (fileType) {
      url.searchParams.set('fileType', fileType);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch files');
    }

    return response.json();
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string) {
    const response = await fetch(`/api/files/${fileId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }

    return response.json();
  }
}