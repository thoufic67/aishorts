# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 14 application for creating AI-generated short video content with subscription billing. The app generates video scripts using OpenAI API and processes them through Remotion for video creation. It includes a complete SaaS billing system powered by Lemon Squeezy.

**Key Technologies:**
- Next.js 14 (App Router)
- TypeScript
- Drizzle ORM with PostgreSQL (Neon)
- Auth.js v5 (Google OAuth)
- Lemon Squeezy for billing
- Remotion for video processing
- OpenAI API for script generation
- Tailwind CSS + shadcn/ui

## Development Commands

```bash
# Development
pnpm dev                # Start dev server on port 3030
pnpm build              # Build for production
pnpm start              # Start production server

# Database
pnpm db:push            # Push schema changes to database
pnpm db:studio          # Open Drizzle Studio at https://local.drizzle.studio

# Code Quality
pnpm lint               # Run ESLint
pnpm typecheck          # Run TypeScript compiler check
pnpm format             # Check Prettier formatting
pnpm format:fix         # Fix Prettier formatting
```

## Architecture

### Authentication & Authorization
- Uses Auth.js v5 with Google OAuth provider
- Database adapter connects to Drizzle ORM
- Protected dashboard routes require authentication
- Auth configuration in `src/auth.ts`

### Database Schema
- **Users**: Standard Auth.js user table
- **Accounts/Sessions**: OAuth account linking and session management
- **Plans**: Lemon Squeezy subscription plans
- **Subscriptions**: User subscription records
- **WebhookEvents**: Lemon Squeezy webhook event processing

### Video Script Generation
- AI-powered script generation using OpenAI API
- Script styles configuration in `src/lib/script-config.ts`
- Currently supports "Dark & Eerie Survival rule" style with fine-tuned GPT model
- API endpoint: `POST /api/generate-script`

### Billing Integration
- Lemon Squeezy integration for subscription management
- Webhook processing for subscription events (`subscription_created`, `subscription_updated`)
- Webhook endpoint: `/api/webhook`
- Customer billing dashboard with plan management

### Video Processing
- Remotion integration for video composition and rendering
- Video editor components in `src/components/video-editor/`
- Custom webpack configuration for Remotion compatibility

## Key Directories

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by feature
- `src/lib/` - Utility functions and service integrations
- `src/db/` - Database schema and configuration
- `src/types/` - TypeScript type definitions
- `src/config/` - Configuration files (Lemon Squeezy)

## Environment Setup

Critical environment variables (see README.md for full setup):
- `POSTGRES_URL` - Neon database connection
- `LEMONSQUEEZY_API_KEY` - Billing integration
- `OPENAI_API_KEY` - Script generation
- `AUTH_GITHUB_ID/SECRET` - OAuth authentication
- `WEBHOOK_URL` - For local development tunneling

## Testing & Deployment

- Run `pnpm typecheck` before commits to ensure TypeScript compliance
- Database changes require `pnpm db:push` to sync schema
- Webhooks require accessible URL for local development (use ngrok/LocalCan)
- Production deployment requires switching Lemon Squeezy from test mode to live mode