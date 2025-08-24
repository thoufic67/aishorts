'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Video, Music, FileText } from 'lucide-react';
import { ProjectFile } from '@/types/project';
import { useUploadFile } from '@/hooks/use-files';
import { Button } from './button';
import { Card } from './card';
import { Loading } from './loading';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  projectId: string;
  segmentId?: string;
  fileType?: 'image' | 'video' | 'audio' | 'overlay';
  onUploadComplete?: (file: ProjectFile) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number;
  acceptedTypes?: string[];
  multiple?: boolean;
  className?: string;
  disabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export function FileUpload({
  projectId,
  segmentId,
  fileType,
  onUploadComplete,
  onUploadError,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes,
  multiple = true,
  className,
  disabled = false,
}: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const uploadFile = useUploadFile();

  // Get default accepted types based on fileType
  const getAcceptedTypes = () => {
    if (acceptedTypes) return acceptedTypes;
    
    switch (fileType) {
      case 'image':
        return ['image/*'];
      case 'video':
        return ['video/*'];
      case 'audio':
        return ['audio/*'];
      case 'overlay':
        return ['image/png', 'image/svg+xml'];
      default:
        return ['image/*', 'video/*', 'audio/*'];
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map((rejection) => {
          const reasons = rejection.errors.map((error: any) => error.message).join(', ');
          return `${rejection.file.name}: ${reasons}`;
        });
        onUploadError?.(`Upload failed: ${errors.join('; ')}`);
        return;
      }

      // Filter out files that are too large
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > maxFileSize) {
          onUploadError?.(
            `File ${file.name} is too large. Maximum size is ${formatFileSize(maxFileSize)}`
          );
          return false;
        }
        return true;
      });

      // Start uploading valid files
      validFiles.forEach((file) => {
        const uploadingFile: UploadingFile = {
          id: `${Date.now()}-${file.name}`,
          file,
          progress: 0,
          status: 'uploading',
        };

        setUploadingFiles((prev) => [...prev, uploadingFile]);

        // Upload the file
        uploadFile.mutate(
          {
            file,
            projectId,
            segmentId,
            options: {
              onProgress: (progress) => {
                setUploadingFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadingFile.id
                      ? { ...f, progress: progress.percentage }
                      : f
                  )
                );
              },
            },
          },
          {
            onSuccess: (uploadedFile) => {
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadingFile.id
                    ? { ...f, status: 'completed' as const }
                    : f
                )
              );
              
              onUploadComplete?.(uploadedFile);
              
              // Remove from uploading list after a delay
              setTimeout(() => {
                setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadingFile.id));
              }, 2000);
            },
            onError: (error) => {
              const errorMessage = error instanceof Error ? error.message : 'Upload failed';
              
              setUploadingFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadingFile.id
                    ? { ...f, status: 'error' as const, error: errorMessage }
                    : f
                )
              );
              
              onUploadError?.(errorMessage);
            },
          }
        );
      });
    },
    [projectId, segmentId, maxFileSize, onUploadComplete, onUploadError, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedTypes().reduce(
      (acc, type) => ({ ...acc, [type]: [] }),
      {}
    ),
    multiple,
    disabled,
    maxSize: maxFileSize,
  });

  const removeUploadingFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const hasActiveUploads = uploadingFiles.some((f) => f.status === 'uploading');

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'cursor-not-allowed opacity-50',
          hasActiveUploads && 'pointer-events-none'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={cn('w-10 h-10 mb-4', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to select files{multiple && ' (multiple files supported)'}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Max size: {formatFileSize(maxFileSize)}</p>
              <p>
                Accepted: {getAcceptedTypes().join(', ')}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading Files</h4>
          <div className="space-y-2">
            {uploadingFiles.map((uploadingFile) => (
              <Card key={uploadingFile.id} className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadingFile.file)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                  </div>

                  <div className="flex-shrink-0 flex items-center space-x-2">
                    {uploadingFile.status === 'uploading' && (
                      <>
                        <Loading size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {uploadingFile.progress}%
                        </span>
                      </>
                    )}
                    
                    {uploadingFile.status === 'completed' && (
                      <span className="text-xs text-green-600 font-medium">
                        Completed
                      </span>
                    )}
                    
                    {uploadingFile.status === 'error' && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-red-600 font-medium">
                          Error
                        </span>
                        {uploadingFile.error && (
                          <span className="text-xs text-red-600" title={uploadingFile.error}>
                            ({uploadingFile.error.slice(0, 20)}...)
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeUploadingFile(uploadingFile.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}