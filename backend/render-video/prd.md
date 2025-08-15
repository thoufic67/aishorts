Product Requirements Document (PRD): Remotion Lambda Video Rendering with Cloudflare R2
Integration

Executive Summary

This PRD outlines the implementation of cloud-based video rendering using Remotion Lambda
with Cloudflare R2 storage for the AI Shorts video generation platform. The solution will
move video rendering from client-side processing to serverless cloud infrastructure,
providing scalability, reliability, and cost optimization through R2's zero-egress-fee
model.

Current Architecture Analysis

Existing Video Data Structure

- Video Format: Configurable width/height (currently supports vertical 9:16 ratio)
- Segments: Array of video segments with text, images, audio, and timing data
- Audio: Generated TTS audio files with word-level timing synchronization
- Captions: Dynamic word-by-word highlighting with customizable styling
- Media: Background images/videos with overlay support
- Duration: Variable segment durations with precise frame calculations

Current Tech Stack

- Next.js 14 with App Router
- Remotion 4.0.332 (client-side rendering)
- OpenAI API for content generation
- Drizzle ORM with PostgreSQL
- Audio processing with temp file storage

Problem Statement

1. Performance: Client-side video rendering is resource-intensive and slow
2. Scalability: Cannot handle concurrent users or large video files efficiently
3. Reliability: Browser crashes and timeouts during complex renders
4. Storage: Temporary audio files accumulate in public/temp directory
5. User Experience: Long waiting times and potential failures

Solution Overview

Implement Remotion Lambda for server-side video rendering with Cloudflare R2 for asset
storage and output delivery, providing:

- Serverless video rendering at scale
- Zero-egress-fee storage with R2
- Reliable processing pipeline
- Improved user experience

Technical Requirements

Core Infrastructure

1. Remotion Lambda Setup

// Required environment variables
R2_ACCESS_KEY_ID=<cloudflare-r2-access-key>
R2_SECRET_ACCESS_KEY=<cloudflare-r2-secret>
R2_ENDPOINT=<account-subdomain>.r2.cloudflarestorage.com
R2_BUCKET_NAME=aishorts-video-assets
AWS_LAMBDA_REGION=us-east-1

2. Cloudflare R2 Bucket Structure

aishorts-video-assets/
├── assets/
│ ├── audio/ # Generated TTS audio files
│ ├── images/ # AI-generated images
│ ├── backgrounds/ # Background videos/overlays
│ └── fonts/ # Custom fonts for captions
├── renders/
│ ├── videos/ # Final rendered videos
│ ├── previews/ # Thumbnail previews
│ └── temp/ # Temporary render assets
└── user-uploads/ # User-provided media

3. Lambda Function Configuration

- Memory: 3008 MB (maximum for optimal performance)
- Timeout: 15 minutes (900 seconds)
- Runtime: Node.js 18.x
- Concurrent executions: 10 (adjustable based on usage)

API Integration

1. Video Rendering Endpoint

// POST /api/render-video
interface RenderVideoRequest {
videoId: string;
video: VideoGenerationData;
renderQuality: 'preview' | 'hd' | '4k';
webhook?: string; // Optional webhook for completion notification
}

interface RenderVideoResponse {
success: boolean;
renderId: string;
estimatedTime: number; // in seconds
status: 'queued' | 'rendering' | 'completed' | 'failed';
outputUrl?: string; // R2 URL when completed
}

2. Render Status Tracking

// GET /api/render-status/:renderId
interface RenderStatusResponse {
renderId: string;
status: 'queued' | 'rendering' | 'completed' | 'failed';
progress: number; // 0-100
outputUrl?: string;
previewUrl?: string;
error?: string;
}

Database Schema Updates

1. Render Jobs Table

CREATE TABLE render_jobs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id VARCHAR NOT NULL,
video_id VARCHAR NOT NULL,
lambda_render_id VARCHAR UNIQUE,
status VARCHAR NOT NULL DEFAULT 'queued',
quality VARCHAR NOT NULL DEFAULT 'hd',
progress INTEGER DEFAULT 0,
output_url VARCHAR,
preview_url VARCHAR,
error_message TEXT,
estimated_duration INTEGER,
actual_duration INTEGER,
created_at TIMESTAMP DEFAULT NOW(),
started_at TIMESTAMP,
completed_at TIMESTAMP
);

2. Asset Management Table

CREATE TABLE video_assets (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
video_id VARCHAR NOT NULL,
asset_type VARCHAR NOT NULL, -- 'audio', 'image', 'background'
original_url VARCHAR,
r2_url VARCHAR NOT NULL,
file_size BIGINT,
mime_type VARCHAR,
created_at TIMESTAMP DEFAULT NOW()
);

