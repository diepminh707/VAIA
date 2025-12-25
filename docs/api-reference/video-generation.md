# Video Generation API

## Overview

The Video Generation API provides access to Google's Veo 3.1 video generation models through the Flow platform. Supports text-to-video, image-to-video, video extension, and camera control operations.

## Video Models

| Model Key | Description | Aspect Ratio | Use Case |
|-----------|-------------|--------------|----------|
| `veo_3_1_t2v_fast` | Text-to-video (landscape) | 16:9 | General landscape videos |
| `veo_3_1_t2v_fast_portrait` | Text-to-video (portrait) | 9:16 | Mobile/vertical videos |
| `veo_3_1_i2v_s_fast_ultra` | Image-to-video (landscape) | 16:9 | Landscape with images |
| `veo_3_1_i2v_s_fast_portrait_fl` | Image-to-video (portrait) | 9:16 | Portrait with images |
| `veo_3_1_extend_fast_landscape_ultra` | Extend video (landscape) | 16:9 | Extend landscape videos |
| `veo_3_1_extend_fast_portrait_ultra` | Extend video (portrait) | 9:16 | Extend portrait videos |
| `veo_3_0_reshoot_landscape` | Camera controls (landscape) | 16:9 | Reshoot with motion |

---

## Endpoints

### 1. Generate Video from Text

Create a video from a text prompt.

**Endpoint**: `/v1/video:batchAsyncGenerateVideoText`

**Method**: `POST`

**Request**:
```typescript
interface BatchAsyncGenerateVideoTextRequest {
  clientContext: {
    sessionId: string
    projectId: string
    tool: 'PINHOLE'
    userPaygateTier?: string
  }
  requests: Array<{
    aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    seed: number
    textInput: {
      prompt: string
    }
    videoModelKey: string
    metadata: {
      sceneId: string  // UUID
    }
  }>
}
```

**Response**:
```typescript
interface BatchAsyncGenerateVideoTextResponse {
  operations: Array<{
    name: string           // Operation ID for polling
    sceneId: string
    status: string         // 'MEDIA_GENERATION_STATUS_PENDING'
  }>
}
```

**Example**:
```typescript
const response = await generateVideoFromText(
  'a serene mountain landscape with flowing river',
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)

// Returns operation to poll for status
console.log('Operation ID:', response.operations[0].name)
```

---

### 2. Generate Video from Images

Create a video using start and end images.

**Endpoint**: `/v1/video:batchAsyncGenerateVideoStartAndEndImage`

**Method**: `POST`

**Request**:
```typescript
interface BatchAsyncGenerateVideoStartAndEndImageRequest {
  clientContext: {
    sessionId: string
    projectId: string
    tool: 'PINHOLE'
  }
  requests: Array<{
    aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    seed: number
    textInput: {
      prompt: string
    }
    videoModelKey: string
    startImage: {
      mediaId: string     // From uploadUserImage or image generation
    }
    endImage: {
      mediaId: string
    }
    metadata: {
      sceneId: string
    }
  }>
}
```

**Example**:
```typescript
const response = await generateVideoFromImages(
  'smooth transition between scenes',
  'projects/.../media/start123',
  'projects/.../media/end456',
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)
```

---

### 3. Extend Video

Extend an existing video forward or backward.

**Endpoint**: `/v1/video:batchAsyncGenerateVideoExtendVideo`

**Method**: `POST`

**Request**:
```typescript
interface BatchAsyncGenerateVideoExtendVideoRequest {
  clientContext: {
    sessionId: string
    projectId: string
    tool: 'PINHOLE'
  }
  requests: Array<{
    textInput: {
      prompt: string
    }
    videoInput: {
      mediaId: string
      startFrameIndex: number  // Starting frame
      endFrameIndex: number    // Ending frame
    }
    videoModelKey: string
    aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    seed: number
    metadata: {
      sceneId: string
    }
  }>
}
```

**Example**:
```typescript
const response = await extendVideo(
  'continue the motion smoothly',
  'projects/.../media/video123',
  0,    // Start from first frame
  120,  // End at frame 120
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)
```

---

### 4. Reshoot Video (Camera Controls)

Apply camera motion to existing video.

**Endpoint**: `/v1/video:batchAsyncGenerateVideoReshootVideo`

**Method**: `POST`

**Request**:
```typescript
interface BatchAsyncGenerateVideoReshootVideoRequest {
  clientContext: {
    sessionId: string
    projectId: string
    tool: 'PINHOLE'
  }
  requests: Array<{
    seed: number
    aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    videoInput: {
      mediaId: string
    }
    reshootMotionType: string  // Camera motion type
    videoModelKey: 'veo_3_0_reshoot_landscape'
    metadata: {
      sceneId: string
    }
  }>
}
```

**Supported Motion Types**:
- `PAN_UP` - Pan camera upward
- `PAN_DOWN` - Pan camera downward
- `PAN_LEFT_TO_RIGHT` - Pan left to right
- `PAN_RIGHT_TO_LEFT` - Pan right to left
- `DOLLY_FORWARD` - Move camera forward
- `DOLLY_BACKWARD` - Move camera backward
- `ZOOM_IN` - Zoom into scene
- `ZOOM_OUT` - Zoom out from scene
- `ORBIT_LEFT` - Orbit camera left
- `ORBIT_RIGHT` - Orbit camera right

