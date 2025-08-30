# API Documentation

This document provides comprehensive documentation for all API endpoints in the Next.js 14 application for AI-generated short video content with subscription billing.

## Base URL
All API endpoints are prefixed with `/api/` and are relative to your domain.

## Authentication
Most endpoints require authentication using Auth.js v5 with Google OAuth. Authenticated endpoints return `401 Unauthorized` if no valid session is present.

## Response Format
All API responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": {...}, // Response data
  "message": "Operation completed successfully", // Optional
  "count": 10 // Optional, for list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {...} // Optional, development mode only
}
```

## API Endpoints

### Authentication

#### `GET/POST /api/auth/[...nextauth]`
**Purpose**: Auth.js v5 authentication handlers for OAuth and session management.

**Authentication**: Not required (public endpoint)

**Description**: Handles all authentication flows including Google OAuth login, logout, and session management.

**Usage**: This endpoint is managed by Auth.js and should not be called directly.

---

### Script Generation

#### `POST /api/generate-script`
**Purpose**: Generate AI video scripts using OpenAI with specified style and duration.

**Authentication**: Required

**Request Body**:
```json
{
  "userPrompt": "string", // Required: User's topic/idea
  "scriptStyleId": "string", // Required: Script style identifier
  "duration": number // Required: Desired duration in seconds (10-300)
}
```

**Response**:
```json
{
  "success": true,
  "script": "Generated script content...",
  "metadata": {
    "userPrompt": "Original user prompt",
    "scriptStyleId": "Script style used",
    "duration": 60,
    "generatedAt": "2024-01-01T00:00:00Z",
    "userId": "user-id"
  }
}
```

**Error Cases**:
- `400`: Invalid or missing parameters
- `401`: Authentication required
- `500`: Script generation failed

---

#### `POST /api/break-script`
**Purpose**: Break down a script into 3-5 second chunks for video segments.

**Authentication**: Required

**Request Body**:
```json
{
  "script": "string" // Required: Complete script to break down
}
```

**Response**:
```json
{
  "chunks": ["First chunk...", "Second chunk...", "Third chunk..."]
}
```

**Notes**: 
- Creates maximum 10 chunks
- Each chunk is 8-15 words for 3-5 seconds of speaking
- Preserves original text without modifications

---

### Image Generation

#### `POST /api/generate-image-prompts`
**Purpose**: Generate optimized image prompts for each script chunk using AI.

**Authentication**: Required

**Request Body**:
```json
{
  "chunks": ["Script chunk 1", "Script chunk 2"],
  "styleId": "string", // Optional: Image style ID
  "style": "dark and eerie" // Optional: Style description
}
```

**Response**:
```json
{
  "prompts": ["Image prompt for chunk 1", "Image prompt for chunk 2"]
}
```

---

#### `POST /api/generate-images`
**Purpose**: Generate images using AI services (FalAI or OpenAI DALL-E).

**Authentication**: Required for R2 storage

**Request Body**:

**Single Image**:
```json
{
  "type": "single",
  "prompt": "string",
  "style": "string", // Optional
  "imageSize": "string", // Optional
  "model": "string", // Optional: "dall-e-3", "flux-1.1-pro", etc.
  "quality": "low|medium|high", // Optional
  "aspectRatio": "square|portrait|landscape", // Optional
  "storeInR2": boolean, // Optional
  "projectId": "string", // Required if storeInR2
  "segmentId": "string" // Optional
}
```

**Batch Images**:
```json
{
  "type": "batch",
  "storeInR2": boolean, // Optional
  "projectId": "string", // Required if storeInR2
  "prompts": [
    {
      "prompt": "string",
      "style": "string", // Optional
      "model": "string", // Optional
      // ... other single image options
    }
  ]
}
```

**Response**:
- Single: Returns `ImageResult` object
- Batch: Returns array of `ImageResult` objects with summary

**ImageResult**:
```json
{
  "success": true,
  "imageUrl": "https://...", // Temporary URL
  "r2Url": "https://...", // Permanent R2 URL if stored
  "r2Key": "storage-key",
  "fileRecord": {...}, // Database record if stored
  "prompt": "Original prompt"
}
```

**Models Supported**:
- OpenAI: `dall-e-3`, `gpt-image-1`
- FalAI: `flux-1.1-pro`, `flux-schnell`, etc.

---

### Audio Generation

#### `POST /api/text-to-speech`
**Purpose**: Generate speech audio from text using OpenAI TTS and store in R2.

**Authentication**: Required

**Request Body**:
```json
{
  "text": "string", // Required: Text to convert to speech
  "voice": "echo|alloy|fable|onyx|nova|shimmer", // Optional, default: "echo"
  "index": number, // Required: Segment index
  "projectId": "string", // Optional: Project ID
  "segmentId": "string" // Optional: Segment ID
}
```

**Response**:
```json
{
  "audioUrl": "https://r2-url/audio.mp3",
  "key": "r2-storage-key",
  "projectId": "project-id"
}
```

**Notes**: 
- Uses OpenAI `gpt-4o-mini-tts` model
- Audio files are uploaded to R2 storage automatically
- Generates project ID if not provided

---

### Video Export

#### `POST /api/export-video`
**Purpose**: Export video using Remotion (without audio).

**Authentication**: Not required

**Request Body**:
```json
{
  "videoData": {...}, // Video project data
  "quality": "low|medium|high" // Optional, default: "medium"
}
```

**Response**:
```json
{
  "success": true,
  "downloadUrl": "/exports/video_id_timestamp.mp4",
  "filename": "video_id_timestamp.mp4",
  "message": "Video exported successfully"
}
```

**Quality Settings**:
- `low`: CRF 28, 0.5x scale
- `medium`: CRF 23, 0.75x scale
- `high`: CRF 18, 1x scale

**Notes**:
- Returns `503` if Remotion dependencies are missing
- Exports are stored in `public/exports/`
- Videos are muted (audio handled separately)

---

#### `POST /api/export-video-with-audio`
**Purpose**: Export video with combined audio tracks using FFmpeg.

**Authentication**: Not required

**Request Body**:
```json
{
  "videoData": {...}, // Video project data
  "audioTracks": [...], // Audio track data
  "backgroundMusicUrl": "string", // Optional: Background music URL
  "quality": "low|medium|high" // Optional, default: "medium"
}
```

**Response**:
```json
{
  "success": true,
  "downloadUrl": "/exports/video_with_audio_id_timestamp.mp4",
  "filename": "video_with_audio_id_timestamp.mp4",
  "message": "Video with audio exported successfully"
}
```

**Audio Processing**:
- Combines voice segments with background music
- Applies ducking when voice is present
- Supports multiple audio formats
- Cleans up temporary files automatically

**Dependencies**: Requires FFmpeg installed on server

---

### Project Management

#### `GET /api/projects`
**Purpose**: List all projects for authenticated user.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "project-id",
      "title": "Project Title",
      "description": "Project description",
      "status": "draft|script-ready|generating|completed|failed",
      "createdAt": "2024-01-01T00:00:00Z",
      // ... other project fields
    }
  ],
  "count": 5
}
```

