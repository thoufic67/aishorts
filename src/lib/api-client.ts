/**
 * Centralized API Client for backend communication
 * Handles authentication, error handling, and retry logic
 */

import {
  Project,
  ProjectSegment,
  ProjectFile,
  CreateProjectData,
  UpdateProjectData,
  CreateSegmentData,
  UpdateSegmentData,
  CreateFileData,
  ApiResponse,
  ApiListResponse,
  ApiError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  FileUploadOptions,
  FileUploadProgress,
} from '@/types/project';

// Configuration constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: HeadersInit;
  body?: any;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: number;
}

export class ApiClient {
  private static baseUrl = API_BASE_URL;
  private static defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  /**
   * Generic HTTP request method with retry logic and error handling
   */
  private static async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      signal,
    } = config;

    const url = `${this.baseUrl}${endpoint}`;
    const mergedHeaders = { ...this.defaultHeaders, ...headers };

    // Create abort controller for timeout if no signal provided
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const requestSignal = signal || controller.signal;

    const requestConfig: RequestInit = {
      method,
      headers: mergedHeaders,
      signal: requestSignal,
    };

    // Add body for non-GET requests
    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        // Remove content-type header for FormData (browser will set it with boundary)
        delete (requestConfig.headers as any)['Content-Type'];
        requestConfig.body = body;
      } else {
        requestConfig.body = JSON.stringify(body);
      }
    }

    let lastError: Error;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, requestConfig);
        clearTimeout(timeoutId);

        if (!response.ok) {
          await this.handleHttpError(response);
        }

        // Parse JSON response
        const data: ApiResponse<T> = await response.json();
        
        if (!data.success) {
          throw new ApiError(data.error || 'API request failed', response.status);
        }

        return data.data as T;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // Don't retry on certain errors
        if (
          error instanceof ValidationError ||
          error instanceof UnauthorizedError ||
          error instanceof NotFoundError ||
          requestSignal.aborted
        ) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === retries) {
          throw lastError;
        }

        // Wait before retry with exponential backoff
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Handle HTTP error responses
   */
  private static async handleHttpError(response: Response): Promise<never> {
    let errorData: any = {};
    
    try {
      errorData = await response.json();
    } catch {
      // If can't parse JSON, use status text
      errorData = { error: response.statusText };
    }

    const message = errorData.error || errorData.message || 'Request failed';

    switch (response.status) {
      case 400:
        throw new ValidationError(message);
      case 401:
        throw new UnauthorizedError(message);
      case 403:
        throw new UnauthorizedError(message);
      case 404:
        throw new NotFoundError(message);
      default:
        throw new ApiError(message, response.status, errorData.code);
    }
  }

  /**
   * Utility delay function for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Upload file with progress tracking
   */
  private static async uploadWithProgress(
    endpoint: string,
    formData: FormData,
    options: FileUploadOptions = {}
  ): Promise<ProjectFile> {
    const { onProgress, signal } = options;

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: FileUploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100),
            };
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response: ApiResponse<ProjectFile> = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              resolve(response.data);
            } else {
              reject(new ApiError(response.error || 'Upload failed', xhr.status));
            }
          } catch (error) {
            reject(new ApiError('Invalid response format', xhr.status));
          }
        } else {
          reject(new ApiError('Upload failed', xhr.status));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new ApiError('Upload failed', xhr.status || 0));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new ApiError('Upload cancelled', 0));
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Start upload
      xhr.open('POST', `${this.baseUrl}${endpoint}`, true);
      xhr.send(formData);
    });
  }

  // ============= PROJECT METHODS =============

  /**
   * Create a new project
   */
  static async createProject(data: CreateProjectData): Promise<Project> {
    return this.request<Project>('/api/projects', {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Get a specific project by ID
   */
  static async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(`/api/projects/${projectId}`);
  }

  /**
   * Update an existing project
   */
  static async updateProject(
    projectId: string,
    data: UpdateProjectData
  ): Promise<Project> {
    return this.request<Project>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: data,
    });
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<void> {
    return this.request<void>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all projects for the current user
   */
  static async getUserProjects(): Promise<Project[]> {
    const response = await this.request<ApiListResponse<Project>>('/api/projects');
    return (response as any).data || response || [];
  }

  // ============= SEGMENT METHODS =============

  /**
   * Create a new segment for a project
   */
  static async createSegment(
    projectId: string,
    data: CreateSegmentData
  ): Promise<ProjectSegment> {
    return this.request<ProjectSegment>(`/api/projects/${projectId}/segments`, {
      method: 'POST',
      body: data,
    });
  }

  /**
   * Get all segments for a project
   */
  static async getProjectSegments(projectId: string): Promise<ProjectSegment[]> {
    const response = await this.request<ApiListResponse<ProjectSegment>>(
      `/api/projects/${projectId}/segments`
    );
    return (response as any).data || response || [];
  }

  /**
   * Update a segment
   */
  static async updateSegment(
    projectId: string,
    segmentId: string,
    data: UpdateSegmentData
  ): Promise<ProjectSegment> {
    return this.request<ProjectSegment>(
      `/api/projects/${projectId}/segments/${segmentId}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  /**
   * Delete a segment
   */
  static async deleteSegment(projectId: string, segmentId: string): Promise<void> {
    return this.request<void>(`/api/projects/${projectId}/segments/${segmentId}`, {
      method: 'DELETE',
    });
  }

  // ============= FILE METHODS =============

  /**
   * Upload a file
   */
  static async uploadFile(
    file: File,
    projectId: string,
    segmentId?: string,
    options: FileUploadOptions = {}
  ): Promise<ProjectFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);
    if (segmentId) {
      formData.append('segmentId', segmentId);
    }

    return this.uploadWithProgress('/api/files/upload', formData, options);
  }

  /**
   * Upload file from base64 data (for AI-generated images)
   */
  static async uploadBase64File(
    base64Data: string,
    fileName: string,
    fileType: ProjectFile['fileType'],
    projectId: string,
    segmentId?: string,
    options: FileUploadOptions = {}
  ): Promise<ProjectFile> {
    const formData = new FormData();
    
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });

    formData.append('file', file);
    formData.append('projectId', projectId);
    formData.append('fileType', fileType);
    if (segmentId) {
      formData.append('segmentId', segmentId);
    }

    return this.uploadWithProgress('/api/files/upload', formData, options);
  }

  /**
   * Get all files for a project
   */
  static async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const response = await this.request<ApiListResponse<ProjectFile>>(
      `/api/projects/${projectId}/files`
    );
    return (response as any).data || response || [];
  }

  /**
   * Get files for a specific segment
   */
  static async getSegmentFiles(
    projectId: string,
    segmentId: string
  ): Promise<ProjectFile[]> {
    const response = await this.request<ApiListResponse<ProjectFile>>(
      `/api/projects/${projectId}/segments/${segmentId}/files`
    );
    return (response as any).data || response || [];
  }

  /**
   * Get a specific file by ID
   */
  static async getFile(fileId: string): Promise<ProjectFile> {
    return this.request<ProjectFile>(`/api/files/${fileId}`);
  }

  /**
   * Delete a file
   */
  static async deleteFile(fileId: string): Promise<void> {
    return this.request<void>(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Update file metadata
   */
  static async updateFile(
    fileId: string,
    data: Partial<CreateFileData>
  ): Promise<ProjectFile> {
    return this.request<ProjectFile>(`/api/files/${fileId}`, {
      method: 'PUT',
      body: data,
    });
  }

  // ============= UTILITY METHODS =============

  /**
   * Get file download URL (for files stored in R2)
   */
  static async getFileDownloadUrl(fileId: string): Promise<string> {
    const response = await this.request<{ url: string }>(`/api/files/${fileId}/download`);
    return response.url;
  }

  /**
   * Batch delete files
   */
  static async deleteFiles(fileIds: string[]): Promise<void> {
    return this.request<void>('/api/files/batch-delete', {
      method: 'DELETE',
      body: { fileIds },
    });
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/api/health');
  }

  /**
   * Get API configuration (rate limits, file size limits, etc.)
   */
  static async getConfig(): Promise<{
    maxFileSize: number;
    allowedFileTypes: string[];
    rateLimits: Record<string, number>;
  }> {
    return this.request<{
      maxFileSize: number;
      allowedFileTypes: string[];
      rateLimits: Record<string, number>;
    }>('/api/config');
  }
}