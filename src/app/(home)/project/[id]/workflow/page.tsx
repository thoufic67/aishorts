"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit3,
  Image,
  Video,
  Download,
  Play,
  RefreshCw,
} from "lucide-react";
import { ProjectStorage, ProjectData } from "@/lib/project-storage";

const ProjectWorkflowPage = () => {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = () => {
    setLoading(true);
    const projectData = ProjectStorage.getProject(projectId);
    if (!projectData) {
      router.push("/dashboard");
      return;
    }
    setProject(projectData);
    setLoading(false);
  };

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const getProjectStatus = () => {
    if (!project) return "draft";

    // Check if project has segments (new video creation workflow)
    if (project.segments && project.segments.length > 0) {
      const segmentsWithImages = project.segments.filter(s => s.imageUrl).length;
      const segmentsWithAudio = project.segments.filter(s => s.audioUrl).length;
      
      if (segmentsWithImages === project.segments.length && segmentsWithAudio === project.segments.length) {
        return "completed";
      } else if (segmentsWithImages > 0 || segmentsWithAudio > 0) {
        return "generating";
      } else {
        return "script-ready";
      }
    }

    // Fallback to old system for backward compatibility
    if (
      project.generatedVideos &&
      Object.keys(project.generatedVideos).length > 0
    ) {
      return "completed";
    } else if (
      project.generatedImages &&
      Object.keys(project.generatedImages).length > 0
    ) {
      return "generating";
    } else if (project.script) {
      return "script-ready";
    }
    return "draft";
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "generating":
        return "secondary";
      case "script-ready":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Project not found
            </h1>
            <p className="mt-2 text-foreground/70">
              The project you're looking for doesn't exist.
            </p>
            <Button onClick={handleGoBack} className="mt-4">
              Go Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = getProjectStatus();

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <Badge variant={getStatusVariant(status)} className="text-xs">
                {status.replace("-", " ")}
              </Badge>
            </div>
            {project.idea && (
              <p className="mt-1 text-foreground/70">{project.idea}</p>
            )}
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Step 1: Script */}
          <Card className="bg-card/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                <Edit3 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold">1. Script Generation</h3>
            </div>

            {project.script ? (
              <div className="space-y-3">
                <p className="text-sm text-green-600">
                  ✓ Script generated ({project.segments?.length || project.scriptLines?.length || 0} segments)
                </p>
                <div className="max-h-32 overflow-y-auto rounded bg-background/50 p-3 text-xs">
                  {project.script}
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Edit3 className="mr-2 h-3 w-3" />
                  Edit Script
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Generate a script based on your idea
                </p>
                <Button className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Script
                </Button>
              </div>
            )}
          </Card>

          {/* Step 2: Images */}
          <Card className="bg-card/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                <Image className="h-4 w-4 text-accent" />
              </div>
              <h3 className="font-semibold">2. Image Generation</h3>
            </div>

            {(() => {
              const segmentImages = project.segments?.filter(s => s.imageUrl).map(s => s.imageUrl!) || [];
              const legacyImages = Object.values(project.generatedImages || {});
              const allImages = [...segmentImages, ...legacyImages];
              
              return allImages.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">
                    ✓ {allImages.length} images generated
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {allImages
                      .slice(0, 4)
                      .map((imageUrl, index) => (
                        <div
                          key={index}
                          className="aspect-square overflow-hidden rounded bg-background/50"
                        >
                          <img
                            src={imageUrl}
                            alt={`Generated image ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Image className="mr-2 h-3 w-3" />
                    View All Images
                  </Button>
                </div>
              ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Generate images for each script line
                </p>
                <Button
                  className="w-full"
                  disabled={!project.script}
                  variant={project.script ? "default" : "outline"}
                >
                  <Image className="mr-2 h-4 w-4" />
                  Generate Images
                </Button>
                {!project.script && (
                  <p className="text-xs text-foreground/50">
                    Complete script first
                  </p>
                )}
              </div>
              );
            })()}
          </Card>

          {/* Step 3: Video */}
          <Card className="bg-card/30 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20">
                <Video className="h-4 w-4 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold">3. Video Creation</h3>
            </div>

            {(() => {
              const segmentAudios = project.segments?.filter(s => s.audioUrl) || [];
              const legacyVideos = Object.values(project.generatedVideos || {});
              const hasContent = segmentAudios.length > 0 || legacyVideos.length > 0;
              
              return hasContent ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">
                    ✓ {segmentAudios.length > 0 ? `${segmentAudios.length} audio segments` : `${legacyVideos.length} videos`} generated
                  </p>
                  <div className="space-y-2">
                    {segmentAudios.length > 0 ? (
                      segmentAudios.slice(0, 3).map((segment, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded bg-background/50 p-2"
                        >
                          <Video className="h-4 w-4 text-foreground/50" />
                          <span className="flex-1 truncate text-xs">
                            Segment {index + 1}: {segment.text.slice(0, 30)}...
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      legacyVideos.slice(0, 2).map((videoUrl, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded bg-background/50 p-2"
                        >
                          <Video className="h-4 w-4 text-foreground/50" />
                          <span className="flex-1 truncate text-xs">
                            Video {index + 1}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="mr-2 h-3 w-3" />
                    {segmentAudios.length > 0 ? 'Export Audio Files' : 'Download All'}
                  </Button>
                </div>
              ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Create videos from generated images
                </p>
                <Button
                  className="w-full"
                  disabled={
                    Object.keys(project.generatedImages || {}).length === 0
                  }
                  variant={
                    Object.keys(project.generatedImages || {}).length > 0
                      ? "default"
                      : "outline"
                  }
                >
                  <Video className="mr-2 h-4 w-4" />
                  Generate Videos
                </Button>
                {Object.keys(project.generatedImages || {}).length === 0 && (
                  <p className="text-xs text-foreground/50">
                    Complete images first
                  </p>
                )}
              </div>
              );
            })()}
          </Card>
        </div>

        {/* Project Details */}
        <Card className="mt-8 bg-card/30 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold">Project Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Created
              </label>
              <p className="text-sm">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Last Updated
              </label>
              <p className="text-sm">
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Segments
              </label>
              <p className="text-sm">{project.segments?.length || project.scriptLines?.length || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Progress
              </label>
              <p className="text-sm capitalize">{status.replace("-", " ")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProjectWorkflowPage;
