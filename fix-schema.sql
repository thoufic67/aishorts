-- Add missing columns to project table
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "voice" text DEFAULT 'openai_echo';
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'faceless_video';
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "mediaType" text DEFAULT 'images';
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "isRemotion" boolean DEFAULT true;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "selectedModel" text DEFAULT 'basic';
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "audioType" text DEFAULT 'library';
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "audioPrompt" text;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "watermark" boolean DEFAULT true;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "isFeatured" boolean DEFAULT false;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "selectedMedia" jsonb DEFAULT '{"images":[],"videos":[]}'::jsonb;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "tiktokDescription" text;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "youtubeDescription" text;

-- Add missing columns to projectSegment table
ALTER TABLE "projectSegment" ADD COLUMN IF NOT EXISTS "imageUrl" text;
ALTER TABLE "projectSegment" ADD COLUMN IF NOT EXISTS "audioUrl" text;
ALTER TABLE "projectSegment" ADD COLUMN IF NOT EXISTS "media" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "projectSegment" ADD COLUMN IF NOT EXISTS "elements" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "projectSegment" ADD COLUMN IF NOT EXISTS "overlayId" text;

-- Create missing tables
CREATE TABLE IF NOT EXISTS "overlayAsset" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"author" text,
	"url" text NOT NULL,
	"preview" text,
	"type" text DEFAULT 'overlay' NOT NULL,
	"isPublic" boolean DEFAULT true,
	"promptId" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projectLayer" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"type" text NOT NULL,
	"captionStyle" jsonb,
	"volume" real DEFAULT 1,
	"url" text,
	"assetId" text,
	"order" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projectTrack" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"settings" jsonb,
	"order" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
 ALTER TABLE "projectLayer" ADD CONSTRAINT "projectLayer_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "projectLayer" ADD CONSTRAINT "projectLayer_assetId_overlayAsset_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."overlayAsset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "projectTrack" ADD CONSTRAINT "projectTrack_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "projectSegment" ADD CONSTRAINT "projectSegment_overlayId_overlayAsset_id_fk" FOREIGN KEY ("overlayId") REFERENCES "public"."overlayAsset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;