---

#### `POST /api/projects`
**Purpose**: Create a new project.

**Authentication**: Required

**Request Body**:
```json
{
  "title": "string", // Required: 1-255 characters
  "description": "string", // Optional
  "idea": "string", // Required: Project idea/concept
  "scriptStyleId": "string", // Optional
  "format": {
    "width": number,
    "height": number
  }, // Optional
  "settings": {...} // Optional: Additional settings
}
```

**Response**:
```json
{
  "success": true,
  "data": {...}, // Created project object
  "message": "Project created successfully"
}
```

---

#### `GET /api/projects/[id]`
**Purpose**: Get project details.

**Authentication**: Required

**Query Parameters**:
- `include=details`: Include segments and files data

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "project-id",
    "title": "Project Title",
    // ... project fields
    "segments": [...], // If include=details
    "files": [...] // If include=details
  }
}
```

---

#### `PUT /api/projects/[id]`
**Purpose**: Update project details.

**Authentication**: Required

**Request Body**: Partial project object with updatable fields:
```json
{
  "title": "string", // Optional
  "description": "string", // Optional
  "script": "string", // Optional
  "status": "draft|script-ready|generating|completed|failed", // Optional
  "voice": "string", // Optional
  "watermark": boolean, // Optional
  // ... other updatable fields
}
```

**Response**:
```json
{
  "success": true,
  "data": {...}, // Updated project
  "message": "Project updated successfully"
}
```

---

#### `DELETE /api/projects/[id]`
**Purpose**: Delete project and cleanup associated files.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Notes**: Also deletes associated files from R2 storage

---

### Segment Management

#### `GET /api/projects/[id]/segments`
**Purpose**: Get all segments for a project.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "segment-id",
      "order": 0,
      "text": "Segment text content",
      "imagePrompt": "Generated image prompt",
      "duration": 5.0,
      "audioVolume": 1.0,
      "playBackRate": 1.0,
      // ... other segment fields
    }
  ],
  "count": 10
}
```

