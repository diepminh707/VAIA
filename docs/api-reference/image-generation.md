# Image Generation API

## Overview

The Image Generation API allows you to create images using Google's Imagen 2 model (GEM_PIX_2) through the Flow platform. Supports both text-to-image and image-to-image generation.

## Endpoints

### 1. Upload User Image

Upload a reference image for image-to-image generation.

**Endpoint**: `/v1:uploadUserImage`

**Method**: `POST`

**Request**:
```typescript
interface UploadUserImageRequest {
  imageInput: {
    rawImageBytes: string           // Base64-encoded image
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
    isUserUploaded: true
    aspectRatio: string             // e.g., 'IMAGE_ASPECT_RATIO_SQUARE'
  }
  clientContext: {
    sessionId: string
  }
}
```

**Response**:
```typescript
interface UploadUserImageResponse {
  mediaId: string                  // ID to use in image generation
  uri: string                      // Preview URL
  mimeType: string
}
```

**Example**:
```typescript
const response = await uploadUserImage(
  'data:image/png;base64,iVBORw0KGgoAAAANS...',
  'image/png',
  'IMAGE_ASPECT_RATIO_SQUARE'
)
// Returns: { mediaId: 'projects/.../media/abc123', uri: '...', mimeType: 'image/png' }
```

---

### 2. Batch Generate Images

Generate one or more images from text prompts or reference images.

**Endpoint**: `/v1/projects/{projectId}/flowMedia:batchGenerateImages`

**Method**: `POST`

**Request Structure**:
```typescript
interface BatchGenerateImagesRequest {
  clientContext: {
    recaptchaToken: string         // Fresh reCAPTCHA token
    sessionId: string               // Session ID
  }
  requests: Array<{
    clientContext: {
      recaptchaToken: string       // Same token
      sessionId: string
      projectId: string
      tool: 'PINHOLE'              // Fixed value
    }
    seed: number                   // Random seed (0-1000000)
    imageModelName: 'GEM_PIX_2'    // Imagen 2 model
    imageAspectRatio: string       // Aspect ratio (see below)
    prompt: string                 // Text prompt
    imageInputs: Array<{           // Optional: reference images
      name: string                 // Media ID from upload
      imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE'
    }>
  }>
}
```

**Response**:
```typescript
interface BatchGenerateImagesResponse {
  media: Array<{
    name: string                   // Media ID
    uri: string                    // Image URL
    mimeType: string               // 'image/png'
    width?: number
    height?: number
  }>
  workflows: Array<{
    workflowId: string
    status: string
  }>
}
```

---

## Aspect Ratios

Supported aspect ratios for image generation:

| Constant | Ratio | Dimensions | Use Case |
|----------|-------|------------|----------|
| `IMAGE_ASPECT_RATIO_SQUARE` | 1:1 | 1024x1024 | Social media, profile pics |
| `IMAGE_ASPECT_RATIO_LANDSCAPE` | 16:9 | 1536x864 | Desktop wallpapers, YouTube |
| `IMAGE_ASPECT_RATIO_PORTRAIT` | 9:16 | 864x1536 | Mobile wallpapers, stories |
| `IMAGE_ASPECT_RATIO_ULTRA_WIDE` | 21:9 | 1920x823 | Ultra-wide monitors |
| `IMAGE_ASPECT_RATIO_4_3` | 4:3 | 1024x768 | Classic displays |
| `IMAGE_ASPECT_RATIO_3_2` | 3:2 | 1536x1024 | Photography standard |

**Default**: If not specified, Flow uses `IMAGE_ASPECT_RATIO_SQUARE`

---

## Extension API Usage

### Command: `batchGenerateImages`

**Parameters**:
```typescript
{
  prompts: string[]               // Array of text prompts
  aspectRatio: string             // Aspect ratio constant
  referenceImages?: string[]      // Optional: Array of media IDs
}
```

