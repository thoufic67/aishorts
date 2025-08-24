import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ProjectService } from '@/lib/project-service';

/**
 * GET /api/files/[id]
 * Get file information by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const fileId = params.id;
    const file = await ProjectService.getFile(fileId, session.user.id);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: file,
    });

  } catch (error) {
    console.error(`GET /api/files/${params.id} error:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch file' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/[id]
 * Delete file and remove from R2 storage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const fileId = params.id;

    // Delete file (this will also cleanup from R2)
    await ProjectService.deleteFile(fileId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error(`DELETE /api/files/${params.id} error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'File not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete file' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/files/[id]
 * Update file status or metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const fileId = params.id;

    // For now, we only support updating the upload status
    if (body.uploadStatus && ['uploading', 'completed', 'failed'].includes(body.uploadStatus)) {
      await ProjectService.updateFileStatus(fileId, session.user.id, body.uploadStatus);
      
      return NextResponse.json({
        success: true,
        message: 'File status updated successfully',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid update data' },
      { status: 400 }
    );

  } catch (error) {
    console.error(`PATCH /api/files/${params.id} error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'File not found' },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update file' 
      },
      { status: 500 }
    );
  }
}