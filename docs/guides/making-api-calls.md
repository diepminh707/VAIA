# Making API Calls

## Overview

This guide walks you through making your first API calls with the Flowcio extension, from installation to generating images and videos.

## Prerequisites

1. **Chrome or Edge browser** (Manifest V3 required)
2. **Google Flow account** (labs.google/fx/tools/flow)
3. **Flowcio extension built** (`npm run build:extension`)

---

## Step 1: Load the Extension

### Build Extension

```bash
cd flowcio
npm install
npm run build:extension
```

Output: `flowcio/extension/dist/`

### Install in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select `flowcio/extension/dist/` folder
5. Extension icon should appear in toolbar

### Verify Installation

Click the Flowcio extension icon. You should see:
```
Status: Not connected
Please navigate to Google Flow to use this extension
```

---

## Step 2: Connect to Flow

### Navigate to Flow

1. Open [https://labs.google/fx/tools/flow](https://labs.google/fx/tools/flow)
2. Sign in with Google account
3. Create or open a project

**Example URL**:
```
https://labs.google/fx/tools/flow/project/d2ae3b88-f83c-4acf-a214-e9f1e5f35c7f
```

### Wait for Page Load

The extension needs 3-5 seconds to:
- Inject scripts into the page
- Extract session and project ID
- Capture authentication tokens
- Initialize reCAPTCHA

### Verify Connection

Click the extension icon again. You should see:
```
✅ Connected to Flow
Session: ;1766302095275
Project: d2ae3b88-f83c-4acf-a214-e9f1e5f35c7f
Auth Token: Available
```

---

## Step 3: Test Connection

### Using Extension Popup

1. Click extension icon
2. Click **"Test Connection"** button
3. Check console output

**Expected response**:
```json
{
  "connected": true,
  "url": "https://labs.google/fx/tools/flow/project/...",
  "initialized": true,
  "hasAuth": true,
  "hasRecaptcha": true,
  "recaptchaAge": 5,
  "sessionId": ";1766302095275",
  "projectId": "d2ae3b88-f83c-4acf-a214-e9f1e5f35c7f"
}
```

### Using DevTools Console

```javascript
// Get active tab ID
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id

  // Send test command
  chrome.tabs.sendMessage(tabId, {
    action: 'testConnection'
  }, (response) => {
    console.log('Connection:', response)
  })
})
```

---

## Step 4: Generate Your First Image

### Via Extension Popup

1. Click extension icon
2. Enter prompt: `a beautiful sunset over mountains`
3. Select aspect ratio: **Landscape**
4. Click **"Generate Images"**
5. Wait ~15-20 seconds
6. View generated images in response

### Via DevTools Console

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'batchGenerateImages',
    params: {
      prompts: ['a beautiful sunset over mountains'],
      aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
    }
  }, (response) => {
    if (response.error) {
      console.error('Error:', response.error)
    } else {
      console.log('Generated images:', response.result.media)

      // Access image URLs
      response.result.media.forEach((image, i) => {
        console.log(`Image ${i + 1}:`, image.uri)
      })
    }
  })
})
```

### Expected Response

```json
{
  "media": [
    {
      "name": "projects/.../media/abc123",
      "uri": "https://storage.googleapis.com/.../image.png",
      "mimeType": "image/png",
      "width": 1536,
      "height": 864
    }
  ],
  "workflows": [
    {
      "workflowId": "workflow_123",
      "status": "COMPLETED"
    }
  ]
}
```

---

## Step 5: Generate Multiple Images (Batch)

### Batch Request

```javascript
chrome.tabs.sendMessage(tabId, {
  action: 'batchGenerateImages',
  params: {
    prompts: [
      'a serene mountain landscape',
      'a futuristic city at night',
      'a tropical beach sunset',
      'a snowy forest path'
    ],
    aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE'
  }
}, (response) => {
  console.log(`Generated ${response.result.media.length} images`)

  response.result.media.forEach((img, i) => {
    console.log(`${i + 1}. ${img.uri}`)
  })
})
```

### Best Practices

**Batch size**: 1-4 prompts per request
```typescript
// ✅ Good
prompts: ['prompt1', 'prompt2', 'prompt3']

// ❌ Too many (slower, higher error rate)
prompts: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
```

**Add delays between batches**:
```javascript
async function generateWithDelay(batches) {
  for (const batch of batches) {
    await generateImages(batch)
    await new Promise(resolve => setTimeout(resolve, 3000))  // 3s delay
  }
}
```

---

## Step 6: Image-to-Image Generation

### Upload Reference Image

```javascript
// First, convert image to base64
const imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANS...'

// Upload image
chrome.tabs.sendMessage(tabId, {
  action: 'uploadImage',
  params: {
    imageBase64: imageBase64,
    mimeType: 'image/png',
    aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE'
  }
}, (uploadResponse) => {
  const mediaId = uploadResponse.result.mediaId
  console.log('Uploaded image ID:', mediaId)

  // Now generate with reference
  chrome.tabs.sendMessage(tabId, {
    action: 'batchGenerateImages',
    params: {
      prompts: ['same style but in winter'],
      aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
      referenceImages: [mediaId]
    }
  }, (genResponse) => {
    console.log('Generated with reference:', genResponse.result.media)
  })
})
```

### Helper: Load Image as Base64

```javascript
function loadImageAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      resolve(event.target.result)  // data:image/...;base64,...
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Usage
const input = document.createElement('input')
input.type = 'file'
input.accept = 'image/*'
input.onchange = async (e) => {
  const file = e.target.files[0]
  const base64 = await loadImageAsBase64(file)

  chrome.tabs.sendMessage(tabId, {
    action: 'uploadImage',
    params: {
      imageBase64: base64,
      mimeType: file.type,
      aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE'
    }
  }, (response) => {
    console.log('Upload complete:', response)
  })
}
input.click()
```

---

## Step 7: Advanced Usage

### TypeScript Wrapper

```typescript
interface FlowcioClient {
  testConnection(): Promise<any>
  generateImages(prompts: string[], aspectRatio: string): Promise<any>
  uploadImage(base64: string, mimeType: string): Promise<string>
}

