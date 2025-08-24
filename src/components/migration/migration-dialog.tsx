'use client';

import { useState, useEffect } from 'react';
import { useMigration } from '@/hooks/use-migration';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// Note: Progress component not found, using custom implementation
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Download, Upload, Database, Cloud } from 'lucide-react';

interface MigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMigrationComplete?: () => void;
}

export function MigrationDialog({ 
  open, 
  onOpenChange, 
  onMigrationComplete 
}: MigrationDialogProps) {
  const {
    isLoading,
    progress,
    result,
    error,
    migrateFromLocalStorage,
    getMigrationStats,
    needsMigration,
    downloadBackup,
    clearLocalStorage,
  } = useMigration();

  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [uploadToR2, setUploadToR2] = useState(true);
  const [clearAfter, setClearAfter] = useState(false);
  const [step, setStep] = useState<'overview' | 'migrating' | 'complete'>('overview');

  useEffect(() => {
    if (open) {
      const stats = getMigrationStats();
      setMigrationStats(stats);
      
      if (!needsMigration()) {
        setStep('complete');
      }
    }
  }, [open, getMigrationStats, needsMigration]);

  useEffect(() => {
    if (result && !isLoading) {
      setStep('complete');
      onMigrationComplete?.();
    }
  }, [result, isLoading, onMigrationComplete]);

  const handleStartMigration = async () => {
    setStep('migrating');
    try {
      await migrateFromLocalStorage(uploadToR2, clearAfter);
    } catch (err) {
      // Error is already handled in the hook
    }
  };

  const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migrate Projects to Database
          </DialogTitle>
          <DialogDescription>
            Transfer your projects from localStorage to the new database system with cloud storage
          </DialogDescription>
        </DialogHeader>

        {step === 'overview' && migrationStats && (
          <div className="space-y-6">
            {/* Migration Overview */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Migration Overview
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Projects:</span>
                  <span className="font-medium">{migrationStats.totalProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span>Segments:</span>
                  <span className="font-medium">{migrationStats.totalSegments}</span>
                </div>
                <div className="flex justify-between">
                  <span>Images:</span>
                  <span className="font-medium">{migrationStats.totalImages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Videos/Audio:</span>
                  <span className="font-medium">{migrationStats.totalVideos}</span>
                </div>
              </div>
            </div>

            {/* Migration Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="upload-r2"
                  checked={uploadToR2}
                  onChange={(e) => setUploadToR2(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="upload-r2" className="flex items-center gap-2 text-sm">
                  <Cloud className="h-4 w-4" />
                  Upload files to R2 cloud storage (recommended)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clear-after"
                  checked={clearAfter}
                  onChange={(e) => setClearAfter(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="clear-after" className="text-sm">
                  Clear localStorage after successful migration
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={downloadBackup}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Backup Data
              </Button>
              
              <Button
                onClick={handleStartMigration}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Upload className="h-4 w-4" />
                Start Migration
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Backup recommended:</strong> Download a backup of your data before migrating. 
                The migration process will transfer your projects to the database and optionally upload 
                files to cloud storage.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'migrating' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              
              {progress && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div>Stage: {progress.stage}</div>
                    {progress.currentProject && (
                      <div>Current: {progress.currentProject}</div>
                    )}
                  </div>
                </>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6">
            {!needsMigration() && !result ? (
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold">No Migration Needed</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No projects found in localStorage to migrate.
                  </p>
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {result.success ? (
                  <div className="text-center space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-100">
                        Migration Completed!
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Successfully migrated {result.migratedProjects} of {result.totalProjects} projects
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                    <div>
                      <h3 className="font-semibold text-red-900 dark:text-red-100">
                        Migration Failed
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Failed to migrate projects. Please try again.
                      </p>
                    </div>
                  </div>
                )}

                {/* Migration Results */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex justify-between">
                      <span>Projects migrated:</span>
                      <span className="font-medium">{result.migratedProjects}/{result.totalProjects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Segments:</span>
                      <span className="font-medium">{result.totalSegments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Files uploaded:</span>
                      <span className="font-medium">{result.totalFiles}</span>
                    </div>
                    {result.failedProjects.length > 0 && (
                      <div className="col-span-2 mt-2 pt-2 border-t">
                        <div className="text-red-600 dark:text-red-400">
                          Failed projects: {result.failedProjects.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  {!clearAfter && (
                    <Button
                      variant="outline"
                      onClick={clearLocalStorage}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear localStorage
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="ml-auto"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}