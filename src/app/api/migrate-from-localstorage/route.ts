import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { MigrationUtils, type ProjectData } from '@/lib/migration-utils';
import { handleApiError } from '@/lib/api-error-handler';
import { z } from 'zod';

// Request validation schema
const MigrationRequestSchema = z.object({
  projects: z.record(z.string(), z.any()), // LocalStorage projects data
  uploadToR2: z.boolean().default(true),
  clearLocalStorageAfter: z.boolean().default(false),
});

type MigrationRequest = z.infer<typeof MigrationRequestSchema>;

/**
 * POST /api/migrate-from-localstorage
 * Migrate projects from localStorage data to database
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
    const validationResult = MigrationRequestSchema.safeParse(body);
    
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

    const { projects, uploadToR2, clearLocalStorageAfter } = validationResult.data;

    // Validate that we have projects to migrate
    if (!projects || Object.keys(projects).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No projects data provided' },
        { status: 400 }
      );
    }

    console.log(`Starting migration for user ${session.user.id} with ${Object.keys(projects).length} projects`);

    const result = {
      success: true,
      totalProjects: 0,
      migratedProjects: 0,
      failedProjects: [] as string[],
      totalSegments: 0,
      totalFiles: 0,
      errors: [] as string[],
      migratedProjectIds: [] as string[],
    };

    const projectIds = Object.keys(projects);
    result.totalProjects = projectIds.length;

    // Migrate each project
    for (let i = 0; i < projectIds.length; i++) {
      const projectId = projectIds[i];
      const project = projects[projectId] as ProjectData;

      console.log(`Migrating project ${i + 1}/${result.totalProjects}: ${project.title}`);

      try {
        const migrationResult = await MigrationUtils.migrateProject(
          project, 
          session.user.id, 
          uploadToR2
        );

        if (migrationResult.success && migrationResult.projectId) {
          result.migratedProjects++;
          result.totalSegments += migrationResult.segmentCount || 0;
          result.totalFiles += migrationResult.fileCount || 0;
          result.migratedProjectIds.push(migrationResult.projectId);
        } else {
          result.failedProjects.push(project.title);
          result.errors.push(`${project.title}: ${migrationResult.error}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.failedProjects.push(project.title);
        result.errors.push(`${project.title}: ${errorMessage}`);
        console.error(`Failed to migrate project ${project.title}:`, error);
      }
    }

    result.success = result.migratedProjects > 0;

    // Prepare response
    const response = {
      success: result.success,
      message: `Migration completed: ${result.migratedProjects}/${result.totalProjects} projects migrated`,
      data: {
        totalProjects: result.totalProjects,
        migratedProjects: result.migratedProjects,
        failedProjects: result.failedProjects,
        totalSegments: result.totalSegments,
        totalFiles: result.totalFiles,
        migratedProjectIds: result.migratedProjectIds,
        uploadedToR2: uploadToR2,
      },
      ...(result.errors.length > 0 && { errors: result.errors }),
    };

    const statusCode = result.success ? 
      (result.failedProjects.length > 0 ? 207 : 200) : // 207 = Multi-Status (partial success)
      500;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    return handleApiError(error, 'POST /api/migrate-from-localstorage');
  }
}

/**
 * GET /api/migrate-from-localstorage/stats
 * Get migration statistics for localStorage data (for preview)
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

    // This is a placeholder since we can't access localStorage server-side
    // The frontend will need to send the data for analysis
    return NextResponse.json({
      success: true,
      message: 'Migration stats endpoint ready',
      data: {
        note: 'Send localStorage projects data via POST to get migration preview',
      },
    });

  } catch (error) {
    return handleApiError(error, 'GET /api/migrate-from-localstorage');
  }
}