**Example 1: Text-to-Image**
```typescript
// From popup or external code
chrome.tabs.sendMessage(tabId, {
  action: 'batchGenerateImages',
  params: {
    prompts: [
      'a serene mountain landscape at sunset',
      'a futuristic city with flying cars'
    ],
    aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
  }
}, (response) => {
  console.log('Generated images:', response.result.media)
})
```

**Example 2: Image-to-Image**
```typescript
// First upload reference image
chrome.tabs.sendMessage(tabId, {
  action: 'uploadImage',
  params: {
    imageBase64: 'data:image/png;base64,...',
    mimeType: 'image/png',
    aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE'
  }
}, (uploadResponse) => {
  const mediaId = uploadResponse.result.mediaId

  // Then generate with reference
  chrome.tabs.sendMessage(tabId, {
    action: 'batchGenerateImages',
    params: {
      prompts: ['same style but with mountains'],
      aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
      referenceImages: [mediaId]
    }
  }, (response) => {
    console.log('Generated images:', response.result.media)
  })
})
```

---

## Code Examples

### TypeScript Implementation (Injected Script)

```typescript
async function batchGenerateImages(
  prompts: string[],
  aspectRatio: string,
  referenceImages?: string[]
): Promise<BatchGenerateImagesResponse[]> {
  // Generate fresh reCAPTCHA token
  const recaptchaToken = await getReCaptchaToken()

  if (!recaptchaToken) {
    throw new Error('Failed to generate reCAPTCHA token')
  }

  // Build clientContext (used at both root and request level)
  const clientContext = {
    recaptchaToken,
    sessionId: flowContext.sessionId || `;${Date.now()}`,
  }

  // Build requests array
  const requests = prompts.map((prompt) => ({
    clientContext: {
      ...clientContext,
      projectId: flowContext.projectId || '',
      tool: 'PINHOLE' as const,
    },
    seed: Math.floor(Math.random() * 1000000),
    imageModelName: 'GEM_PIX_2' as const,
    imageAspectRatio: aspectRatio,
    prompt,
    imageInputs: referenceImages
      ? referenceImages.map((mediaId) => ({
          name: mediaId,
          imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE' as const,
        }))
      : [],
  }))

  // Build complete payload
  const payload = {
    clientContext,  // Root-level context
    requests,
  }

  // Make API call
  const projectId = flowContext.projectId || 'default-project'
  return callFlowAPI<BatchGenerateImagesResponse[]>(
    `/v1/projects/${projectId}/flowMedia:batchGenerateImages`,
    payload
  )
}
```

### Full Request Example

```json
{
  "clientContext": {
    "recaptchaToken": "0cAFcWeA5B80zOb7e1TrRjB272uWQycjb1i70TwZ...",
    "sessionId": ";1766302095275"
  },
  "requests": [
    {
      "clientContext": {
        "recaptchaToken": "0cAFcWeA5B80zOb7e1TrRjB272uWQycjb1i70TwZ...",
        "sessionId": ";1766302095275",
        "projectId": "d2ae3b88-f83c-4acf-a214-e9f1e5f35c7f",
        "tool": "PINHOLE"
      },
      "seed": 138325,
      "imageModelName": "GEM_PIX_2",
      "imageAspectRatio": "IMAGE_ASPECT_RATIO_LANDSCAPE",
      "prompt": "a serene mountain landscape at sunset",
      "imageInputs": []
    }
  ]
}
```

### Full Response Example

```json
{
  "media": [
    {
      "name": "projects/d2ae3b88-f83c-4acf-a214-e9f1e5f35c7f/media/abc123def456",
      "uri": "https://storage.googleapis.com/flow-media/abc123def456.png",
      "mimeType": "image/png",
      "width": 1536,
      "height": 864
    }
  ],
  "workflows": [
    {
      "workflowId": "workflow_abc123",
      "status": "COMPLETED"
    }
  ]
}
```

---

## Error Handling