class FlowcioClient {
  private tabId: number

  constructor(tabId: number) {
    this.tabId = tabId
  }

  private sendMessage(action: string, params?: any): Promise<any> {
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

  async testConnection() {
    return this.sendMessage('testConnection')
  }

  async generateImages(prompts: string[], aspectRatio: string) {
    return this.sendMessage('batchGenerateImages', { prompts, aspectRatio })
  }

  async uploadImage(base64: string, mimeType: string, aspectRatio: string = 'IMAGE_ASPECT_RATIO_SQUARE') {
    const result = await this.sendMessage('uploadImage', {
      imageBase64: base64,
      mimeType,
      aspectRatio
    })
    return result.mediaId
  }
}

// Usage
const client = new FlowcioClient(tabId)

try {
  const status = await client.testConnection()
  console.log('Connected:', status)

  const result = await client.generateImages(
    ['a sunset', 'a city'],
    'IMAGE_ASPECT_RATIO_LANDSCAPE'
  )
  console.log('Images:', result.media)
} catch (error) {
  console.error('Error:', error)
}
```

### Retry Logic

```typescript
async function generateWithRetry(
  prompts: string[],
  aspectRatio: string,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.generateImages(prompts, aspectRatio)
    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error.message)

      if (attempt === maxRetries) {
        throw error
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000  // 2s, 4s, 8s
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

### Progress Tracking

```typescript
async function generateWithProgress(
  prompts: string[],
  onProgress: (current: number, total: number) => void
) {
  const results = []

  for (let i = 0; i < prompts.length; i++) {
    onProgress(i, prompts.length)

    const result = await client.generateImages(
      [prompts[i]],
      'IMAGE_ASPECT_RATIO_SQUARE'
    )

    results.push(result.media[0])

    // Delay between requests
    if (i < prompts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  onProgress(prompts.length, prompts.length)
  return results
}

// Usage
await generateWithProgress(
  ['prompt1', 'prompt2', 'prompt3'],
  (current, total) => {
    console.log(`Progress: ${current}/${total}`)
  }
)
```

---

## Error Handling

### Common Errors

**1. Extension not connected**
```javascript
// Error: "No auth token available"
// Solution: Navigate to Flow project page
```

**2. reCAPTCHA failure**
```javascript
// Error: "reCAPTCHA evaluation failed"
// Solution: Generate one image in Flow UI first
```

**3. Timeout**
```javascript
// Error: "Command timeout"
// Solution: Increase timeout or check network
```

### Robust Error Handler

```typescript
async function safeGenerate(prompts: string[], aspectRatio: string) {
  try {
    const result = await client.generateImages(prompts, aspectRatio)
    return { success: true, data: result }
  } catch (error: any) {
    const message = error.message

    if (message.includes('not connected')) {
      return {
        success: false,
        error: 'Please navigate to Flow project page',
        code: 'NOT_CONNECTED'
      }
    }

    if (message.includes('reCAPTCHA')) {
      return {
        success: false,
        error: 'Generate an image in Flow UI first',
        code: 'RECAPTCHA_FAILED'
      }
    }

    if (message.includes('timeout')) {
      return {
        success: false,
        error: 'Request timed out, please retry',
        code: 'TIMEOUT'
      }
    }

    return {
      success: false,
      error: message,
      code: 'UNKNOWN'
    }
  }
}
```

---

## Performance Tips

### 1. Batch Related Prompts

```typescript
// ✅ Good: Related prompts in one batch
await client.generateImages([
  'sunset over mountains',
  'sunrise over mountains',
  'midday mountains'
], aspectRatio)

// ❌ Suboptimal: Separate calls
await client.generateImages(['sunset over mountains'], aspectRatio)
await client.generateImages(['sunrise over mountains'], aspectRatio)
await client.generateImages(['midday mountains'], aspectRatio)
```

### 2. Parallel Batches (Different Aspect Ratios)

```typescript
const [landscape, portrait] = await Promise.all([
  client.generateImages(['prompt1'], 'IMAGE_ASPECT_RATIO_LANDSCAPE'),
  client.generateImages(['prompt2'], 'IMAGE_ASPECT_RATIO_PORTRAIT')
])
```

### 3. Monitor Generation Time

```typescript
const start = Date.now()
const result = await client.generateImages(prompts, aspectRatio)
const duration = Date.now() - start

console.log(`Generated ${result.media.length} images in ${duration}ms`)
console.log(`Average: ${Math.round(duration / result.media.length)}ms per image`)
```

---

## Next Steps

- [Image Generation API Reference](../api-reference/image-generation.md) - Detailed API docs
- [Video Generation Guide](../api-reference/video-generation.md) - Generate videos
- [Batch Image Example](../examples/batch-image-generation.md) - Complete working example
- [Troubleshooting](../troubleshooting/recaptcha-errors.md) - Fix common issues