---

#### `POST /api/projects/[id]/segments`
**Purpose**: Create segment(s) for a project. Supports single and batch creation.

**Authentication**: Required

**Single Segment**:
```json
{
  "order": number, // Required: Segment order
  "text": "string", // Required: Segment text
  "imagePrompt": "string", // Required: Image prompt
  "duration": number, // Optional: Duration in seconds
  "audioVolume": number, // Optional: 0-2, default 1.0
  "playBackRate": number, // Optional: 0.5-2, default 1.0
  "withBlur": boolean, // Optional: default false
  "backgroundMinimized": boolean, // Optional: default false
  "wordTimings": {...} // Optional: Word timing data
}
```

**Batch Creation**:
```json
{
  "segments": [
    // Array of segment objects (same structure as single)
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {...}, // Created segment(s)
  "count": 1, // For batch creation
  "message": "Segment(s) created successfully"
}
```

---

#### `PUT /api/projects/[id]/segments/[segmentId]`
**Purpose**: Update a specific segment.

**Authentication**: Required

**Request Body**: Partial segment object with updatable fields

**Response**:
```json
{
  "success": true,
  "data": {...}, // Updated segment
  "message": "Segment updated successfully"
}
```

---

#### `DELETE /api/projects/[id]/segments/[segmentId]`
**Purpose**: Delete segment and associated files.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Segment deleted successfully"
}
```

---

### File Management

#### `GET /api/files`
**Purpose**: List files for authenticated user.

**Authentication**: Required

**Query Parameters**:
- `projectId`: Filter by project ID (required)
- `fileType`: Filter by file type (`image|video|audio|overlay`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "file-id",
      "fileName": "image.jpg",
      "originalName": "original-image.jpg",
      "fileType": "image",
      "mimeType": "image/jpeg",
      "fileSize": 1024000,
      "r2Url": "https://...",
      "uploadStatus": "completed",
      // ... other file fields
    }
  ],
  "count": 5
}
```

---

#### `POST /api/files`
**Purpose**: Upload file to R2 storage and create database record.

**Authentication**: Required

**Request Body**:
```json
{
  "projectId": "string", // Required
  "segmentId": "string", // Optional
  "fileType": "image|video|audio|overlay", // Required
  "fileName": "string", // Required
  "mimeType": "string", // Required
  "fileSize": number, // Required: File size in bytes
  // One of the following is required:
  "base64Data": "string", // For base64 uploads
  "sourceUrl": "string", // For URL uploads
  "metadata": {...} // Optional: Additional metadata
}
```

**Response**:
```json
{
  "success": true,
  "data": {...}, // Created file record
  "message": "File uploaded successfully"
}
```

**Security**:
- File type validation
- Size limits enforced
- Filename sanitization
- MIME type validation

---

#### `GET /api/files/[id]`
**Purpose**: Get file information by ID.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "data": {...} // File record
}
```

---

#### `DELETE /api/files/[id]`
**Purpose**: Delete file and remove from R2 storage.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

#### `PATCH /api/files/[id]`
**Purpose**: Update file status or metadata.

**Authentication**: Required

**Request Body**:
```json
{
  "uploadStatus": "uploading|completed|failed" // Currently only supported field
}
```

**Response**:
```json
{
  "success": true,
  "message": "File status updated successfully"
}
```

---

### Migration

#### `POST /api/migrate-from-localstorage`
**Purpose**: Migrate projects from localStorage to database.

**Authentication**: Required

**Request Body**:
```json
{
  "projects": {
    "project-id-1": {...}, // Project data from localStorage
    "project-id-2": {...}
  },
  "uploadToR2": boolean, // Default: true
  "clearLocalStorageAfter": boolean // Default: false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Migration completed: 3/4 projects migrated",
  "data": {
    "totalProjects": 4,
    "migratedProjects": 3,
    "failedProjects": ["Failed Project Name"],
    "totalSegments": 25,
    "totalFiles": 15,
    "migratedProjectIds": ["id1", "id2", "id3"],
    "uploadedToR2": true
  },
  "errors": ["Error messages for failed projects"]
}
```

**Status Codes**:
- `200`: All projects migrated successfully
- `207`: Partial success (some projects failed)
- `500`: Migration completely failed

---

#### `GET /api/migrate-from-localstorage`
**Purpose**: Get migration endpoint status.

**Authentication**: Required

**Response**:
```json
{
  "success": true,
  "message": "Migration stats endpoint ready",
  "data": {
    "note": "Send localStorage projects data via POST to get migration preview"
  }
}
```

---

### Health & Testing

#### `GET /api/health`
**Purpose**: System health check endpoint.

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "checks": {
    "database": "healthy",
    "storage": "healthy",
    "openai": "healthy"
    // ... other service checks
  }
}
```