### Common Errors

**403 Forbidden - reCAPTCHA Failed**
```json
{
  "error": {
    "code": 403,
    "message": "reCAPTCHA evaluation failed",
    "status": "PERMISSION_DENIED",
    "details": [{
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      "reason": "PUBLIC_ERROR_SOMETHING_WENT_WRONG"
    }]
  }
}
```

**Solution**: Generate fresh reCAPTCHA token (don't cache)

**401 Unauthorized - Token Expired**
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```

**Solution**: Refresh Flow page to get new OAuth token

**400 Bad Request - Invalid Parameters**
```json
{
  "error": {
    "code": 400,
    "message": "Invalid aspect ratio",
    "status": "INVALID_ARGUMENT"
  }
}
```

**Solution**: Check aspect ratio constant is valid

### Error Handling Code

```typescript
try {
  const result = await batchGenerateImages(prompts, aspectRatio)
  console.log('Success:', result)
} catch (error: any) {
  if (error.message.includes('reCAPTCHA')) {
    console.error('reCAPTCHA failed - generating fresh token...')
    // Retry with new token
  } else if (error.message.includes('401')) {
    console.error('Auth expired - please refresh Flow page')
  } else {
    console.error('Generation failed:', error.message)
  }
}
```

---

## Rate Limits and Best Practices

### Rate Limits

- **Concurrent requests**: Max 4 simultaneous requests
- **Batch size**: Max 4 prompts per batch
- **Generation time**: ~10-30 seconds per image

### Best Practices

**1. Use Appropriate Batch Sizes**
```typescript
// ✅ Good: Batch multiple prompts
batchGenerateImages([
  'prompt 1',
  'prompt 2',
  'prompt 3'
], aspectRatio)

// ❌ Bad: Separate calls for each
batchGenerateImages(['prompt 1'], aspectRatio)
batchGenerateImages(['prompt 2'], aspectRatio)
batchGenerateImages(['prompt 3'], aspectRatio)
```

**2. Handle Timeouts**
```typescript
const TIMEOUT = 60000  // 60 seconds

const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Generation timeout')), TIMEOUT)
})

const result = await Promise.race([
  batchGenerateImages(prompts, aspectRatio),
  timeoutPromise
])
```

**3. Validate Input**
```typescript
function validatePrompts(prompts: string[]): boolean {
  if (!prompts || prompts.length === 0) {
    throw new Error('At least one prompt required')
  }

  if (prompts.length > 4) {
    throw new Error('Max 4 prompts per batch')
  }

  if (prompts.some(p => p.length > 1000)) {
    throw new Error('Prompt too long (max 1000 characters)')
  }

  return true
}
```

**4. Monitor Progress**
```typescript
console.log(`[Flowcio] Generating ${prompts.length} images...`)

const startTime = Date.now()
const result = await batchGenerateImages(prompts, aspectRatio)

const duration = Date.now() - startTime
console.log(`[Flowcio] Generated in ${duration}ms`)
```

---

## Advanced Usage

### Random Seed Control

Control image variations with seed values:

```typescript
// Generate variations of same prompt
const basePrompt = 'a futuristic city'

const requests = Array.from({ length: 4 }, (_, i) => ({
  clientContext: { ... },
  seed: 100 + i,  // Different seeds
  prompt: basePrompt,
  // ... other fields
}))
```

### Image-to-Image Strength

While not directly exposed in the API, you can influence style transfer strength through prompt engineering:

```typescript
// Stronger style transfer
prompt: 'exact same composition, but with mountains'

// Looser style transfer
prompt: 'inspired by this style, create a mountain scene'
```

---

## See Also

- [Video Generation API](./video-generation.md) - Generate videos
- [Authentication](../architecture/authentication.md) - Auth flow details
- [Troubleshooting](../troubleshooting/recaptcha-errors.md) - Common issues
- [Examples](../examples/batch-image-generation.md) - Complete working examples
