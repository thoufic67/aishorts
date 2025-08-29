import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ProjectService } from '@/lib/project-service';
import { z } from 'zod';

// Request validation schemas
const UpdateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().optional(),
  idea: z.string().min(1, 'Idea is required').optional(),
  script: z.string().optional(),
  scriptStyleId: z.string().optional(),
  duration: z.number().positive().optional(),
  status: z.enum(['draft', 'script-ready', 'generating', 'completed', 'failed'] as const).optional(),
  format: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  // Video generation fields
  voice: z.string().optional(),
  type: z.string().optional(),
  mediaType: z.string().optional(),
  isRemotion: z.boolean().optional(),
  selectedModel: z.string().optional(),
  audioType: z.string().optional(),
  audioPrompt: z.string().optional(),
  watermark: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  selectedMedia: z.object({
    images: z.array(z.string()),
    videos: z.array(z.string()),
  }).optional(),
  tiktokDescription: z.string().optional(),
  youtubeDescription: z.string().optional(),
});

type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;

/**
 * GET /api/projects/[id]
 * Get project details with segments and files
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

    const projectId = params.id;
    const includeDetails = request.nextUrl.searchParams.get('include') === 'details';

    if (includeDetails) {
      const projectData = await ProjectService.getProjectWithDetails(projectId, session.user.id);
      
      if (!projectData) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: projectData,
      });
    } else {
      const project = await ProjectService.getProject(projectId, session.user.id);
      
      if (!project) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: project,
      });
    }
  } catch (error) {
    console.error(`GET /api/projects/${params.id} error:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch project' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update project details
 */
export async function PUT(
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
    
    // Validate request body
    const validationResult = UpdateProjectSchema.safeParse(body);
    
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

    const updateData: UpdateProjectRequest = validationResult.data;
    const projectId = params.id;

    // Update project
    const updatedProject = await ProjectService.updateProject(
      projectId, 
      session.user.id, 
      updateData
    );

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error(`PUT /api/projects/${params.id} error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('required') || error.message.includes('validation')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update project' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete project and cleanup associated files
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

    const projectId = params.id;

    // Delete project (this will also cleanup files from R2)
    await ProjectService.deleteProject(projectId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error(`DELETE /api/projects/${params.id} error:`, error);
    
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
        error: error instanceof Error ? error.message : 'Failed to delete project' 
      },
      { status: 500 }
    );
  }
}