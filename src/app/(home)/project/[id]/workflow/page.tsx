"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit3,
  Image,
  Video,
  Download,
  Play,
  RefreshCw,
  Settings,
  FileText,
  Upload,
} from "lucide-react";
import { useProject } from "@/hooks/use-projects";
import { useProjectFiles } from "@/hooks/use-files";
import { Project, ProjectFile } from "@/types/project";
import { FileManager } from "@/components/project/file-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ProjectWorkflowPage = () => {
  const [showFileManager, setShowFileManager] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState<'image' | 'video' | 'audio' | undefined>();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { data: project, isLoading, error } = useProject(projectId);
  const { data: projectFiles = [] } = useProjectFiles(projectId);

  const handleGoBack = () => {
    router.push("/dashboard");
  };

  const openFileManager = (filter?: 'image' | 'video' | 'audio') => {
    setFileTypeFilter(filter);
    setShowFileManager(true);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "generating":
        return "secondary";
      case "script-ready":
        return "outline";
      case "draft":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "script-ready":
        return "Script Ready";
      case "generating":
        return "Generating";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "draft":
        return "Draft";
      default:
        return status;
    }
  };

  const getFilesByType = (type: 'image' | 'video' | 'audio'): ProjectFile[] => {
    return projectFiles.filter(file => file.fileType === type);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <div className="flex-1">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Error loading project
            </h1>
            <p className="mt-2 text-foreground/70">
              {error.message || "Something went wrong while loading the project."}
            </p>
            <Button onClick={handleGoBack} className="mt-4">
              Go Back to Dashboard
            </Button>
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
              <Badge variant={getStatusVariant(project.status) as any} className="text-xs">
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            {project.idea && (
              <p className="mt-1 text-foreground/70">{project.idea}</p>
            )}
            {project.description && (
              <p className="mt-1 text-sm text-foreground/60">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openFileManager()}>
              <FileText className="mr-2 h-4 w-4" />
              Files ({projectFiles.length})
            </Button>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
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
                  ✓ Script generated ({project.segments?.length || 0} segments)
                </p>
                <div className="max-h-32 overflow-y-auto rounded bg-background/50 p-3 text-xs">
                  {project.script.substring(0, 300)}
                  {project.script.length > 300 && '...'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit3 className="mr-2 h-3 w-3" />
                    Edit Script
                  </Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
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
              const imageFiles = getFilesByType('image');
              
              return imageFiles.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">
                    ✓ {imageFiles.length} images uploaded/generated
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {imageFiles
                      .slice(0, 4)
                      .map((imageFile, index) => (
                        <div
                          key={imageFile.id}
                          className="aspect-square overflow-hidden rounded bg-background/50"
                          title={imageFile.originalName}
                        >
                          <img
                            src={imageFile.r2Url || imageFile.tempUrl}
                            alt={imageFile.originalName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openFileManager('image')}
                    >
                      <Image className="mr-2 h-3 w-3" />
                      Manage Images
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openFileManager('image')}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/70">
                    Upload or generate images for your project
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={!project.script}
                      variant={project.script ? "default" : "outline"}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openFileManager('image')}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                  {!project.script && (
                    <p className="text-xs text-foreground/50">
                      Complete script first to generate images
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
              <h3 className="font-semibold">3. Media & Export</h3>
            </div>

            {(() => {
              const videoFiles = getFilesByType('video');
              const audioFiles = getFilesByType('audio');
              const hasMedia = videoFiles.length > 0 || audioFiles.length > 0;
              const imageFiles = getFilesByType('image');
              
              return hasMedia ? (
                <div className="space-y-3">
                  <p className="text-sm text-green-600">
                    ✓ {videoFiles.length} videos, {audioFiles.length} audio files
                  </p>
                  <div className="space-y-2">
                    {videoFiles.slice(0, 2).map((videoFile) => (
                      <div
                        key={videoFile.id}
                        className="flex items-center gap-2 rounded bg-background/50 p-2"
                      >
                        <Video className="h-4 w-4 text-foreground/50" />
                        <span className="flex-1 truncate text-xs">
                          {videoFile.originalName}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {audioFiles.slice(0, 2).map((audioFile) => (
                      <div
                        key={audioFile.id}
                        className="flex items-center gap-2 rounded bg-background/50 p-2"
                      >
                        <Video className="h-4 w-4 text-foreground/50" />
                        <span className="flex-1 truncate text-xs">
                          {audioFile.originalName}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openFileManager('video')}
                    >
                      <Video className="mr-2 h-3 w-3" />
                      Manage Media
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/70">
                    Upload media files or generate videos
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      disabled={imageFiles.length === 0}
                      variant={imageFiles.length > 0 ? "default" : "outline"}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => openFileManager('video')}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </Button>
                  </div>
                  {imageFiles.length === 0 && (
                    <p className="text-xs text-foreground/50">
                      Upload images first to generate videos
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-sm">{project.segments?.length || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Status
              </label>
              <p className="text-sm">
                <Badge variant={getStatusVariant(project.status) as any} className="text-xs">
                  {getStatusLabel(project.status)}
                </Badge>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Total Files
              </label>
              <p className="text-sm">{projectFiles.length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Images
              </label>
              <p className="text-sm">{getFilesByType('image').length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Videos
              </label>
              <p className="text-sm">{getFilesByType('video').length}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/70">
                Audio Files
              </label>
              <p className="text-sm">{getFilesByType('audio').length}</p>
            </div>
            {project.duration && (
              <div>
                <label className="text-sm font-medium text-foreground/70">
                  Duration
                </label>
                <p className="text-sm">{Math.round(project.duration)}s</p>
              </div>
            )}
            {project.format && (
              <div>
                <label className="text-sm font-medium text-foreground/70">
                  Format
                </label>
                <p className="text-sm">{project.format.width}x{project.format.height}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* File Manager Dialog */}
      <Dialog open={showFileManager} onOpenChange={setShowFileManager}>
        <DialogContent className="max-w-6xl w-full h-[90vh] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {fileTypeFilter ? `${fileTypeFilter.charAt(0).toUpperCase() + fileTypeFilter.slice(1)} Files` : 'Project Files'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <FileManager
              projectId={projectId}
              fileTypeFilter={fileTypeFilter}
              className="h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectWorkflowPage;
