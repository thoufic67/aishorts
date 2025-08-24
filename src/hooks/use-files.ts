/**
 * React Query hooks for file management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api-client';
import { ProjectFile, FileUploadOptions } from '@/types/project';
import { projectQueryKeys } from './use-projects';

// Query keys for files
export const fileQueryKeys = {
  all: ['files'] as const,
  lists: () => [...fileQueryKeys.all, 'list'] as const,
  projectFiles: (projectId: string) => [...fileQueryKeys.lists(), 'project', projectId] as const,
  segmentFiles: (projectId: string, segmentId: string) =>
    [...fileQueryKeys.lists(), 'segment', projectId, segmentId] as const,
  details: () => [...fileQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileQueryKeys.details(), id] as const,
};

/**
 * Hook to get all files for a project
 */
export function useProjectFiles(projectId: string) {
  return useQuery({
    queryKey: fileQueryKeys.projectFiles(projectId),
    queryFn: () => ApiClient.getProjectFiles(projectId),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get files for a specific segment
 */
export function useSegmentFiles(projectId: string, segmentId: string) {
  return useQuery({
    queryKey: fileQueryKeys.segmentFiles(projectId, segmentId),
    queryFn: () => ApiClient.getSegmentFiles(projectId, segmentId),
    enabled: !!projectId && !!segmentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get a specific file
 */
export function useFile(fileId: string) {
  return useQuery({
    queryKey: fileQueryKeys.detail(fileId),
    queryFn: () => ApiClient.getFile(fileId),
    enabled: !!fileId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to upload a file
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      projectId,
      segmentId,
      options,
    }: {
      file: File;
      projectId: string;
      segmentId?: string;
      options?: FileUploadOptions;
    }) => ApiClient.uploadFile(file, projectId, segmentId, options),
    onSuccess: (uploadedFile, { projectId, segmentId }) => {
      // Add to project files cache
      queryClient.setQueryData<ProjectFile[]>(
        fileQueryKeys.projectFiles(projectId),
        (old) => {
          if (!old) return [uploadedFile];
          return [uploadedFile, ...old];
        }
      );

      // Add to segment files cache if segment specified
      if (segmentId) {
        queryClient.setQueryData<ProjectFile[]>(
          fileQueryKeys.segmentFiles(projectId, segmentId),
          (old) => {
            if (!old) return [uploadedFile];
            return [uploadedFile, ...old];
          }
        );
      }

      // Update project cache to include the new file
      queryClient.setQueryData(projectQueryKeys.detail(projectId), (old: any) => {
        if (!old) return old;
        const files = [...(old.files || []), uploadedFile];
        return { ...old, files };
      });

      // Set file in detail cache
      queryClient.setQueryData(fileQueryKeys.detail(uploadedFile.id), uploadedFile);
    },
  });
}

/**
 * Hook to upload base64 file (for AI-generated images)
 */
export function useUploadBase64File() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      base64Data,
      fileName,
      fileType,
      projectId,
      segmentId,
      options,
    }: {
      base64Data: string;
      fileName: string;
      fileType: ProjectFile['fileType'];
      projectId: string;
      segmentId?: string;
      options?: FileUploadOptions;
    }) =>
      ApiClient.uploadBase64File(
        base64Data,
        fileName,
        fileType,
        projectId,
        segmentId,
        options
      ),
    onSuccess: (uploadedFile, { projectId, segmentId }) => {
      // Add to project files cache
      queryClient.setQueryData<ProjectFile[]>(
        fileQueryKeys.projectFiles(projectId),
        (old) => {
          if (!old) return [uploadedFile];
          return [uploadedFile, ...old];
        }
      );

      // Add to segment files cache if segment specified
      if (segmentId) {
        queryClient.setQueryData<ProjectFile[]>(
          fileQueryKeys.segmentFiles(projectId, segmentId),
          (old) => {
            if (!old) return [uploadedFile];
            return [uploadedFile, ...old];
          }
        );
      }

      // Update project cache
      queryClient.setQueryData(projectQueryKeys.detail(projectId), (old: any) => {
        if (!old) return old;
        const files = [...(old.files || []), uploadedFile];
        return { ...old, files };
      });

      // Set file in detail cache
      queryClient.setQueryData(fileQueryKeys.detail(uploadedFile.id), uploadedFile);
    },
  });
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => ApiClient.deleteFile(fileId),
    onMutate: async (fileId) => {
      // Get the file to know which caches to update
      const file = queryClient.getQueryData<ProjectFile>(fileQueryKeys.detail(fileId));
      return { file };
    },
    onSuccess: (_, fileId, context) => {
      const file = context?.file;
      if (!file) return;

      // Remove from project files cache
      queryClient.setQueryData<ProjectFile[]>(
        fileQueryKeys.projectFiles(file.projectId),
        (old) => {
          if (!old) return old;
          return old.filter((f) => f.id !== fileId);
        }
      );

      // Remove from segment files cache if applicable
      if (file.segmentId) {
        queryClient.setQueryData<ProjectFile[]>(
          fileQueryKeys.segmentFiles(file.projectId, file.segmentId),
          (old) => {
            if (!old) return old;
            return old.filter((f) => f.id !== fileId);
          }
        );
      }

      // Update project cache
      queryClient.setQueryData(projectQueryKeys.detail(file.projectId), (old: any) => {
        if (!old) return old;
        const files = old.files?.filter((f: ProjectFile) => f.id !== fileId) || [];
        return { ...old, files };
      });

      // Remove from detail cache
      queryClient.removeQueries({ queryKey: fileQueryKeys.detail(fileId) });
    },
  });
}

