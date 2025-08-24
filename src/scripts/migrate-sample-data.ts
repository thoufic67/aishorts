#!/usr/bin/env tsx

/**
 * Sample migration script for testing purposes
 * This demonstrates how to use the migration utilities
 * 
 * Usage: npx tsx src/scripts/migrate-sample-data.ts
 */

import { MigrationUtils, type ProjectData } from '../lib/migration-utils';

// Sample localStorage data structure for testing
const sampleLocalStorageData: { [key: string]: ProjectData } = {
  "project_1703123456789_abc123": {
    id: "project_1703123456789_abc123",
    title: "Sample Video Project 1",
    idea: "A video about sustainable living tips",
    inspirationUrls: "https://example.com/inspiration",
    script: "In today's world, sustainability is more important than ever. Here are 5 simple tips to live more sustainably...",
    transcripts: [
      "In today's world, sustainability is more important than ever.",
      "Here are 5 simple tips to live more sustainably.",
      "Tip 1: Reduce single-use plastics.",
      "Tip 2: Use public transportation when possible.",
      "Tip 3: Buy local and seasonal produce."
    ],
    scriptLines: [
      "In today's world, sustainability is more important than ever.",
      "Here are 5 simple tips to live more sustainably.",
      "Tip 1: Reduce single-use plastics.",
      "Tip 2: Use public transportation when possible.",
      "Tip 3: Buy local and seasonal produce."
    ],
    generatedImages: {
      0: "https://example.com/image1.jpg",
      1: "https://example.com/image2.jpg",
      2: "https://example.com/image3.jpg"
    },
    generatedVideos: {
      0: "https://example.com/video1.mp4"
    },
    segments: [
      {
        text: "In today's world, sustainability is more important than ever.",
        imagePrompt: "A beautiful Earth from space showing green continents and blue oceans",
        imageUrl: "https://example.com/segment1-image.jpg",
        audioUrl: "https://example.com/segment1-audio.mp3",
        duration: 3,
        order: 0
      },
      {
        text: "Here are 5 simple tips to live more sustainably.",
        imagePrompt: "Infographic showing 5 sustainability tips with icons",
        imageUrl: "https://example.com/segment2-image.jpg",
        duration: 2,
        order: 1
      },
      {
        text: "Tip 1: Reduce single-use plastics.",
        imagePrompt: "Reusable water bottles and bags vs single-use plastics",
        imageUrl: "https://example.com/segment3-image.jpg",
        audioUrl: "https://example.com/segment3-audio.mp3",
        duration: 4,
        order: 2
      }
    ],
    createdAt: 1703123456789,
    updatedAt: 1703123456999
  },
  "project_1703123567890_def456": {
    id: "project_1703123567890_def456",
    title: "Tech Tutorial: Getting Started with React",
    idea: "A beginner-friendly guide to React development",
    inspirationUrls: "",
    script: "React is a powerful JavaScript library for building user interfaces. Let's learn the basics...",
    transcripts: [
      "React is a powerful JavaScript library for building user interfaces.",
      "Let's learn the basics starting with components.",
      "Components are the building blocks of React applications.",
      "You can create functional or class-based components."
    ],
    scriptLines: [
      "React is a powerful JavaScript library for building user interfaces.",
      "Let's learn the basics starting with components.",
      "Components are the building blocks of React applications.",
      "You can create functional or class-based components."
    ],
    generatedImages: {
      0: "https://example.com/react1.jpg",
      1: "https://example.com/react2.jpg"
    },
    generatedVideos: {},
    segments: [
      {
        text: "React is a powerful JavaScript library for building user interfaces.",
        imagePrompt: "React logo with code editor showing JSX syntax",
        imageUrl: "https://example.com/react-intro.jpg",
        duration: 3,
        order: 0
      },
      {
        text: "Let's learn the basics starting with components.",
        imagePrompt: "Diagram showing React component hierarchy",
        order: 1
      }
    ],
    createdAt: 1703123567890,
    updatedAt: 1703123567999
  }
};

async function runSampleMigration() {
  console.log('🚀 Starting sample migration...');
  console.log(`Found ${Object.keys(sampleLocalStorageData).length} sample projects to migrate`);

  // You would need to provide a real user ID here
  const sampleUserId = 'user_sample_123';
  
  try {
    // For demo purposes, let's just show what would be migrated
    console.log('\n📊 Sample Migration Preview:');
    
    Object.values(sampleLocalStorageData).forEach((project, index) => {
      console.log(`\n${index + 1}. ${project.title}`);
      console.log(`   - Idea: ${project.idea.substring(0, 50)}...`);
      console.log(`   - Segments: ${project.segments?.length || 0}`);
      console.log(`   - Images: ${Object.keys(project.generatedImages).length}`);
      console.log(`   - Videos: ${Object.keys(project.generatedVideos).length}`);
      console.log(`   - Created: ${new Date(project.createdAt).toLocaleDateString()}`);
    });

    console.log('\n⚠️  This is a sample script. To perform actual migration:');
    console.log('1. Ensure you have a valid user session');
    console.log('2. Use the migration API endpoint: POST /api/migrate-from-localstorage');
    console.log('3. Or use the MigrationDialog component in the frontend');
    
    // Uncomment below to run actual migration (requires valid user ID and database connection)
    /*
    const result = await MigrationUtils.migrateAllProjects(
      sampleUserId,
      true, // uploadToR2
      (current, total, projectTitle) => {
        console.log(`📦 Migrating ${current}/${total}: ${projectTitle}`);
      }
    );
    
    console.log('\n✅ Migration Results:');
    console.log(`   - Total projects: ${result.totalProjects}`);
    console.log(`   - Migrated: ${result.migratedProjects}`);
    console.log(`   - Failed: ${result.failedProjects.length}`);
    console.log(`   - Total segments: ${result.totalSegments}`);
    console.log(`   - Total files: ${result.totalFiles}`);
    
    if (result.failedProjects.length > 0) {
      console.log('\n❌ Failed projects:');
      result.failedProjects.forEach(title => console.log(`   - ${title}`));
    }
    
    if (result.errors.length > 0) {
      console.log('\n🚨 Errors:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    */

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runSampleMigration();
}

export { sampleLocalStorageData, runSampleMigration };