**Example**:
```typescript
const response = await reshootVideo(
  'projects/.../media/video123',
  'DOLLY_FORWARD',
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)
```

---

### 5. Check Video Generation Status

Poll for video generation progress and results.

**Endpoint**: `/v1/video:batchCheckAsyncVideoGenerationStatus`

**Method**: `POST`

**Request**:
```typescript
interface CheckVideoStatusRequest {
  operations: Array<{
    operation: {
      name: string  // Operation ID from generation response
    }
    sceneId: string
    status: string
  }>
}
```

**Response**:
```typescript
interface BatchCheckAsyncVideoGenerationStatusResponse {
  operations: Array<{
    name: string
    sceneId: string
    status: 'MEDIA_GENERATION_STATUS_PENDING'
          | 'MEDIA_GENERATION_STATUS_SUCCESSFUL'
          | 'MEDIA_GENERATION_STATUS_FAILED'
    media?: {
      name: string
      uri: string         // Video URL
      mimeType: string    // 'video/mp4'
    }
    error?: {
      message: string
    }
  }>
}
```

**Example**:
```typescript
const status = await checkVideoStatus([
  {
    operationId: 'operations/abc123',
    sceneId: 'scene-uuid',
    status: 'MEDIA_GENERATION_STATUS_PENDING'
  }
])

if (status.operations[0].status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
  console.log('Video URL:', status.operations[0].media.uri)
}
```

---

## Extension API Usage

### Command: `generateVideoText`

Generate video from text prompt.

**Parameters**:
```typescript
{
  prompt: string
  aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
}
```

**Example**:
```typescript
chrome.tabs.sendMessage(tabId, {
  action: 'generateVideoText',
  params: {
    prompt: 'a peaceful sunset over the ocean with gentle waves',
    aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  }
}, (response) => {
  const operationId = response.result.operations[0].name
  const sceneId = response.result.operations[0].sceneId

  console.log('Video generation started')
  console.log('Operation ID:', operationId)
  console.log('Scene ID:', sceneId)

  // Now poll for status...
})
```

---

### Command: `pollVideoUntilComplete`

Automatically poll video status until completion.

**Parameters**:
```typescript
{
  operationId: string
  sceneId: string
  onProgress?: (status: string) => void
}
```

**Example**:
```typescript
// Start video generation
chrome.tabs.sendMessage(tabId, {
  action: 'generateVideoText',
  params: {
    prompt: 'a mountain landscape',
    aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  }
}, async (genResponse) => {
  const operation = genResponse.result.operations[0]

  // Poll until complete
  chrome.tabs.sendMessage(tabId, {
    action: 'pollVideoUntilComplete',
    params: {
      operationId: operation.name,
      sceneId: operation.sceneId
    }
  }, (statusResponse) => {
    const video = statusResponse.result.operations[0]

    if (video.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      console.log('✅ Video ready:', video.media.uri)
    } else {
      console.error('❌ Video generation failed:', video.error)
    }
  })
})
```

---

## Complete Workflow Example

### Text-to-Video with Polling

```typescript
async function generateAndWaitForVideo(
  prompt: string,
  aspectRatio: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id!

      // Step 1: Start generation
      chrome.tabs.sendMessage(tabId, {
        action: 'generateVideoText',
        params: { prompt, aspectRatio }
      }, (genResponse) => {
        if (genResponse?.error) {
          reject(new Error(genResponse.error))
          return
        }

        const operation = genResponse.result.operations[0]
        console.log(`🎬 Video generation started (${operation.name})`)

        // Step 2: Poll for completion
        const pollInterval = 5000  // 5 seconds
        let attempts = 0
        const maxAttempts = 120    // 10 minutes max

        const poll = () => {
          chrome.tabs.sendMessage(tabId, {
            action: 'checkVideoStatus',
            params: {
              operations: [{
                operationId: operation.name,
                sceneId: operation.sceneId,
                status: 'MEDIA_GENERATION_STATUS_PENDING'
              }]
            }
          }, (statusResponse) => {
            attempts++
            const video = statusResponse.result.operations[0]

            console.log(`⏳ Attempt ${attempts}: ${video.status}`)

            if (video.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
              console.log('✅ Video ready!')
              resolve(video.media.uri)
            } else if (video.status === 'MEDIA_GENERATION_STATUS_FAILED') {
              reject(new Error(video.error?.message || 'Generation failed'))
            } else if (attempts >= maxAttempts) {
              reject(new Error('Timeout after 10 minutes'))
            } else {
              // Continue polling
              setTimeout(poll, pollInterval)
            }
          })
        }

        // Start polling
        setTimeout(poll, pollInterval)
      })
    })
  })
}

// Usage
try {
  const videoUrl = await generateAndWaitForVideo(
    'a serene mountain landscape with flowing river',
    'VIDEO_ASPECT_RATIO_LANDSCAPE'
  )
  console.log('Download video:', videoUrl)
} catch (error) {
  console.error('Failed:', error)
}
```