/**
 * Hook to delete multiple files
 */
export function useDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileIds: string[]) => ApiClient.deleteFiles(fileIds),
    onSuccess: (_, fileIds) => {
      // For each file ID, remove from all relevant caches
      fileIds.forEach((fileId) => {
        const file = queryClient.getQueryData<ProjectFile>(fileQueryKeys.detail(fileId));
        if (file) {
          // Remove from project files
          queryClient.setQueryData<ProjectFile[]>(
            fileQueryKeys.projectFiles(file.projectId),
            (old) => {
              if (!old) return old;
              return old.filter((f) => f.id !== fileId);
            }
          );

          // Remove from segment files if applicable
          if (file.segmentId) {
            queryClient.setQueryData<ProjectFile[]>(
              fileQueryKeys.segmentFiles(file.projectId, file.segmentId),
              (old) => {
                if (!old) return old;
                return old.filter((f) => f.id !== fileId);
              }
            );
          }

          // Update project cache
          queryClient.setQueryData(projectQueryKeys.detail(file.projectId), (old: any) => {
            if (!old) return old;
            const files = old.files?.filter((f: ProjectFile) => !fileIds.includes(f.id)) || [];
            return { ...old, files };
          });
        }

        // Remove from detail cache
        queryClient.removeQueries({ queryKey: fileQueryKeys.detail(fileId) });
      });
    },
  });
}

/**
 * Hook to update file metadata
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fileId,
      data,
    }: {
      fileId: string;
      data: Partial<{
        fileName: string;
        originalName: string;
        metadata: any;
      }>;
    }) => ApiClient.updateFile(fileId, data),
    onSuccess: (updatedFile, { fileId }) => {
      // Update detail cache
      queryClient.setQueryData(fileQueryKeys.detail(fileId), updatedFile);

      // Update project files cache
      queryClient.setQueryData<ProjectFile[]>(
        fileQueryKeys.projectFiles(updatedFile.projectId),
        (old) => {
          if (!old) return old;
          return old.map((f) => (f.id === fileId ? updatedFile : f));
        }
      );

      // Update segment files cache if applicable
      if (updatedFile.segmentId) {
        queryClient.setQueryData<ProjectFile[]>(
          fileQueryKeys.segmentFiles(updatedFile.projectId, updatedFile.segmentId),
          (old) => {
            if (!old) return old;
            return old.map((f) => (f.id === fileId ? updatedFile : f));
          }
        );
      }

      // Update project cache
      queryClient.setQueryData(projectQueryKeys.detail(updatedFile.projectId), (old: any) => {
        if (!old) return old;
        const files = old.files?.map((f: ProjectFile) =>
          f.id === fileId ? updatedFile : f
        ) || [];
        return { ...old, files };
      });
    },
  });
}

/**
 * Hook to get file download URL
 */
export function useFileDownloadUrl() {
  return useMutation({
    mutationFn: (fileId: string) => ApiClient.getFileDownloadUrl(fileId),
  });
}