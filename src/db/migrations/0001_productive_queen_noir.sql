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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "projectSegment" ADD COLUMN "imageUrl" text;--> statement-breakpoint
ALTER TABLE "projectSegment" ADD COLUMN "audioUrl" text;--> statement-breakpoint
ALTER TABLE "projectSegment" ADD COLUMN "media" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projectSegment" ADD COLUMN "elements" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projectSegment" ADD COLUMN "overlayId" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "voice" text DEFAULT 'openai_echo';--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "type" text DEFAULT 'faceless_video';--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "mediaType" text DEFAULT 'images';--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "isRemotion" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "selectedModel" text DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "audioType" text DEFAULT 'library';--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "audioPrompt" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "watermark" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "isFeatured" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "selectedMedia" jsonb DEFAULT '{"images":[],"videos":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "tiktokDescription" text;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "youtubeDescription" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projectLayer" ADD CONSTRAINT "projectLayer_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projectLayer" ADD CONSTRAINT "projectLayer_assetId_overlayAsset_id_fk" FOREIGN KEY ("assetId") REFERENCES "public"."overlayAsset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projectTrack" ADD CONSTRAINT "projectTrack_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "projectSegment" ADD CONSTRAINT "projectSegment_overlayId_overlayAsset_id_fk" FOREIGN KEY ("overlayId") REFERENCES "public"."overlayAsset"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
