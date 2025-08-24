'use client';

import { useState, useEffect } from 'react';
import { useMigration } from '@/hooks/use-migration';
import { MigrationDialog } from './migration-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Database, X } from 'lucide-react';

export function MigrationBanner() {
  const { needsMigration, getMigrationStats } = useMigration();
  const [showBanner, setShowBanner] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [migrationStats, setMigrationStats] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if migration banner was previously dismissed
    const isDismissed = localStorage.getItem('migration-banner-dismissed') === 'true';
    setDismissed(isDismissed);

    if (!isDismissed && needsMigration()) {
      setShowBanner(true);
      const stats = getMigrationStats();
      setMigrationStats(stats);
    }
  }, [needsMigration, getMigrationStats]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('migration-banner-dismissed', 'true');
  };

  const handleMigrationComplete = () => {
    setShowBanner(false);
    setShowDialog(false);
    // Clear the dismissal flag since migration is complete
    localStorage.removeItem('migration-banner-dismissed');
  };

  if (!showBanner || dismissed) {
    return null;
  }

  return (
    <>
      <Alert className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <Database className="h-4 w-4 text-blue-600" />
        <div className="flex-1">
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            Migrate Your Projects to Database
          </AlertTitle>
          <AlertDescription className="text-blue-800 dark:text-blue-200 mt-1">
            {migrationStats && (
              <>
                We found {migrationStats.totalProjects} projects in your browser storage. 
                Migrate them to the new database system for better performance and cloud backup.
              </>
            )}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowDialog(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Migrate Now
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>

      <MigrationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onMigrationComplete={handleMigrationComplete}
      />
    </>
  );
}