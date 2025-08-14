export interface VideoSegmentData {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  audioUrl?: string;
  duration?: number;
  order: number;
}

export interface ProjectData {
  id: string;
  title: string;
  idea: string;
  inspirationUrls: string;
  script: string;
  transcripts: string[];
  scriptLines: string[];
  generatedImages: { [key: number]: string };
  generatedVideos: { [key: number]: string };
  segments?: VideoSegmentData[];
  createdAt: number;
  updatedAt: number;
}

export class ProjectStorage {
  private static PROJECTS_KEY = "ai_video_projects";
  private static CURRENT_PROJECT_KEY = "current_project_id";

  static generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static saveProject(projectData: ProjectData): void {
    const projects = this.getAllProjects();
    projects[projectData.id] = {
      ...projectData,
      updatedAt: Date.now(),
    };
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
  }

  static getProject(projectId: string): ProjectData | null {
    const projects = this.getAllProjects();
    return projects[projectId] || null;
  }

  static getAllProjects(): { [key: string]: ProjectData } {
    const stored = localStorage.getItem(this.PROJECTS_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  static deleteProject(projectId: string): void {
    const projects = this.getAllProjects();
    delete projects[projectId];
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
  }

  static createNewProject(idea: string, title?: string): ProjectData {
    const projectId = this.generateProjectId();
    const projectData: ProjectData = {
      id: projectId,
      title: title || `Video Project ${new Date().toLocaleDateString()}`,
      idea,
      inspirationUrls: "",
      script: "",
      transcripts: [],
      scriptLines: [],
      generatedImages: {},
      generatedVideos: {},
      segments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.saveProject(projectData);
    this.setCurrentProject(projectId);
    return projectData;
  }

  static setCurrentProject(projectId: string): void {
    localStorage.setItem(this.CURRENT_PROJECT_KEY, projectId);
  }

  static getCurrentProjectId(): string | null {
    return localStorage.getItem(this.CURRENT_PROJECT_KEY);
  }

  static getProjectsList(): ProjectData[] {
    const projects = this.getAllProjects();
    return Object.values(projects).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static updateProjectField(
    projectId: string,
    field: keyof ProjectData,
    value: any,
  ): void {
    const project = this.getProject(projectId);
    if (project) {
      (project as any)[field] = value;
      this.saveProject(project);
    }
  }

  static updateGeneratedImage(
    projectId: string,
    lineIndex: number,
    imageUrl: string,
  ): void {
    const project = this.getProject(projectId);
    if (project) {
      project.generatedImages[lineIndex] = imageUrl;
      this.saveProject(project);
    }
  }

  static updateGeneratedVideo(
    projectId: string,
    lineIndex: number,
    videoUrl: string,
  ): void {
    const project = this.getProject(projectId);
    if (project) {
      project.generatedVideos[lineIndex] = videoUrl;
      this.saveProject(project);
    }
  }

  static updateSegments(
    projectId: string,
    segments: VideoSegmentData[],
  ): void {
    const project = this.getProject(projectId);
    if (project) {
      project.segments = segments;
      this.saveProject(project);
    }
  }

  static updateSegmentImage(
    projectId: string,
    segmentIndex: number,
    imageUrl: string,
  ): void {
    const project = this.getProject(projectId);
    if (project && project.segments && project.segments[segmentIndex]) {
      project.segments[segmentIndex].imageUrl = imageUrl;
      this.saveProject(project);
    }
  }

  static updateSegmentAudio(
    projectId: string,
    segmentIndex: number,
    audioUrl: string,
    duration?: number,
  ): void {
    const project = this.getProject(projectId);
    if (project && project.segments && project.segments[segmentIndex]) {
      project.segments[segmentIndex].audioUrl = audioUrl;
      if (duration) {
        project.segments[segmentIndex].duration = duration;
      }
      this.saveProject(project);
    }
  }
}
