import { useState, useCallback } from 'react';

interface MigrationProgress {
  current: number;
  total: number;
  currentProject: string;
  stage: 'preparing' | 'migrating' | 'uploading' | 'completed' | 'error';
}

interface MigrationResult {
  success: boolean;
  totalProjects: number;
  migratedProjects: number;
  failedProjects: string[];
  totalSegments: number;
  totalFiles: number;
  migratedProjectIds: string[];
  errors?: string[];
}

interface MigrationStats {
  totalProjects: number;
  totalSegments: number;
  totalImages: number;
  totalVideos: number;
  estimatedFiles: number;
}

export function useMigration() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get localStorage projects data
   */
  const getLocalStorageData = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const projectsKey = "ai_video_projects";
    const stored = localStorage.getItem(projectsKey);
    return stored ? JSON.parse(stored) : {};
  }, []);

  /**
   * Get migration statistics without migrating
   */
  const getMigrationStats = useCallback((): MigrationStats | null => {
    if (typeof window === 'undefined') return null;

    const projects = getLocalStorageData();
    let totalSegments = 0;
    let totalImages = 0;
    let totalVideos = 0;

    Object.values(projects).forEach((project: any) => {
      if (project.segments) {
        totalSegments += project.segments.length;
        totalImages += project.segments.filter((s: any) => s.imageUrl).length;
        totalVideos += project.segments.filter((s: any) => s.audioUrl).length;
      }
      
      totalImages += Object.keys(project.generatedImages || {}).length;
      totalVideos += Object.keys(project.generatedVideos || {}).length;
    });

    return {
      totalProjects: Object.keys(projects).length,
      totalSegments,
      totalImages,
      totalVideos,
      estimatedFiles: totalImages + totalVideos,
    };
  }, [getLocalStorageData]);

  /**
   * Check if migration is needed
   */
  const needsMigration = useCallback(() => {
    const stats = getMigrationStats();
    return stats ? stats.totalProjects > 0 : false;
  }, [getMigrationStats]);

  /**
   * Migrate localStorage data to database
   */
  const migrateFromLocalStorage = useCallback(async (
    uploadToR2: boolean = true,
    clearLocalStorageAfter: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress({
      current: 0,
      total: 0,
      currentProject: '',
      stage: 'preparing'
    });

    try {
      const projects = getLocalStorageData();
      
      if (!projects || Object.keys(projects).length === 0) {
        throw new Error('No projects found in localStorage');
      }

      const totalProjects = Object.keys(projects).length;
      setProgress(prev => prev ? { ...prev, total: totalProjects, stage: 'migrating' } : null);

      const response = await fetch('/api/migrate-from-localstorage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projects,
          uploadToR2,
          clearLocalStorageAfter,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult(data.data);
      setProgress(prev => prev ? { ...prev, stage: 'completed' } : null);

      // Clear localStorage if requested and migration was successful
      if (clearLocalStorageAfter && data.success) {
        localStorage.removeItem("ai_video_projects");
        localStorage.removeItem("current_project_id");
      }

      return data.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setProgress(prev => prev ? { ...prev, stage: 'error' } : null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getLocalStorageData]);

  /**
   * Export localStorage data as JSON backup
   */
  const exportLocalStorageData = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const projects = getLocalStorageData();
    const currentProjectId = localStorage.getItem("current_project_id");

    const backup = {
      projects,
      currentProjectId,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(backup, null, 2);
  }, [getLocalStorageData]);

  /**
   * Download backup file
   */
  const downloadBackup = useCallback(() => {
    const backup = exportLocalStorageData();
    if (!backup) return;

    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aishorts-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportLocalStorageData]);

  /**
   * Clear localStorage manually
   */
  const clearLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem("ai_video_projects");
    localStorage.removeItem("current_project_id");
  }, []);

  return {
    isLoading,
    progress,
    result,
    error,
    
    // Actions
    migrateFromLocalStorage,
    getMigrationStats,
    needsMigration,
    exportLocalStorageData,
    downloadBackup,
    clearLocalStorage,
  };
}