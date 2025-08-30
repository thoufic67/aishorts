# Audio CORS Configuration Guide

This guide explains how to resolve CORS issues when playing audio files from Cloudflare R2 storage in your video editor.

## Problem

The audio player component fails to play audio files from `https://assets.cursorshorts.com` due to CORS policy:

```
Access to audio at 'https://assets.cursorshorts.com/...' from origin 'http://localhost:3030' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solutions

### 1. Configure Cloudflare R2 CORS (Recommended)

Add CORS configuration to your Cloudflare R2 bucket:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3030",
      "http://localhost:3000", 
      "https://yourdomain.com",
      "https://*.vercel.app",
      "https://*.netlify.app"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 3600
  }
]
```

**How to configure:**

1. Log into Cloudflare Dashboard
2. Go to R2 Object Storage
3. Select your bucket (`assets.cursorshorts.com`)
4. Go to Settings → CORS Policy
5. Add the JSON configuration above
6. Save changes

### 2. Updated Audio Player Component

The `ExternalAudioPlayer` component has been updated with intelligent CORS handling:

#### Features:
- **Smart CORS Detection**: Only sets `crossOrigin="anonymous"` for known production domains
- **Automatic Fallback**: If CORS fails, automatically retries without CORS
- **Environment Awareness**: Different behavior for localhost vs production

#### Logic:
```javascript
// Only set crossOrigin for cross-origin requests from production domains
if (audioOrigin !== currentOrigin && 
    (audioOrigin.includes('cursorshorts.com') || 
     currentOrigin.includes('vercel.app') ||
     currentOrigin.includes('netlify.app'))) {
  audioElement.crossOrigin = "anonymous";
}
```

### 3. Development vs Production Behavior

#### Development (localhost):
- No `crossOrigin` attribute set to avoid CORS errors
- Audio plays normally but without advanced audio processing capabilities

#### Production:
- `crossOrigin="anonymous"` set when CORS headers are properly configured
- Enables advanced audio processing and cross-origin resource sharing

## Testing

1. **Local Development**: Audio should play without CORS errors
2. **Production**: Verify CORS headers are present:
   ```bash
   curl -I https://assets.cursorshorts.com/path/to/audio.mp3
   ```
   Look for: `Access-Control-Allow-Origin: *` or your domain

## Troubleshooting

### Audio Still Not Playing?

1. **Check Console**: Look for specific error messages
2. **Network Tab**: Check if audio files are loading (200 status)
3. **CORS Headers**: Verify headers are present in production

### Common Issues:

- **Mixed Content**: HTTPS sites can't load HTTP audio
- **File Permissions**: Ensure audio files are publicly accessible
- **Network Policies**: Some corporate networks block audio streaming

### Debug Logging:

The component includes debug logging:
```javascript
console.log("thoufic segment", { segment, audioUrl });
console.log("thoufic inside audio", { audioUrl, segmentId, audio, isMuted });
```

## Browser Compatibility

| Browser | CORS Support | Fallback Support |
|---------|--------------|-----------------|
| Chrome 90+ | ✅ Full | ✅ Yes |
| Firefox 88+ | ✅ Full | ✅ Yes |
| Safari 14+ | ✅ Full | ✅ Yes |
| Edge 90+ | ✅ Full | ✅ Yes |

## Security Considerations

- CORS is only enabled for known production domains
- No credentials are sent with audio requests
- Fallback mode maintains functionality while being secure
- Regular security audits recommended for production domains

## Future Improvements

1. **CDN Integration**: Consider using a CDN with built-in CORS support
2. **Audio Transcoding**: Server-side transcoding for better compatibility
3. **Progressive Loading**: Stream audio chunks for large files
4. **Cache Headers**: Optimize audio caching for better performance