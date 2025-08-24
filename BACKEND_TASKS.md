# Backend Tasks - Cloudflare R2 & Database Implementation

## Phase 1: Environment & Dependencies Setup

### Task 1.1: Install Dependencies
- [ ] Add `@aws-sdk/client-s3` for R2 storage
- [ ] Add `uuid` for generating unique IDs
- [ ] Add `mime-types` for file type detection
- [ ] Add `sharp` for image processing (optional)

```bash
pnpm add @aws-sdk/client-s3 uuid mime-types
pnpm add -D @types/uuid @types/mime-types
```

### Task 1.2: Environment Configuration
- [ ] Add R2 environment variables to `.env.local`
  - `CLOUDFLARE_R2_ENDPOINT`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID` 
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET_NAME`
  - `CLOUDFLARE_R2_PUBLIC_URL`

```env
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=aishorts-storage
CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.r2.dev
```

## Phase 2: Database Schema Implementation

### Task 2.1: Update Database Schema (`src/db/schema.ts`)
- [ ] Add `projects` table - main video project container
- [ ] Add `projectSegments` table - individual video segments
- [ ] Add `projectFiles` table - file storage tracking
- [ ] Add `segmentMedia` table - media items within segments
- [ ] Add `projectLayers` table - video layers (captions, audio)

```typescript
// Add to existing schema.ts
export const projects = pgTable("project", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  idea: text("idea").notNull(),
  script: text("script"),
  scriptStyleId: text("scriptStyleId"),
  duration: integer("duration"), // in seconds
  status: text("status").notNull().default("draft"), // 'draft', 'script-ready', 'generating', 'completed', 'failed'
  format: jsonb("format").$type<{ width: number; height: number }>(),
  settings: jsonb("settings"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const projectSegments = pgTable("projectSegment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  text: text("text").notNull(),
  imagePrompt: text("imagePrompt").notNull(),
  duration: integer("duration"), // in seconds
  audioVolume: real("audioVolume").default(1.0),
  playBackRate: real("playBackRate").default(1.0),
  withBlur: boolean("withBlur").default(false),
  backgroundMinimized: boolean("backgroundMinimized").default(false),
  wordTimings: jsonb("wordTimings"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const projectFiles = pgTable("projectFile", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("projectId").notNull().references(() => projects.id, { onDelete: "cascade" }),
  segmentId: text("segmentId").references(() => projectSegments.id, { onDelete: "cascade" }),
  fileType: text("fileType").notNull(), // 'image', 'video', 'audio', 'overlay'
  fileName: text("fileName").notNull(),
  originalName: text("originalName").notNull(),
  mimeType: text("mimeType").notNull(),
  fileSize: integer("fileSize").notNull(),
  r2Key: text("r2Key").notNull(),
  r2Url: text("r2Url").notNull(),
  tempUrl: text("tempUrl"),
  uploadStatus: text("uploadStatus").notNull().default("uploading"), // 'uploading', 'completed', 'failed'
  metadata: jsonb("metadata"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  expiresAt: timestamp("expiresAt"),
});
```

### Task 2.2: Database Migration
- [ ] Run `pnpm db:push` to apply schema changes
- [ ] Verify tables are created correctly in Drizzle Studio

## Phase 3: Core Storage Utilities

### Task 3.1: R2 Storage Service (`src/lib/r2-storage.ts`)
- [ ] Configure S3-compatible client for R2
- [ ] Implement file upload functions
- [ ] Implement file management functions
- [ ] Add organized folder structure: `/{userId}/{projectId}/{segmentId?}/{fileType}/`

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

export class R2Storage {
  private static client: S3Client;
  
  private static getClient() {
    if (!this.client) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
        },
      });
    }
    return this.client;
  }

  static async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    // Implementation
  }

  static async uploadImageFromBase64(base64: string, userId: string, projectId: string, segmentId?: string): Promise<{key: string, url: string}> {
    // Implementation
  }

  static async deleteFile(key: string): Promise<void> {
    // Implementation
  }

  static getPublicUrl(key: string): string {
    // Implementation
  }
}
```

### Task 3.2: File Processing Utilities (`src/lib/file-utils.ts`)
- [ ] Base64 to Buffer conversion
- [ ] MIME type detection and validation
- [ ] File size validation
- [ ] Metadata extraction

```typescript
export class FileUtils {
  static base64ToBuffer(base64: string): Buffer {
    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    return Buffer.from(cleanBase64, 'base64');
  }

  static validateFileType(mimeType: string, allowedTypes: string[]): boolean {
    // Implementation
  }

  static generateFileName(originalName: string, userId: string, projectId: string): string {
    // Implementation
  }

  static extractImageMetadata(buffer: Buffer): Promise<{width: number, height: number}> {
    // Implementation
  }
}
```

### Task 3.3: Database Service Layer (`src/lib/project-service.ts`)
- [ ] Replace localStorage-based ProjectStorage
- [ ] Implement CRUD operations for projects
- [ ] Implement segment management
- [ ] Implement file association management

```typescript
export class ProjectService {
  static async createProject(userId: string, data: CreateProjectData): Promise<Project> {
    // Implementation
  }

  static async getProject(projectId: string, userId: string): Promise<Project | null> {
    // Implementation
  }

  static async updateProject(projectId: string, userId: string, data: UpdateProjectData): Promise<Project> {
    // Implementation
  }

  static async deleteProject(projectId: string, userId: string): Promise<void> {
    // Implementation
  }

