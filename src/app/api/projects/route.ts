import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ProjectService } from '@/lib/project-service';
import { z } from 'zod';

// Request validation schemas
const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  idea: z.string().min(1, 'Idea is required'),
  scriptStyleId: z.string().optional(),
  format: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projects = await ProjectService.getUserProjects(session.user.id);

    return NextResponse.json({
      success: true,
      data: projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('GET /api/projects error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch projects' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
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
    const validationResult = CreateProjectSchema.safeParse(body);
    
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

    const projectData: CreateProjectRequest = validationResult.data;

    // Create project with default values
    const newProject = await ProjectService.createProject(session.user.id, {
      title: projectData.title,
      description: projectData.description || undefined,
      idea: projectData.idea,
      scriptStyleId: projectData.scriptStyleId || undefined,
      format: projectData.format || undefined,
      settings: projectData.settings || undefined,
    });

    return NextResponse.json({
      success: true,
      data: newProject,
      message: 'Project created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/projects error:', error);
    
    if (error instanceof Error && error.message.includes('required')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create project' 
      },
      { status: 500 }
    );
  }
}