---

## Video Generation Timing

### Typical Generation Times

| Operation | Duration | Polling Interval |
|-----------|----------|------------------|
| Text-to-video | 30-90 seconds | 5 seconds |
| Image-to-video | 40-100 seconds | 5 seconds |
| Video extension | 30-70 seconds | 5 seconds |
| Camera reshoot | 25-60 seconds | 5 seconds |

### Recommended Polling Strategy

```typescript
const POLL_CONFIG = {
  interval: 5000,        // 5 seconds
  maxAttempts: 120,      // 10 minutes total
  exponentialBackoff: false  // Use fixed interval
}
```

---

## Error Handling

### Common Errors

**1. Generation Failed**
```json
{
  "error": {
    "message": "Video generation failed due to content policy violation"
  }
}
```

**Solution**: Adjust prompt to avoid policy violations

**2. Timeout**
```
Error: Timeout after 10 minutes
```

**Solution**: Retry or reduce video complexity

**3. Invalid Frame Range**
```json
{
  "error": {
    "message": "Invalid frame range: endFrameIndex must be greater than startFrameIndex"
  }
}
```

**Solution**: Check frame indices (video has 120 frames typically)

### Error Handling Code

```typescript
try {
  const response = await generateVideoFromText(prompt, aspectRatio)
  const videoUrl = await pollUntilComplete(response.operations[0])
  console.log('Success:', videoUrl)
} catch (error: any) {
  if (error.message.includes('policy')) {
    console.error('Prompt violates content policy')
  } else if (error.message.includes('Timeout')) {
    console.error('Generation took too long, please retry')
  } else {
    console.error('Generation error:', error.message)
  }
}
```

---

## Best Practices

### 1. Always Poll for Results

Videos are generated asynchronously - always poll for status:

```typescript
// ✅ Good
const genResponse = await generateVideoText(prompt, aspectRatio)
const videoUrl = await pollVideoUntilComplete(genResponse.operations[0])

// ❌ Bad - no video URL returned immediately
const genResponse = await generateVideoText(prompt, aspectRatio)
console.log(genResponse.operations[0].media)  // undefined!
```

### 2. Implement Timeout

```typescript
const timeout = 600000  // 10 minutes

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), timeout)
})

const videoUrl = await Promise.race([
  pollVideoUntilComplete(operation),
  timeoutPromise
])
```

### 3. Provide User Feedback

```typescript
await generateVideoWithProgress(
  prompt,
  aspectRatio,
  (status) => {
    if (status === 'MEDIA_GENERATION_STATUS_PENDING') {
      console.log('⏳ Generating video...')
    } else if (status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
      console.log('✅ Video ready!')
    }
  }
)
```

### 4. Handle Frame Indices Correctly

```typescript
// Video typically has 120 frames (4 seconds at 30fps)
const TOTAL_FRAMES = 120

// Extend from end (forward extension)
await extendVideo(prompt, videoId, 0, TOTAL_FRAMES, aspectRatio)

// Extend from start (backward extension)
await extendVideo(prompt, videoId, 0, 0, aspectRatio)
```

---

## Advanced Usage

### TypeScript Helper Class

```typescript
class VideoGenerator {
  private tabId: number

  constructor(tabId: number) {
    this.tabId = tabId
  }

  async generateTextToVideo(
    prompt: string,
    aspectRatio: 'VIDEO_ASPECT_RATIO_PORTRAIT' | 'VIDEO_ASPECT_RATIO_LANDSCAPE'
  ): Promise<string> {
    // Start generation
    const genResponse = await this.sendCommand('generateVideoText', {
      prompt,
      aspectRatio
    })

    const operation = genResponse.operations[0]

    // Poll for completion
    return this.pollUntilComplete(operation.name, operation.sceneId)
  }

  private async pollUntilComplete(
    operationId: string,
    sceneId: string
  ): Promise<string> {
    const maxAttempts = 120
    const interval = 5000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, interval))

      const status = await this.sendCommand('checkVideoStatus', {
        operations: [{
          operationId,
          sceneId,
          status: 'MEDIA_GENERATION_STATUS_PENDING'
        }]
      })

      const video = status.operations[0]

      if (video.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
        return video.media.uri
      }

      if (video.status === 'MEDIA_GENERATION_STATUS_FAILED') {
        throw new Error(video.error?.message || 'Generation failed')
      }
    }

    throw new Error('Timeout')
  }

  private sendCommand(action: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        this.tabId,
        { action, params },
        (response) => {
          if (response?.error) {
            reject(new Error(response.error))
          } else {
            resolve(response?.result)
          }
        }
      )
    })
  }
}
```

---

## See Also

- [Image Generation API](./image-generation.md) - Generate images
- [Making API Calls](../guides/making-api-calls.md) - Getting started
- [Video Workflows](../examples/video-workflows.md) - Complete examples
- [Troubleshooting](../troubleshooting/common-issues.md) - Common issues
