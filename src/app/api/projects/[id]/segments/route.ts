import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ProjectService } from '@/lib/project-service';
import { z } from 'zod';

// Request validation schemas
const CreateSegmentSchema = z.object({
  order: z.number().int().nonnegative(),
  text: z.string().min(1, 'Text is required'),
  imagePrompt: z.string().min(1, 'Image prompt is required'),
  duration: z.number().positive().optional(),
  audioVolume: z.number().min(0).max(2).optional(),
  playBackRate: z.number().min(0.5).max(2).optional(),
  withBlur: z.boolean().optional(),
  backgroundMinimized: z.boolean().optional(),
  wordTimings: z.record(z.string(), z.any()).optional(),
});

type CreateSegmentRequest = z.infer<typeof CreateSegmentSchema>;

/**
 * GET /api/projects/[id]/segments
 * Get all segments for a project
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
    const segments = await ProjectService.getProjectSegments(projectId, session.user.id);

    return NextResponse.json({
      success: true,
      data: segments,
      count: segments.length,
    });
  } catch (error) {
    console.error(`GET /api/projects/${params.id}/segments error:`, error);
    
    if (error instanceof Error && (
      error.message.includes('not found') || 
      error.message.includes('access denied')
    )) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch segments' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/segments
 * Create a new segment for a project
 */
export async function POST(
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
    const validationResult = CreateSegmentSchema.safeParse(body);
    
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

    const segmentData: CreateSegmentRequest = validationResult.data;
    const projectId = params.id;

    // Create segment with default values
    const newSegment = await ProjectService.createSegment(projectId, session.user.id, {
      order: segmentData.order,
      text: segmentData.text,
      imagePrompt: segmentData.imagePrompt,
      duration: segmentData.duration || undefined,
      audioVolume: segmentData.audioVolume || 1.0,
      playBackRate: segmentData.playBackRate || 1.0,
      withBlur: segmentData.withBlur || false,
      backgroundMinimized: segmentData.backgroundMinimized || false,
      wordTimings: segmentData.wordTimings || null,
    });

    return NextResponse.json({
      success: true,
      data: newSegment,
      message: 'Segment created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/projects/${params.id}/segments error:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return NextResponse.json(
          { success: false, error: 'Project not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('required')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create segment' 
      },
      { status: 500 }
    );
  }
}