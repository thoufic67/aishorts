"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Video, Clock, MoreVertical, Play, Trash2 } from "lucide-react";
import { useProjects, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/types/project";
import { toast } from "sonner";
import { MigrationBanner } from "@/components/migration";

const Dashboard = () => {
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const router = useRouter();
  
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const deleteProject = useDeleteProject();

  const handleCreateProject = () => {
    router.push("/create-video");
  };

  const handleOpenProject = (projectId: string) => {
    // Set current project is handled by the project client
    router.push(`/project/${projectId}/workflow`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteProjectId(projectId);
  };

  const confirmDeleteProject = async () => {
    if (!deleteProjectId) return;
    
    try {
      await deleteProject.mutateAsync(deleteProjectId);
      toast.success('Project deleted successfully');
      setDeleteProjectId(null);
    } catch (error) {
      toast.error('Failed to delete project');
      console.error('Delete error:', error);
    }
  };

  const getProjectStatus = (project: Project): string => {
    return project.status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return "Just now";
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

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Your Projects</h1>
            <p className="text-foreground/70">
              Create and manage your AI-generated videos
            </p>
          </div>
          <Button variant="default" size="lg" onClick={handleCreateProject}>
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </div>

        {/* Migration Banner - shows when localStorage projects are detected */}
        <MigrationBanner />

        {/* Stats */}
        {/* <div className="mb-8 grid gap-6 md:grid-cols-4">
          <Card className="bg-card/50 p-6 backdrop-blur-sm">
            <div className="text-2xl font-bold text-primary">
              {projects.length}
            </div>
            <div className="text-sm text-foreground/70">Total Projects</div>
          </Card>
          <Card className="bg-card/50 p-6 backdrop-blur-sm">
            <div className="text-accent text-2xl font-bold">
              {
                projects.filter((p) => getProjectStatus(p) === "completed")
                  .length
              }
            </div>
            <div className="text-sm text-foreground/70">Completed</div>
          </Card>
          <Card className="bg-card/50 p-6 backdrop-blur-sm">
            <div className="text-primary-glow text-2xl font-bold">
              {projects.reduce(
                (acc, p) => acc + Object.keys(p.generatedImages || {}).length,
                0,
              )}
            </div>
            <div className="text-sm text-foreground/70">Total Images</div>
          </Card>
          <Card className="bg-card/50 p-6 backdrop-blur-sm">
            <div className="text-accent-glow text-2xl font-bold">
              {projects.reduce(
                (acc, p) => acc + Object.keys(p.generatedVideos || {}).length,
                0,
              )}
            </div>
            <div className="text-sm text-foreground/70">Total Videos</div>
          </Card>
        </div> */}

        {/* Loading State */}
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-card/30 p-8 text-center backdrop-blur-sm">
            <div className="text-destructive mb-4">
              <Video className="mx-auto h-12 w-12" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Failed to load projects</h3>
            <p className="mb-4 text-foreground/70">
              {error.message || "Something went wrong while loading your projects."}
            </p>
            <Button onClick={() => refetch()}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const status = getProjectStatus(project);
              const thumbnailImage = project.segments?.find(s => 
                s.files?.some(f => f.fileType === 'image')
              )?.files?.find(f => f.fileType === 'image')?.r2Url;

              return (
                <Card
                  key={project.id}
                  className="group cursor-pointer overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:bg-card/50"
                  onClick={() => handleOpenProject(project.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-secondary/50">
                    {thumbnailImage ? (
                      <img
                        src={thumbnailImage}
                        alt={project.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="h-12 w-12 text-foreground/30" />
                        </div>
                      </>
                    )}
                    <div className="absolute right-3 top-3 flex gap-2">
                      <Badge
                        variant={getStatusVariant(status) as any}
                        className="text-xs"
                      >
                        {getStatusLabel(status)}
                      </Badge>
                    </div>
                    <div className="absolute left-3 top-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 bg-background/80 p-0 hover:bg-background"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        disabled={deleteProject.isPending}
                      >
                        {deleteProject.isPending && deleteProjectId === project.id ? (
                          <Loading size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">
                        {project.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(project.id);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm text-foreground/70">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {project.segments?.length || 0} segments
                      </div>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>

                    {project.idea && (
                      <p className="mt-2 line-clamp-2 text-xs text-foreground/60">
                        {project.idea}
                      </p>
                    )}

                    {project.duration && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-foreground/60">
                        <Clock className="h-3 w-3" />
                        {Math.round(project.duration)}s duration
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty state for new users */}
        {!isLoading && !error && projects.length === 0 && (
          <Card className="bg-card/30 p-12 text-center backdrop-blur-sm">
            <Video className="mx-auto mb-4 h-16 w-16 text-foreground/30" />
            <h3 className="mb-2 text-xl font-semibold">No projects yet</h3>
            <p className="mb-6 text-foreground/70">
              Create your first AI-generated video to get started
            </p>
            <Button variant="default" onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Project
            </Button>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
              All associated files and data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteProjectId(null)}
              disabled={deleteProject.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteProject}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
