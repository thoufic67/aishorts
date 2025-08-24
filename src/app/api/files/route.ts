import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ProjectService } from '@/lib/project-service';
import { R2Storage } from '@/lib/r2-storage';
import { FileUtils } from '@/lib/file-utils';
import { z } from 'zod';

// Request validation schemas
const CreateFileSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  segmentId: z.string().optional(),
  fileType: z.enum(['image', 'video', 'audio', 'overlay'] as const),
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.number().positive('File size must be positive'),
  // For base64 uploads
  base64Data: z.string().optional(),
  // For URL uploads
  sourceUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

type CreateFileRequest = z.infer<typeof CreateFileSchema>;

/**
 * GET /api/files
 * List all files for the authenticated user (with optional filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const fileType = searchParams.get('fileType');

    if (projectId) {
      // Get files for specific project
      const files = await ProjectService.getProjectFiles(projectId, session.user.id);
      
      // Filter by file type if specified
      const filteredFiles = fileType 
        ? files.filter(file => file.fileType === fileType)
        : files;

      return NextResponse.json({
        success: true,
        data: filteredFiles,
        count: filteredFiles.length,
      });
    }

    // For now, we don't support getting all files across all projects
    // This would require a more complex query in the ProjectService
    return NextResponse.json(
      { success: false, error: 'Project ID is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('GET /api/files error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch files' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files/upload
 * Upload a file to R2 storage and create database record
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = CreateFileSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const fileData: CreateFileRequest = validationResult.data;

    // Verify project access
    const project = await ProjectService.getProject(fileData.projectId, session.user.id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Security validation
    const securityCheck = FileUtils.validateFileSecurity(
      fileData.mimeType,
      fileData.fileName,
      fileData.fileSize
    );

    if (!securityCheck.valid) {
      return NextResponse.json(
        { success: false, error: securityCheck.error },
        { status: 400 }
      );
    }

    let r2Key: string;
    let r2Url: string;

    // Upload to R2 storage
    if (fileData.base64Data) {
      // Handle base64 upload
      const uploadResult = await R2Storage.uploadImageFromBase64(
        fileData.base64Data,
        session.user.id,
        fileData.projectId,
        fileData.segmentId
      );
      r2Key = uploadResult.key;
      r2Url = uploadResult.url;
    } else if (fileData.sourceUrl) {
      // Handle URL upload
      const uploadResult = await R2Storage.uploadFromUrl(
        fileData.sourceUrl,
        session.user.id,
        fileData.projectId,
        fileData.fileType,
        fileData.segmentId
      );
      r2Key = uploadResult.key;
      r2Url = uploadResult.url;
    } else {
      return NextResponse.json(
        { success: false, error: 'No file data provided' },
        { status: 400 }
      );
    }

    // Create file record in database
    const fileRecord = await ProjectService.createFile({
      projectId: fileData.projectId,
      segmentId: fileData.segmentId || null,
      fileType: fileData.fileType,
      fileName: FileUtils.sanitizeFilename(fileData.fileName),
      originalName: fileData.fileName,
      mimeType: fileData.mimeType,
      fileSize: fileData.fileSize,
      r2Key,
      r2Url,
      uploadStatus: 'completed',
      metadata: fileData.metadata || null,
    });

    return NextResponse.json({
      success: true,
      data: fileRecord,
      message: 'File uploaded successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/files error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('Failed to upload')) {
        return NextResponse.json(
          { success: false, error: 'File upload failed' },
          { status: 500 }
        );
      }

      if (error.message.includes('security') || error.message.includes('not allowed')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      },
      { status: 500 }
    );
  }
}