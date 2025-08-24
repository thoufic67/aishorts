# LocalStorage to Database Migration Guide

This guide explains how to migrate your existing projects from localStorage to the new database system with cloud storage.

## 🚀 Quick Start

### Option 1: Using the UI (Recommended)

1. **Add the Migration Banner** to your dashboard:
   ```tsx
   import { MigrationBanner } from '@/components/migration/migration-banner';
   
   export function Dashboard() {
     return (
       <div>
         <MigrationBanner />
         {/* Your existing dashboard content */}
       </div>
     );
   }
   ```

2. **The banner will automatically appear** when localStorage projects are detected

3. **Click "Migrate Now"** to start the migration process

### Option 2: Manual Integration

Use the migration hook directly in your components:

```tsx
import { useMigration } from '@/hooks/use-migration';

function MyComponent() {
  const { 
    needsMigration, 
    migrateFromLocalStorage, 
    getMigrationStats 
  } = useMigration();

  const handleMigrate = async () => {
    try {
      const result = await migrateFromLocalStorage(
        true,  // uploadToR2
        false  // clearLocalStorageAfter
      );
      console.log('Migration result:', result);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  return (
    <div>
      {needsMigration() && (
        <button onClick={handleMigrate}>
          Migrate {getMigrationStats()?.totalProjects} Projects
        </button>
      )}
    </div>
  );
}
```

### Option 3: API Endpoint

Make a direct API call:

```javascript
const response = await fetch('/api/migrate-from-localstorage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projects: JSON.parse(localStorage.getItem('ai_video_projects') || '{}'),
    uploadToR2: true,
    clearLocalStorageAfter: false
  })
});

const result = await response.json();
```

## 📋 What Gets Migrated

### Project Data
- ✅ Project title, idea, and description
- ✅ Generated scripts and transcripts
- ✅ Creation and update timestamps
- ✅ All project segments with text and prompts

### Media Files
- ✅ Segment images (uploaded to R2)
- ✅ Segment audio files (uploaded to R2)
- ✅ Generated images (uploaded to R2)
- ✅ Generated videos (uploaded to R2)

### Metadata
- ✅ Original localStorage IDs preserved
- ✅ Migration timestamps
- ✅ File sources and metadata

## 🔧 Migration Options

| Option | Description | Default |
|--------|-------------|---------|
| `uploadToR2` | Upload all media files to R2 cloud storage | `true` |
| `clearLocalStorageAfter` | Clear localStorage after successful migration | `false` |

## 📊 Migration Process

1. **Analysis**: Scan localStorage for projects and media
2. **Database Migration**: Create projects and segments in PostgreSQL
3. **File Upload**: Upload media files to Cloudflare R2 (if enabled)
4. **Verification**: Ensure all data was migrated successfully
5. **Cleanup**: Optionally clear localStorage

## 🛡️ Safety Features

### Backup Before Migration
Always create a backup before migrating:
```tsx
const { downloadBackup } = useMigration();

// Downloads a JSON backup file
downloadBackup();
```

### Non-Destructive by Default
- localStorage is **NOT** cleared unless explicitly requested
- Original URLs are preserved as `tempUrl` in database
- Migration can be run multiple times safely

### Error Handling
- Failed projects are reported but don't stop the entire process
- Detailed error logs for debugging
- Partial migration support (some projects can succeed while others fail)

## 📱 User Experience

### Migration Banner
The `MigrationBanner` component automatically:
- Detects when migration is needed
- Shows project statistics
- Provides one-click migration
- Can be dismissed by users
- Disappears after successful migration

### Migration Dialog
The `MigrationDialog` provides:
- Pre-migration overview with statistics
- Real-time progress tracking
- Migration options configuration
- Success/failure feedback
- Post-migration cleanup options

## 🔍 Troubleshooting

### Common Issues

**TypeScript Errors**
```bash
pnpm typecheck
```

**Missing UI Components**
The migration components use standard shadcn/ui components. If any are missing:
- Check your `@/components/ui/` directory
- Install missing components or create alternatives

**R2 Storage Errors**
Ensure R2 environment variables are set:
```env
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://your-domain.r2.dev
```

**Database Connection Issues**
Verify your database connection:
```env
POSTGRES_URL=postgresql://...
```

### Debugging

Enable detailed logging by checking the browser console and server logs during migration.

### Manual Cleanup

If you need to manually clear localStorage:
```javascript
localStorage.removeItem('ai_video_projects');
localStorage.removeItem('current_project_id');
```

## 🧪 Testing

Use the sample migration script for testing:
```bash
npx tsx src/scripts/migrate-sample-data.ts
```

## 📚 API Reference

### Migration Hook
```tsx
const {
  isLoading,           // Migration in progress
  progress,            // Migration progress info
  result,              // Migration results
  error,               // Error message
  migrateFromLocalStorage, // Start migration
  getMigrationStats,   // Get stats without migrating
  needsMigration,      // Check if migration needed
  downloadBackup,      // Download JSON backup
  clearLocalStorage    // Clear localStorage
} = useMigration();
```

### Migration API
```
POST /api/migrate-from-localstorage
```
Body:
```json
{
  "projects": { /* localStorage projects */ },
  "uploadToR2": true,
  "clearLocalStorageAfter": false
}
```

Response:
```json
{
  "success": true,
  "data": {
    "totalProjects": 5,
    "migratedProjects": 5,
    "totalSegments": 15,
    "totalFiles": 8,
    "migratedProjectIds": ["..."]
  }
}
```

## 🎯 Best Practices

1. **Always backup first** - Use `downloadBackup()` before migrating
2. **Test with small datasets** - Start with a few projects
3. **Monitor the process** - Watch console logs during migration
4. **Don't clear localStorage immediately** - Wait until you verify the migration
5. **Check R2 storage** - Ensure files are properly uploaded

## 🚨 Important Notes

- **Authentication Required**: Users must be logged in to migrate
- **One-time Process**: Each project only needs to be migrated once
- **Data Preservation**: Original localStorage data is preserved unless explicitly cleared
- **Cloud Storage**: R2 upload requires proper configuration
- **Browser Compatibility**: Migration runs client-side, requires modern browser features

---

For questions or issues, check the migration logs in the browser console and server logs.