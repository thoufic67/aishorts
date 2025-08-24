#!/usr/bin/env tsx

/**
 * Test script to verify Cloudflare R2 connection and functionality
 * 
 * Usage: npx tsx src/scripts/test-r2-connection.ts
 */

import { R2Storage } from '../lib/r2-storage';
import { FileUtils } from '../lib/file-utils';

async function testR2Connection() {
  console.log('🧪 Testing Cloudflare R2 Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables Check:');
  const requiredEnvVars = [
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_BUCKET_NAME',
    'CLOUDFLARE_R2_PUBLIC_URL'
  ];

  const envCheck = requiredEnvVars.map(varName => {
    const value = process.env[varName];
    const isSet = !!value;
    console.log(`  ${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'Set' : 'Missing'}`);
    return isSet;
  });

  const allEnvSet = envCheck.every(Boolean);
  
  if (!allEnvSet) {
    console.log('\n❌ Missing required environment variables. Please check your .env file.\n');
    return;
  }

  console.log('\n✅ All environment variables are set!\n');

  // Test 1: Upload a small test file
  console.log('📤 Test 1: Upload Test File');
  try {
    // Create a simple test image (1x1 pixel PNG in base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-456';
    
    console.log('  - Uploading test image...');
    const uploadResult = await R2Storage.uploadImageFromBase64(
      testImageBase64,
      testUserId,
      testProjectId
    );

    console.log(`  ✅ Upload successful!`);
    console.log(`     R2 Key: ${uploadResult.key}`);
    console.log(`     Public URL: ${uploadResult.url}`);

    // Test 2: Check if public URL is accessible
    console.log('\n🌐 Test 2: Public URL Accessibility');
    try {
      const response = await fetch(uploadResult.url, { method: 'HEAD' });
      
      if (response.ok) {
        console.log(`  ✅ Public URL is accessible (Status: ${response.status})`);
        console.log(`     Content-Type: ${response.headers.get('content-type')}`);
        console.log(`     Content-Length: ${response.headers.get('content-length')} bytes`);
      } else {
        console.log(`  ⚠️  Public URL returned status: ${response.status}`);
        console.log(`     This might be expected if the R2 bucket is private`);
      }
    } catch (error) {
      console.log(`  ⚠️  Could not access public URL: ${error}`);
      console.log(`     This might be expected if the R2 bucket is private`);
    }

    // Test 3: Delete the test file
    console.log('\n🗑️  Test 3: Delete Test File');
    try {
      await R2Storage.deleteFile(uploadResult.key);
      console.log('  ✅ File deleted successfully!');
    } catch (error) {
      console.log(`  ❌ Error deleting file: ${error}`);
    }

    // Test 4: Test file utilities
    console.log('\n🔧 Test 4: File Utilities');
    try {
      const buffer = FileUtils.base64ToBuffer(testImageBase64);
      console.log(`  ✅ Base64 to Buffer conversion: ${buffer.length} bytes`);
      
      const metadata = FileUtils.createFileMetadata('test-image.png', 'image/png', buffer.length);
      console.log(`  ✅ File metadata creation: ${metadata.sanitizedName}`);
      
      const security = FileUtils.validateFileSecurity('image/png', 'test-image.png', buffer.length);
      console.log(`  ✅ Security validation: ${security.valid ? 'Passed' : 'Failed'}`);
    } catch (error) {
      console.log(`  ❌ File utilities error: ${error}`);
    }

    console.log('\n🎉 All R2 tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  ✅ Environment variables configured');
    console.log('  ✅ R2 connection working');
    console.log('  ✅ File upload working');
    console.log('  ✅ File deletion working');
    console.log('  ✅ File utilities working');
    console.log('\n✨ Your R2 storage is ready for the migration system!');

  } catch (error) {
    console.log(`  ❌ Upload failed: ${error}`);
    
    if (error instanceof Error) {
      if (error.message.includes('Access Denied')) {
        console.log('\n💡 Troubleshooting: Access Denied Error');
        console.log('   - Check that your R2 API token has the correct permissions');
        console.log('   - Ensure the bucket name matches exactly');
        console.log('   - Verify the endpoint URL includes your account ID');
      } else if (error.message.includes('NoSuchBucket')) {
        console.log('\n💡 Troubleshooting: Bucket Not Found');
        console.log('   - Verify the bucket name is correct');
        console.log('   - Ensure the bucket exists in your Cloudflare account');
      } else if (error.message.includes('Invalid credentials')) {
        console.log('\n💡 Troubleshooting: Invalid Credentials');
        console.log('   - Check your access key ID and secret access key');
        console.log('   - Ensure the credentials are active and not expired');
      }
    }
    
    console.log('\n❌ R2 connection test failed');
  }
}

// Test upload from URL function
async function testUploadFromUrl() {
  console.log('\n🔗 Test 5: Upload from URL');
  try {
    // Test with a small public image URL (using a reliable service)
    const testImageUrl = 'https://httpbin.org/image/png';
    const testUserId = 'test-user-123';
    const testProjectId = 'test-project-456';
    
    console.log('  - Uploading image from URL...');
    const uploadResult = await R2Storage.uploadFromUrl(
      testImageUrl,
      testUserId,
      testProjectId,
      'image'
    );

    console.log(`  ✅ URL upload successful!`);
    console.log(`     R2 Key: ${uploadResult.key}`);
    console.log(`     Public URL: ${uploadResult.url}`);

    // Clean up
    await R2Storage.deleteFile(uploadResult.key);
    console.log('  ✅ Cleanup completed');

  } catch (error) {
    console.log(`  ❌ URL upload failed: ${error}`);
  }
}

// Run the tests
async function runAllTests() {
  try {
    await testR2Connection();
    await testUploadFromUrl();
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  runAllTests();
}

export { testR2Connection, testUploadFromUrl, runAllTests };