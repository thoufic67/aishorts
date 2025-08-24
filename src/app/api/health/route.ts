import { NextRequest, NextResponse } from 'next/server';
import { performHealthCheck, addSecurityHeaders } from '@/lib/api-error-handler';

/**
 * GET /api/health
 * System health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const healthStatus = await performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    const response = NextResponse.json(healthStatus, { status: statusCode });
    return addSecurityHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
    return addSecurityHeaders(response);
  }
}