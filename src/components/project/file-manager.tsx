'use client';

import { useState, useMemo } from 'react';
import { ProjectFile } from '@/types/project';
import { useProjectFiles, useDeleteFile, useDeleteFiles } from '@/hooks/use-files';
import { FilePreview, FilePreviewCard } from '@/components/ui/file-preview';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Upload,
  Trash2,
  Download,
  MoreHorizontal,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileManagerProps {
  projectId: string;
  segmentId?: string;
  className?: string;
  allowUpload?: boolean;
  fileTypeFilter?: 'image' | 'video' | 'audio' | 'overlay';
}

type SortField = 'name' | 'size' | 'type' | 'created';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export function FileManager({
  projectId,
  segmentId,
  className,
  allowUpload = true,
  fileTypeFilter,
}: FileManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);

  const { data: files = [], isLoading, error } = useProjectFiles(projectId);
  const deleteFile = useDeleteFile();
  const deleteFiles = useDeleteFiles();

  // Filter files based on segmentId if provided
  const segmentFiles = useMemo(() => {
    if (!segmentId) return files;
    return files.filter(file => file.segmentId === segmentId);
  }, [files, segmentId]);

  // Apply filters and search
  const filteredFiles = useMemo(() => {
    let filtered = segmentFiles;

    // Apply file type filter from props
    if (fileTypeFilter) {
      filtered = filtered.filter(file => file.fileType === fileTypeFilter);
    }

    // Apply type filter from UI
    if (typeFilter !== 'all') {
      filtered = filtered.filter(file => file.fileType === typeFilter);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.originalName.localeCompare(b.originalName);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'type':
          comparison = a.fileType.localeCompare(b.fileType);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [segmentFiles, fileTypeFilter, typeFilter, searchQuery, sortField, sortOrder]);

  const fileStats = useMemo(() => {
    const stats = {
      total: filteredFiles.length,
      images: filteredFiles.filter(f => f.fileType === 'image').length,
      videos: filteredFiles.filter(f => f.fileType === 'video').length,
      audio: filteredFiles.filter(f => f.fileType === 'audio').length,
      totalSize: filteredFiles.reduce((acc, f) => acc + f.fileSize, 0),
    };
    return stats;
  }, [filteredFiles]);

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
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleFileSelect = (fileId: string, selected: boolean) => {
    if (selected) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      if (selectedFiles.length === 1) {
        await deleteFile.mutateAsync(selectedFiles[0]);
        toast.success('File deleted successfully');
      } else {
        await deleteFiles.mutateAsync(selectedFiles);
        toast.success(`${selectedFiles.length} files deleted successfully`);
      }
      setSelectedFiles([]);
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Failed to delete files');
      console.error('Delete error:', error);
    }
  };

  const handleUploadComplete = (file: ProjectFile) => {
    toast.success(`File ${file.originalName} uploaded successfully`);
    setShowUpload(false);
  };

  const handleUploadError = (error: string) => {
    toast.error(`Upload failed: ${error}`);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-destructive">Failed to load files: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span>File Manager</span>
              {segmentId && <Badge variant="outline">Segment Files</Badge>}
            </CardTitle>
            {allowUpload && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{fileStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{fileStats.images}</div>
            <p className="text-xs text-muted-foreground">Images</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{fileStats.videos}</div>
            <p className="text-xs text-muted-foreground">Videos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatFileSize(fileStats.totalSize)}</div>
            <p className="text-xs text-muted-foreground">Total Size</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                    All Files
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter('image')}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Images
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('video')}>
                    <Video className="w-4 h-4 mr-2" />
                    Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('audio')}>
                    <Music className="w-4 h-4 mr-2" />
                    Audio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('asc'); }}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('name'); setSortOrder('desc'); }}>
                    Name (Z-A)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('created'); setSortOrder('desc'); }}>
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('created'); setSortOrder('asc'); }}>
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('size'); setSortOrder('desc'); }}>
                    Largest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setSortField('size'); setSortOrder('asc'); }}>
                    Smallest First
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center border rounded">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected
                </span>
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleteFile.isPending || deleteFiles.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' 
                  ? 'No files match your filters' 
                  : 'No files uploaded yet'
                }
              </p>
              {allowUpload && (
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First File
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <div key={file.id} className="relative">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                    className="absolute top-2 left-2 z-10 w-4 h-4"
                  />
                  <FilePreviewCard
                    file={file}
                    onClick={() => setPreviewFile(file)}
                    className="pt-6"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setPreviewFile(file)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={(e) => handleFileSelect(file.id, e.target.checked)}
                    className="w-4 h-4"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-shrink-0">
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.originalName}</p>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {file.fileType}
                      </Badge>
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setPreviewFile(file)}>
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setSelectedFiles([file.id]);
                          setShowDeleteDialog(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Preview Modal */}
      <FilePreview
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Upload Modal */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
          </DialogHeader>
          <FileUpload
            projectId={projectId}
            segmentId={segmentId}
            fileType={fileTypeFilter}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={deleteFile.isPending || deleteFiles.isPending}
            >
              {deleteFile.isPending || deleteFiles.isPending ? (
                <>
                  <Loading size="sm" className="mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}