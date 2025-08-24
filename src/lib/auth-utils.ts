import { auth } from '@/auth';
import { ProjectService } from './project-service';
import { NextRequest } from 'next/server';

/**
 * Validate user session and return user ID
 */
export async function validateUserSession(): Promise<string> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new AuthError('Unauthorized - Please log in', 401);
  }
  
  return session.user.id;
}

/**
 * Validate project access for a user
 */
export async function validateProjectAccess(projectId: string, userId: string) {
  const project = await ProjectService.getProject(projectId, userId);
  
  if (!project) {
    throw new AuthError('Project not found or access denied', 404);
  }
  
  return project;
}

/**
 * Extract user ID from request with proper error handling
 */
export async function getUserFromRequest(): Promise<string> {
  try {
    return await validateUserSession();
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Authentication failed', 401);
  }
}

/**
 * Validate API key from request headers (if implementing API key auth)
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    // If no API key is configured, skip validation
    return true;
  }
  
  return apiKey === validApiKey;
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  
  if (!userLimit || now - userLimit.lastReset > windowMs) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return true;
  }
  
  if (userLimit.count >= maxRequests) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

/**
 * Custom auth error class
 */
export class AuthError extends Error {
  constructor(
    message: string, 
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Project access error class
 */
export class ProjectAccessError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ProjectAccessError';
  }
}

/**
 * File upload error class
 */
export class FileUploadError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'FileUploadError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Generic API error handler
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  details?: any
) {
  return {
    success: false,
    error: message,
    statusCode,
    ...(details && { details }),
  };
}

/**
 * Success response helper
 */
export function createApiSuccess<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Middleware to check subscription status (if needed)
 */
export async function validateSubscription(userId: string): Promise<boolean> {
  // This would integrate with your subscription system
  // For now, return true to allow all authenticated users
  return true;
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Extract sorting parameters from request
 */
export function getSortParams(request: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  
  if (!allowedFields.includes(sortBy)) {
    throw new ValidationError(`Invalid sort field: ${sortBy}`);
  }
  
  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new ValidationError(`Invalid sort order: ${sortOrder}`);
  }
  
  return { sortBy, sortOrder: sortOrder as 'asc' | 'desc' };
}

/**
 * Validate request content type
 */
export function validateContentType(
  request: NextRequest, 
  expectedType: string = 'application/json'
): boolean {
  const contentType = request.headers.get('content-type');
  return contentType?.includes(expectedType) || false;
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON body');
  }
}