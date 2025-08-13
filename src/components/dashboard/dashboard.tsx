"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, Clock, MoreVertical, Play, Trash2 } from "lucide-react";
import { ProjectStorage, ProjectData } from "@/lib/project-storage";

const Dashboard = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    const allProjects = ProjectStorage.getProjectsList();
    setProjects(allProjects);
  };

  const handleCreateProject = () => {
    console.log("thoufic handlecreateproject");
    router.push("/create-video");
  };

  const handleOpenProject = (projectId: string) => {
    ProjectStorage.setCurrentProject(projectId);
    router.push(`/project/${projectId}/workflow`);
  };

  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ProjectStorage.deleteProject(projectId);
    loadProjects();
  };

  const getProjectStatus = (project: ProjectData) => {
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

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
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
      default:
        return "outline";
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

        {/* Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = getProjectStatus(project);
            return (
              <Card
                key={project.id}
                className="group cursor-pointer overflow-hidden border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:bg-card/50"
                onClick={() => handleOpenProject(project.id)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-secondary/50">
                  {Object.values(project.generatedImages || {})[0] ? (
                    <img
                      src={Object.values(project.generatedImages)[0]}
                      alt={project.title}
                      className="h-full w-full object-cover"
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
                      variant={getStatusVariant(status)}
                      className="text-xs"
                    >
                      {status.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="absolute left-3 top-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 bg-background/80 p-0 hover:bg-background"
                      onClick={(e) => handleDeleteProject(project.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
                      {project.scriptLines?.length || 0} lines
                    </div>
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>

                  {project.idea && (
                    <p className="mt-2 line-clamp-2 text-xs text-foreground/60">
                      {project.idea}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Empty state for new users */}
        {projects.length === 0 && (
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
    </div>
  );
};

export default Dashboard;
