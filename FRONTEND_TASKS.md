# Frontend Tasks - Cloudflare R2 & Database Integration

## Phase 1: API Integration Services

### Task 1.1: Create API Client Service (`src/lib/api-client.ts`)

- [ ] Create centralized API client for backend communication
- [ ] Add error handling and retry logic
- [ ] Implement authentication header management
- [ ] Add TypeScript interfaces for all API responses

```typescript
// Example structure
export class ApiClient {
  static async createProject(data: CreateProjectData): Promise<Project> {
    // Implementation
  }

  static async getProject(projectId: string): Promise<Project> {
    // Implementation
  }

  static async updateProject(
    projectId: string,
    data: UpdateProjectData,
  ): Promise<Project> {
    // Implementation
  }

  static async getUserProjects(): Promise<Project[]> {
    // Implementation
  }

  // Segment operations
  static async createSegment(
    projectId: string,
    data: CreateSegmentData,
  ): Promise<ProjectSegment> {
    // Implementation
  }

  // File operations
  static async uploadFile(
    file: File,
    projectId: string,
    segmentId?: string,
  ): Promise<ProjectFile> {
    // Implementation
  }
}
```

### Task 1.2: Update Type Definitions

- [ ] Create `src/types/project.ts` with new database-backed interfaces
- [ ] Update existing video types to align with database schema
- [ ] Add API response type definitions

```typescript
// New project types based on database schema
export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  idea: string;
  script?: string;
  scriptStyleId?: string;
  duration?: number;
  status: "draft" | "script-ready" | "generating" | "completed" | "failed";
  format?: { width: number; height: number };
  settings?: any;
  createdAt: string;
  updatedAt: string;
  segments?: ProjectSegment[];
  files?: ProjectFile[];
}

export interface ProjectSegment {
  id: string;
  projectId: string;
  order: number;
  text: string;
  imagePrompt: string;
  duration?: number;
  audioVolume: number;
  playBackRate: number;
  withBlur: boolean;
  backgroundMinimized: boolean;
  wordTimings?: any;
  createdAt: string;
  updatedAt: string;
  files?: ProjectFile[];
}

export interface ProjectFile {
  id: string;
  projectId: string;
  segmentId?: string;
  fileType: "image" | "video" | "audio" | "overlay";
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  r2Key: string;
  r2Url: string;
  tempUrl?: string;
  uploadStatus: "uploading" | "completed" | "failed";
  metadata?: any;
  createdAt: string;
  expiresAt?: string;
}
```

## Phase 2: Replace localStorage with Database API

### Task 2.1: Update Project Storage Service

- [ ] Replace `src/lib/project-storage.ts` with database-backed `src/lib/project-client.ts`
- [ ] Maintain same interface for backward compatibility
- [ ] Add caching layer for frequently accessed data
- [ ] Handle offline scenarios gracefully

```typescript
// New project client that replaces ProjectStorage
export class ProjectClient {
  // Replace localStorage methods with API calls
  static async createProject(idea: string, title?: string): Promise<Project> {
    return ApiClient.createProject({
      idea,
      title: title || `Video Project ${new Date().toLocaleDateString()}`,
    });
  }

  static async getProject(projectId: string): Promise<Project | null> {
    try {
      return await ApiClient.getProject(projectId);
    } catch (error) {
      return null;
    }
  }

  static async updateProject(
    projectId: string,
    data: Partial<Project>,
  ): Promise<void> {
    await ApiClient.updateProject(projectId, data);
  }

  static async getUserProjects(): Promise<Project[]> {
    return ApiClient.getUserProjects();
  }

  // Add segment methods
  static async createSegment(
    projectId: string,
    data: CreateSegmentData,
  ): Promise<ProjectSegment> {
    return ApiClient.createSegment(projectId, data);
  }

  static async updateSegment(
    segmentId: string,
    data: UpdateSegmentData,
  ): Promise<ProjectSegment> {
    return ApiClient.updateSegment(segmentId, data);
  }
}
```

### Task 2.2: Update Project Workflow Page

- [ ] Modify `src/app/(home)/project/[id]/workflow/page.tsx`
- [ ] Replace ProjectStorage calls with ProjectClient
- [ ] Add loading states for API calls
- [ ] Implement error handling and retry mechanisms
- [ ] Add file upload progress indicators

### Task 2.3: Update Dashboard Components

- [ ] Modify `src/components/dashboard/dashboard.tsx`
- [ ] Replace localStorage project listing with API calls
- [ ] Add loading states and error handling
- [ ] Implement project creation with API
- [ ] Add project deletion confirmation

## Phase 3: File Upload & Management UI

### Task 3.1: Create File Upload Component (`src/components/ui/file-upload.tsx`)

- [ ] Build reusable file upload component
- [ ] Add drag-and-drop functionality
- [ ] Implement upload progress tracking
- [ ] Add file preview capabilities
- [ ] Handle multiple file types (images, videos, audio)

```tsx
interface FileUploadProps {
  projectId: string;
  segmentId?: string;
  fileType: "image" | "video" | "audio" | "overlay";
  onUploadComplete: (file: ProjectFile) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export function FileUpload({
  projectId,
  segmentId,
  fileType,
  onUploadComplete,
  onUploadError,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes,
}: FileUploadProps) {
  // Implementation with drag-drop, progress tracking, etc.
}
```

### Task 3.2: Create File Management Component (`src/components/project/file-manager.tsx`)

