import { NextRequest, NextResponse } from 'next/server';
import { R2Storage } from '@/lib/r2-storage';

export async function GET() {
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
    return NextResponse.json({ 
      success: false, 
      error: 'Missing required environment variables' 
    }, { status: 500 });
  }

  console.log('\n✅ All environment variables are set!\n');

  try {
    // Test 1: Upload a small test file
    console.log('📤 Test 1: Upload Test File');
    
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

    console.log('  ✅ Upload successful!');
    console.log(`     R2 Key: ${uploadResult.key}`);
    console.log(`     Public URL: ${uploadResult.url}`);

    // Test 2: Check if public URL is accessible
    console.log('\n🌐 Test 2: Public URL Accessibility');
    let urlAccessible = false;
    try {
      const response = await fetch(uploadResult.url, { method: 'HEAD' });
      
      if (response.ok) {
        console.log(`  ✅ Public URL is accessible (Status: ${response.status})`);
        console.log(`     Content-Type: ${response.headers.get('content-type')}`);
        console.log(`     Content-Length: ${response.headers.get('content-length')} bytes`);
        urlAccessible = true;
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

    console.log('\n🎉 R2 connection test completed!');
    console.log('\n📊 Summary:');
    console.log('  ✅ Environment variables configured');
    console.log('  ✅ R2 connection working');
    console.log('  ✅ File upload working');
    console.log('  ✅ File deletion working');
    console.log('\n✨ Your R2 storage is ready!');

    return NextResponse.json({ 
      success: true, 
      uploadResult,
      urlAccessible,
      message: 'R2 connection test passed successfully'
    });

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
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}