/**
 * Client-side API utilities for project management
 * This is a legacy wrapper around ApiClient for backward compatibility
 */

import { ApiClient } from './api-client';

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
    const project = await ApiClient.createProject(data);
    return { data: project, success: true };
  }

  /**
   * Get project by ID
   */
  static async getProject(projectId: string, includeDetails = false) {
    const project = await ApiClient.getProject(projectId);
    return { data: project, success: true };
  }

  /**
   * Update project
   */
  static async updateProject(projectId: string, data: UpdateProjectData) {
    const project = await ApiClient.updateProject(projectId, data);
    return { data: project, success: true };
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string) {
    await ApiClient.deleteProject(projectId);
    return { success: true };
  }

  /**
   * Get all projects for the current user
   */
  static async getUserProjects() {
    const projects = await ApiClient.getUserProjects();
    return { data: projects, success: true };
  }

  /**
   * Create multiple segments at once
   */
  static async createSegmentsBatch(projectId: string, segments: CreateSegmentData[]) {
    // Since ApiClient doesn't have batch create, create them individually
    const results = await Promise.all(
      segments.map(segment => ApiClient.createSegment(projectId, segment))
    );
    return { data: results, success: true };
  }

  /**
   * Create a single segment
   */
  static async createSegment(projectId: string, segment: CreateSegmentData) {
    const result = await ApiClient.createSegment(projectId, segment);
    return { data: result, success: true };
  }

  /**
   * Update segment
   */
  static async updateSegment(projectId: string, segmentId: string, data: Partial<CreateSegmentData>) {
    const result = await ApiClient.updateSegment(projectId, segmentId, data);
    return { data: result, success: true };
  }

  /**
   * Get segments for a project
   */
  static async getProjectSegments(projectId: string) {
    const segments = await ApiClient.getProjectSegments(projectId);
    return { data: segments, success: true };
  }

  /**
   * Delete segment
   */
  static async deleteSegment(projectId: string, segmentId: string) {
    await ApiClient.deleteSegment(projectId, segmentId);
    return { success: true };
  }

  /**
   * Upload file to project via URL (legacy method for external URLs)
   */
  static async uploadFile(data: CreateFileData) {
    // This is a legacy method that uploads files by downloading from URLs
    // For modern file uploads, use ApiClient.uploadFile or ApiClient.uploadBase64File directly
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
    const files = await ApiClient.getProjectFiles(projectId);
    const filteredFiles = fileType ? files.filter(f => f.fileType === fileType) : files;
    return { data: filteredFiles, success: true };
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string) {
    await ApiClient.deleteFile(fileId);
    return { success: true };
  }
}