Implementation Plan

Phase 1: Infrastructure Setup (Week 1-2)

1.1 Cloudflare R2 Configuration

- Create R2 bucket with proper CORS settings
- Generate API credentials with appropriate permissions
- Set up bucket lifecycle policies for temp file cleanup

  1.2 Remotion Lambda Deployment

- Deploy Lambda function with Remotion runtime
- Configure environment variables and IAM roles
- Set up CloudWatch logging and monitoring

  1.3 Asset Migration Strategy

- Implement R2 upload utilities
- Create asset sync service for existing audio files
- Update file serving to use R2 URLs

Phase 2: Core Rendering Pipeline (Week 3-4)

2.1 Video Composition Updates

// Enhanced composition for Lambda rendering
export const VideoComposition: React.FC<VideoCompositionProps> = ({
video,
renderQuality = 'hd'
}) => {
// Optimize assets based on render quality
const assetQuality = renderQuality === '4k' ? 'high' : 'medium';

    // Implement progressive loading for assets
    const segments = useOptimizedSegments(video.segments, assetQuality);

    return (
      <AbsoluteFill>
        {/* Render optimized segments */}
      </AbsoluteFill>
    );

};

2.2 Lambda Render Service

export class RemotionLambdaService {
static async renderVideo(
video: VideoGenerationData,
quality: RenderQuality
): Promise<RenderResult> {
// Upload assets to R2
const assetUrls = await this.uploadAssets(video);

      // Trigger Lambda render
      const renderResult = await renderMediaOnLambda({
        region: 'us-east-1',
        functionName: 'remotion-render',
        composition: 'VideoComposition',
        inputProps: { video: { ...video, assetUrls } },
        codec: 'h264',
        imageFormat: 'jpeg',
        crf: quality === '4k' ? 18 : 23,
        outName: {
          bucketName: process.env.R2_BUCKET_NAME!,
          key: `renders/videos/${video.video._id}.mp4`,
          s3OutputProvider: {
            endpoint: process.env.R2_ENDPOINT!,
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        },
      });

      return renderResult;
    }

}

Phase 3: User Experience Enhancement (Week 5-6)

3.1 Real-time Progress Updates

- Implement WebSocket or Server-Sent Events for progress tracking
- Create progress visualization component
- Add estimated completion time calculation

  3.2 Preview Generation

- Generate low-quality preview renders for quick feedback
- Implement thumbnail extraction at key frames
- Create preview player component

  3.3 Queue Management

- Implement render queue with priority levels
- Add user notification system for completion
- Create retry mechanism for failed renders

Cost Analysis

Cloudflare R2 Pricing (2025)

- Storage: $0.015/GB/month
- Class A Operations (write): $4.50/million requests
- Class B Operations (read): $0.36/million requests
- Egress: $0.00 (zero egress fees)

AWS Lambda Pricing Estimates

- Requests: $0.20 per 1M requests
- Duration: $0.0000166667 per GB-second
- Estimated cost per video: $0.10-0.50 depending on complexity

Monthly Cost Projection (1000 videos)

- Storage (100GB): $1.50
- Operations: $5.00
- Lambda compute: $300-500
- Total: ~$310-510/month

Risk Assessment & Mitigation

Technical Risks

1. Lambda cold starts: Mitigate with provisioned concurrency
2. Asset upload failures: Implement retry logic and checksums
3. Render timeouts: Add progress monitoring and partial recovery

Business Risks

1. Cost overruns: Implement usage monitoring and alerts
2. Vendor lock-in: Use S3-compatible APIs for portability
3. Performance degradation: Monitor metrics and auto-scaling

Success Metrics

Performance KPIs

- Render time: <2 minutes for HD, <5 minutes for 4K
- Success rate: >99% completion rate
- Queue time: <30 seconds during peak hours
- Cost per render: <$0.50 average

User Experience KPIs

- User satisfaction: >4.5/5 rating
- Bounce rate: <10% during render process
- Concurrent renders: Support 50+ simultaneous renders

Future Enhancements

Advanced Features

1. Batch rendering: Process multiple videos simultaneously
2. Custom codecs: Support for VP9, AV1 for better compression
3. Live streaming: Real-time video generation capabilities
4. Edge rendering: Deploy Lambda functions globally for reduced latency

Integration Opportunities

1. CDN integration: Cloudflare CDN for faster video delivery
2. Analytics: Detailed render performance analytics
3. API monetization: Expose rendering API for third-party developers

This PRD provides a comprehensive roadmap for implementing Remotion Lambda with Cloudflare
R2, addressing current limitations while building a scalable foundation for future growth.
