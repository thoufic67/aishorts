'use client';

import { useState } from 'react';
import { ProjectFile } from '@/types/project';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose,
  DialogFooter
} from './dialog';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { 
  Download, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Image as ImageIcon,
  Video,
  Music,
  File as FileIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileDownloadUrl } from '@/hooks/use-files';

interface FilePreviewProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (file: ProjectFile) => void;
}

interface FilePreviewCardProps {
  file: ProjectFile;
  onClick?: () => void;
  className?: string;
  showFullMetadata?: boolean;
}

export function FilePreview({ file, isOpen, onClose, onDownload }: FilePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const getDownloadUrl = useFileDownloadUrl();

  if (!file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async () => {
    try {
      const downloadUrl = await getDownloadUrl.mutateAsync(file.id);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onDownload?.(file);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

  const renderFileContent = () => {
    if (file.fileType === 'image') {
      return (
        <div className="relative group">
          <img
            src={file.r2Url || file.tempUrl}
            alt={file.originalName}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      );
    }

    if (file.fileType === 'video') {
      return (
        <div className="relative">
          <video
            src={file.r2Url || file.tempUrl}
            controls
            className="max-w-full max-h-[60vh] rounded-lg"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
          />
        </div>
      );
    }

    if (file.fileType === 'audio') {
      return (
        <div className="flex flex-col items-center space-y-4 py-8">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
            <Music className="w-12 h-12 text-primary" />
          </div>
          <audio
            src={file.r2Url || file.tempUrl}
            controls
            className="w-full max-w-md"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>
      );
    }

    // Default preview for other file types
    return (
      <div className="flex flex-col items-center space-y-4 py-8">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          {getFileIcon(file.fileType)}
        </div>
        <p className="text-muted-foreground">Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl w-full h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            {getFileIcon(file.fileType)}
            <div className="flex-1 min-w-0">
              <p className="truncate">{file.originalName}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {file.fileType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(file.fileSize)}
                </Badge>
                <Badge 
                  variant={file.uploadStatus === 'completed' ? 'default' : 'destructive'} 
                  className="text-xs"
                >
                  {file.uploadStatus}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File content */}
          <div className="flex-1 flex items-center justify-center overflow-auto bg-muted/20 rounded-lg">
            {renderFileContent()}
          </div>

          {/* File metadata */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">File Name:</span> {file.fileName}
              </div>
              <div>
                <span className="font-medium">MIME Type:</span> {file.mimeType}
              </div>
              <div>
                <span className="font-medium">Uploaded:</span> {formatDate(file.createdAt)}
              </div>
              {file.expiresAt && (
                <div>
                  <span className="font-medium">Expires:</span> {formatDate(file.expiresAt)}
                </div>
              )}
            </div>
            
            {file.metadata && Object.keys(file.metadata).length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-sm mb-1">Metadata:</p>
                <div className="bg-muted/50 rounded p-2 text-xs font-mono">
                  <pre>{JSON.stringify(file.metadata, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleDownload} disabled={getDownloadUrl.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {getDownloadUrl.isPending ? 'Getting URL...' : 'Download'}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FilePreviewCard({ 
  file, 
  onClick, 
  className, 
  showFullMetadata = false 
}: FilePreviewCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

  const renderThumbnail = () => {
    if (file.fileType === 'image' && (file.r2Url || file.tempUrl)) {
      return (
        <img
          src={file.r2Url || file.tempUrl}
          alt={file.originalName}
          className="w-full h-24 object-cover rounded-t-lg"
          loading="lazy"
        />
      );
    }

    return (
      <div className="w-full h-24 bg-muted rounded-t-lg flex items-center justify-center">
        {getFileIcon(file.fileType)}
      </div>
    );
  };

  return (
    <Card 
      className={cn(
        'overflow-hidden cursor-pointer transition-shadow hover:shadow-md', 
        className
      )}
      onClick={onClick}
    >
      {renderThumbnail()}
      
      <div className="p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm truncate" title={file.originalName}>
            {file.originalName}
          </h4>
          
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {file.fileType}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.fileSize)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Badge 
              variant={file.uploadStatus === 'completed' ? 'default' : 'destructive'} 
              className="text-xs"
            >
              {file.uploadStatus}
            </Badge>
            {showFullMetadata && (
              <span className="text-xs text-muted-foreground">
                {new Date(file.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}