**Status Codes**:
- `200`: System healthy or degraded
- `503`: System unhealthy

---

#### `GET /api/test-r2`
**Purpose**: Test Cloudflare R2 storage connectivity and configuration.

**Authentication**: Not required

**Response**:
```json
{
  "success": true,
  "uploadResult": {
    "key": "test-key",
    "url": "https://..."
  },
  "urlAccessible": true,
  "message": "R2 connection test passed successfully"
}
```

**Test Operations**:
1. Environment variable validation
2. Test file upload
3. Public URL accessibility check
4. Test file deletion

---

### Webhook

#### `POST /api/webhook`
**Purpose**: Lemon Squeezy webhook handler for subscription events.

**Authentication**: HMAC signature verification

**Headers**:
- `X-Signature`: HMAC-SHA256 signature of request body

**Supported Events**:
- `subscription_created`
- `subscription_updated`
- `subscription_cancelled`
- `subscription_resumed`
- `subscription_expired`

**Response**:
```json
"OK" // Status 200 for valid webhooks
```

**Error Responses**:
- `400`: Invalid signature or data
- `500`: Webhook secret not configured

**Security**:
- HMAC signature verification using webhook secret
- Timing-safe signature comparison
- Event deduplication via database storage

---

## Error Handling

### Common Error Codes

- `400 Bad Request`: Invalid request parameters or validation failures
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Resource not found or access denied
- `405 Method Not Allowed`: HTTP method not supported for endpoint
- `500 Internal Server Error`: Server-side processing error
- `503 Service Unavailable`: External service unavailable (e.g., Remotion)

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": {
    // Additional error details (development only)
    "validation": [...], // Zod validation errors
    "stack": "...", // Stack trace (development only)
    "rawContent": "..." // Raw API responses (development only)
  }
}
```

## Rate Limiting

### Image Generation
- OpenAI DALL-E: 2-second delay between requests
- FalAI: 1-second delay between requests
- Batch operations process sequentially

### Text-to-Speech
- No specific rate limiting implemented
- Relies on OpenAI's built-in rate limits

## Authentication Flow

1. User visits `/signin` page
2. Clicks Google OAuth button
3. Redirected to Google for authentication
4. Google redirects back with authorization code
5. Auth.js exchanges code for tokens
6. User session created and stored in database
7. Subsequent API requests include session cookie
8. APIs validate session using `auth()` function

## File Storage

### R2 Storage Structure
```
bucket/
├── users/
│   └── {userId}/
│       └── projects/
│           └── {projectId}/
│               ├── images/
│               ├── audio/
│               └── segments/
│                   └── {segmentId}/
```

### File Security
- All files are scoped to authenticated users
- File type and size validation
- Secure filename sanitization
- MIME type verification

## External Services

### OpenAI API
- **Script Generation**: GPT-4o models for script creation
- **Image Prompts**: GPT-4o for optimizing image prompts  
- **Text-to-Speech**: `gpt-4o-mini-tts` for audio generation
- **Image Generation**: DALL-E 3 for image creation

### FalAI
- **Image Generation**: Flux models (flux-1.1-pro, flux-schnell)
- Fallback service for image generation

### Lemon Squeezy
- **Subscription Billing**: Webhook-based event processing
- **Customer Portal**: Redirect URLs for billing management

### Cloudflare R2
- **File Storage**: Primary storage for all media files
- **CDN**: Global content delivery for fast access

## Development Notes

### Environment Variables
See README.md for complete list of required environment variables.

### Database Schema
Located in `src/db/schema.ts` using Drizzle ORM with PostgreSQL.

### Type Safety
All API routes use Zod for request validation and TypeScript for type safety.

### Testing
Use `/api/test-r2` and `/api/health` endpoints to verify system status.

---

*This documentation is automatically generated and kept up-to-date with the codebase.*