  static async getUserProjects(userId: string): Promise<Project[]> {
    // Implementation
  }

  // Segment operations
  static async createSegment(projectId: string, userId: string, data: CreateSegmentData): Promise<ProjectSegment> {
    // Implementation
  }

  static async updateSegment(segmentId: string, userId: string, data: UpdateSegmentData): Promise<ProjectSegment> {
    // Implementation
  }

  // File operations
  static async linkFileToProject(fileId: string, projectId: string): Promise<void> {
    // Implementation
  }

  static async getProjectFiles(projectId: string, userId: string): Promise<ProjectFile[]> {
    // Implementation
  }
}
```

## Phase 4: API Endpoints

### Task 4.1: Projects API (`src/app/api/projects/`)
- [ ] Create `route.ts` - List and create projects
  - `GET /api/projects` - List user's projects
  - `POST /api/projects` - Create new project

### Task 4.2: Individual Project API (`src/app/api/projects/[id]/route.ts`)
- [ ] `GET /api/projects/[id]` - Get project details
- [ ] `PUT /api/projects/[id]` - Update project
- [ ] `DELETE /api/projects/[id]` - Delete project

### Task 4.3: Segments API (`src/app/api/projects/[id]/segments/`)
- [ ] Create `route.ts` - Segment operations
  - `POST /api/projects/[id]/segments` - Create segment
  - `GET /api/projects/[id]/segments` - List segments

### Task 4.4: Individual Segment API (`src/app/api/projects/[id]/segments/[segmentId]/route.ts`)
- [ ] `PUT /api/projects/[id]/segments/[segmentId]` - Update segment
- [ ] `DELETE /api/projects/[id]/segments/[segmentId]` - Delete segment

### Task 4.5: Files API (`src/app/api/files/`)
- [ ] Create `route.ts` - File operations
  - `POST /api/files/upload` - Direct file upload
  - `GET /api/files` - List user files

### Task 4.6: Individual File API (`src/app/api/files/[id]/route.ts`)
- [ ] `GET /api/files/[id]` - Get file info
- [ ] `DELETE /api/files/[id]` - Delete file

### Task 4.7: Update Generate Images API
- [ ] Modify `src/app/api/generate-images/route.ts`:
  - Store generated images in R2 immediately
  - Update database with file records
  - Return R2 URLs instead of temporary URLs
  - Handle batch uploads with proper error handling

## Phase 5: Enhanced Services

### Task 5.1: Update OpenAI Service
- [ ] Modify `src/lib/openai-service.ts`:
  - Add `storeInR2` parameter to `generateImage()`
  - Return both temporary URL and R2 storage info
  - Handle base64 conversion for R2 upload
  - Add file metadata to response

### Task 5.2: Authentication Middleware
- [ ] Create `src/lib/auth-utils.ts`:
  - Validate user sessions for API calls
  - Extract userId from session
  - Add authorization checks for project access

```typescript
import { auth } from '@/auth';

export async function validateUserSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

export async function validateProjectAccess(projectId: string, userId: string) {
  // Check if user owns the project
  const project = await ProjectService.getProject(projectId, userId);
  if (!project) {
    throw new Error('Project not found or access denied');
  }
  return project;
}
```

## Phase 6: Security & Error Handling

### Task 6.1: Security Implementation
- [ ] Add file type validation and restrictions
- [ ] Implement user quota limits
- [ ] Add CORS configuration for R2 bucket
- [ ] File size limits and validation

### Task 6.2: Error Handling
- [ ] Comprehensive error handling for all API endpoints
- [ ] File operation logging and monitoring
- [ ] Retry logic for failed uploads
- [ ] User-friendly error messages

```typescript
// Error types
export class FileUploadError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'FileUploadError';
  }
}

export class ProjectAccessError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ProjectAccessError';
  }
}

// Error handler utility
export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  if (error instanceof FileUploadError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }
  
  if (error instanceof ProjectAccessError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 403 }
    );
  }
  
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
```

## Phase 7: Documentation

### Task 7.1: API Documentation
- [ ] Document all API endpoints with request/response examples
- [ ] Add TypeScript interfaces for all API payloads
- [ ] Create API usage examples

### Task 7.2: Setup Documentation
- [ ] R2 setup and configuration guide
- [ ] Environment variables documentation
- [ ] Database schema documentation
- [ ] Troubleshooting guide

## Implementation Order

1. **Start with Phase 1 & 2** - Set up environment and database schema
2. **Phase 3** - Build core utilities (R2 storage, file processing, project service)
3. **Phase 4** - Implement API endpoints (start with projects, then segments, then files)
4. **Phase 5** - Enhance existing services (OpenAI integration)
5. **Phase 6** - Add security and error handling
6. **Phase 7** - Documentation

## Key Files to Create/Modify

### New Files:
- `src/lib/r2-storage.ts`
- `src/lib/file-utils.ts` 
- `src/lib/project-service.ts`
- `src/lib/auth-utils.ts`
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[id]/route.ts`
- `src/app/api/projects/[id]/segments/route.ts`
- `src/app/api/projects/[id]/segments/[segmentId]/route.ts`
- `src/app/api/files/route.ts`
- `src/app/api/files/[id]/route.ts`

### Modified Files:
- `src/db/schema.ts` (add new tables)
- `src/lib/openai-service.ts` (integrate R2 storage)
- `src/app/api/generate-images/route.ts` (store in R2)