- [ ] Build file browser/manager interface
- [ ] Add file preview functionality
- [ ] Implement file deletion with confirmation
- [ ] Add file rename capabilities
- [ ] Show file metadata (size, type, upload date)
- [ ] Add batch file operations

### Task 3.3: Create File Preview Component (`src/components/ui/file-preview.tsx`)

- [ ] Support multiple file types (images, videos, audio)
- [ ] Add fullscreen preview mode
- [ ] Implement audio/video playback controls
- [ ] Add file download functionality
- [ ] Show file metadata and properties

## Phase 4: Enhanced Video Editor Integration

### Task 4.1: Update Video Editor Components

- [ ] Modify video editor to use database-backed projects
- [ ] Update file handling to use R2 URLs
- [ ] Add real-time file upload feedback
- [ ] Implement file replacement functionality

### Task 4.2: Update Image Generation Integration

- [ ] Modify image generation workflow to use new API
- [ ] Update UI to show R2-stored images
- [ ] Add image regeneration with file replacement
- [ ] Implement batch image generation with progress tracking

### Task 4.3: Update Audio Generation Integration

- [ ] Integrate audio file storage with R2
- [ ] Update audio player components to use R2 URLs
- [ ] Add audio file management interface
- [ ] Implement audio replacement functionality

## Phase 5: State Management Updates

### Task 5.1: Update React State Management

- [ ] Replace localStorage state with API-backed state
- [ ] Implement optimistic updates for better UX
- [ ] Add error recovery mechanisms
- [ ] Implement proper loading states throughout

### Task 5.2: Add Caching Layer

- [ ] Implement React Query or SWR for API caching
- [ ] Cache frequently accessed project data
- [ ] Add background data synchronization
- [ ] Implement offline mode indicators

```typescript
// Example using React Query
export function useProject(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => ProjectClient.getProject(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectClient.getUserProjects(),
    staleTime: 5 * 60 * 1000,
  });
}
```

## Phase 6: User Experience Improvements

### Task 6.1: Loading States & Skeletons

- [ ] Add loading skeletons for project lists
- [ ] Implement loading states for file operations
- [ ] Add progress indicators for long-running operations
- [ ] Create placeholder states for empty projects

### Task 6.2: Error Handling & User Feedback

- [ ] Implement toast notifications for operations
- [ ] Add error boundary components
- [ ] Create user-friendly error messages
- [ ] Add retry mechanisms for failed operations

### Task 6.3: File Operation Feedback

- [ ] Show upload progress with visual indicators
- [ ] Add success/failure notifications
- [ ] Implement file operation queuing
- [ ] Add bandwidth usage indicators

## Phase 7: Project Creation & Management Flow

### Task 7.1: Enhanced Project Creation

- [ ] Update project creation wizard
- [ ] Add project templates and presets
- [ ] Implement project duplication functionality
- [ ] Add project export/import capabilities

### Task 7.2: Project Settings & Configuration

- [ ] Create project settings modal/page
- [ ] Add project sharing and collaboration features
- [ ] Implement project archiving functionality
- [ ] Add project usage statistics

### Task 7.3: Bulk Operations

- [ ] Add bulk file upload capabilities
- [ ] Implement batch project operations
- [ ] Add bulk file management (delete, move, etc.)
- [ ] Create progress tracking for bulk operations

## Phase 8: Mobile & Responsive Updates

### Task 8.1: Mobile File Upload

- [ ] Optimize file upload for mobile devices
- [ ] Add camera integration for mobile uploads
- [ ] Implement mobile-friendly drag-and-drop
- [ ] Add mobile file preview capabilities

### Task 8.2: Responsive UI Updates

- [ ] Update file management interface for mobile
- [ ] Optimize project workflow for smaller screens
- [ ] Add mobile-friendly navigation for files
- [ ] Implement touch-friendly controls

## Implementation Order

1. **Phase 1** - Create API client and update types
2. **Phase 2** - Replace localStorage with database API
3. **Phase 3** - Build file upload and management UI
4. **Phase 4** - Update video editor integration
5. **Phase 5** - Implement state management updates
6. **Phase 6** - Add UX improvements
7. **Phase 7** - Enhanced project management
8. **Phase 8** - Mobile optimization

## Key Components to Create/Update

### New Components:

- `src/components/ui/file-upload.tsx`
- `src/components/ui/file-preview.tsx`
- `src/components/project/file-manager.tsx`
- `src/components/ui/loading-skeleton.tsx`
- `src/components/ui/progress-indicator.tsx`
- `src/components/project/project-settings.tsx`

### Updated Components:

- `src/components/dashboard/dashboard.tsx`
- `src/components/video-editor/*` (all video editor components)
- `src/app/(home)/create-video/page.tsx`

### New Services:

- `src/lib/api-client.ts`
- `src/lib/project-client.ts`
- `src/hooks/use-projects.ts`
- `src/hooks/use-files.ts`

### Updated Services:

- Replace `src/lib/project-storage.ts` with new client
- Update all components using ProjectStorage

## Dependencies to Add

```bash
# For better API management and caching
pnpm add @tanstack/react-query

# For file handling and drag-drop
pnpm add react-dropzone

# For better form handling
pnpm add react-hook-form @hookform/resolvers zod

# For notifications
pnpm add react-hot-toast

# For loading states
pnpm add react-loading-skeleton
```
