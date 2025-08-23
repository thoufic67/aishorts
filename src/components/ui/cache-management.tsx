"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageCacheClient } from "@/lib/image-cache-client";
import { Database, Trash2, RefreshCw, ImageIcon, Clock } from "lucide-react";

interface CacheManagementProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function CacheManagement({ trigger, className }: CacheManagementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [stats, setStats] = useState(() => ImageCacheClient.getCacheStats());

  const refreshStats = () => {
    setStats(ImageCacheClient.getCacheStats());
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      ImageCacheClient.clearCache();
      refreshStats();
    } finally {
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={className}
            onClick={refreshStats}
          >
            <Database className="h-4 w-4 mr-2" />
            Image Cache ({stats.totalEntries})
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image Cache Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cache Statistics */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cached Images</span>
                <Badge variant="secondary">{stats.totalEntries}</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Storage Size</span>
                <Badge variant="outline">{formatBytes(stats.cacheSize)}</Badge>
              </div>

              {stats.oldestEntry && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Oldest Entry</span>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    {stats.oldestEntry.toLocaleDateString()}
                  </div>
                </div>
              )}

              {stats.newestEntry && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Newest Entry</span>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    {stats.newestEntry.toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Benefits Info */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="text-sm font-medium text-green-700 mb-1">
              Cache Benefits
            </div>
            <div className="text-xs text-green-600">
              • Instant image loading for repeated prompts<br />
              • Reduced API costs and rate limiting<br />
              • Improved user experience and speed<br />
              • Automatic cleanup of old entries
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={refreshStats}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearing || stats.totalEntries === 0}
              className="flex-1"
            >
              {isClearing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Cache
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}