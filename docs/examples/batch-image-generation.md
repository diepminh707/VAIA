# Example: Batch Image Generation

## Overview

This example demonstrates how to generate multiple images in a single request using the Flowcio extension. You'll learn to:
- Set up a batch request with multiple prompts
- Handle responses and extract image URLs
- Implement error handling and retries
- Download generated images

## Prerequisites

- Flowcio extension installed and connected to Flow
- Flow project page open in browser
- Basic JavaScript/TypeScript knowledge

---

## Simple Example

### Code

```javascript
// Get active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tabId = tabs[0].id

  // Define prompts
  const prompts = [
    'a serene mountain landscape at golden hour',
    'a futuristic cyberpunk city at night',
    'a peaceful zen garden with koi pond',
    'an astronaut floating in space near Earth'
  ]

  // Generate images
  chrome.tabs.sendMessage(tabId, {
    action: 'batchGenerateImages',
    params: {
      prompts: prompts,
      aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
    }
  }, (response) => {
    if (response?.error) {
      console.error('Error:', response.error)
      return
    }

    // Process results
    const images = response.result.media
    console.log(`✅ Generated ${images.length} images`)

    images.forEach((img, i) => {
      console.log(`\nImage ${i + 1}:`)
      console.log(`  URL: ${img.uri}`)
      console.log(`  Size: ${img.width}x${img.height}`)
      console.log(`  Type: ${img.mimeType}`)
    })
  })
})
```

### Expected Output

```
✅ Generated 4 images

Image 1:
  URL: https://storage.googleapis.com/.../abc123.png
  Size: 1536x864
  Type: image/png

Image 2:
  URL: https://storage.googleapis.com/.../def456.png
  Size: 1536x864
  Type: image/png

Image 3:
  URL: https://storage.googleapis.com/.../ghi789.png
  Size: 1536x864
  Type: image/png

Image 4:
  URL: https://storage.googleapis.com/.../jkl012.png
  Size: 1536x864
  Type: image/png
```

---

## Complete Example with Error Handling

### TypeScript Implementation

```typescript
interface ImageGenerationResult {
  success: boolean
  images?: Array<{
    url: string
    width: number
    height: number
    prompt: string
  }>
  error?: string
}

async function generateBatchImages(
  prompts: string[],
  aspectRatio: string = 'IMAGE_ASPECT_RATIO_LANDSCAPE'
): Promise<ImageGenerationResult> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        resolve({ success: false, error: 'No active tab found' })
        return
      }

      const tabId = tabs[0].id

      // Send generation request
      chrome.tabs.sendMessage(
        tabId,
        {
          action: 'batchGenerateImages',
          params: { prompts, aspectRatio }
        },
        (response) => {
          // Check for errors
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: chrome.runtime.lastError.message
            })
            return
          }

          if (response?.error) {
            resolve({
              success: false,
              error: response.error
            })
            return
          }

          // Process successful response
          const images = response.result.media.map((img: any, i: number) => ({
            url: img.uri,
            width: img.width,
            height: img.height,
            prompt: prompts[i] || 'unknown'
          }))

          resolve({ success: true, images })
        }
      )

      // Timeout after 60 seconds
      setTimeout(() => {
        resolve({ success: false, error: 'Request timeout' })
      }, 60000)
    })
  })
}

// Usage
const result = await generateBatchImages([
  'a peaceful sunset',
  'a busy city street',
  'a tropical beach'
], 'IMAGE_ASPECT_RATIO_SQUARE')

if (result.success) {
  console.log(`✅ Generated ${result.images!.length} images`)
  result.images!.forEach(img => {
    console.log(`  - ${img.prompt}: ${img.url}`)
  })
} else {
  console.error(`❌ Generation failed: ${result.error}`)
}
```

---

## Advanced Example: Batch Generator Class

### Full Implementation

```typescript
class BatchImageGenerator {
  private tabId: number | null = null

  async initialize(): Promise<boolean> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tabs[0]?.id) {
      console.error('No active tab found')
      return false
    }

    this.tabId = tabs[0].id

    // Test connection
    try {
      const status = await this.sendCommand('testConnection')
      console.log('✅ Connected to Flow:', status)
      return status.connected
    } catch (error) {
      console.error('❌ Connection failed:', error)
      return false
    }
  }

  private sendCommand(action: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.tabId) {
        reject(new Error('Generator not initialized'))
        return
      }

      chrome.tabs.sendMessage(
        this.tabId,
        { action, params },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else if (response?.error) {
            reject(new Error(response.error))
          } else {
            resolve(response?.result)
          }
        }
      )
    })
  }

  async generateBatch(
    prompts: string[],
    aspectRatio: string = 'IMAGE_ASPECT_RATIO_LANDSCAPE'
  ) {
    console.log(`🎨 Generating ${prompts.length} images...`)

    const startTime = Date.now()

    const result = await this.sendCommand('batchGenerateImages', {
      prompts,
      aspectRatio
    })

    const duration = Date.now() - startTime

    console.log(`✅ Generated ${result.media.length} images in ${duration}ms`)

    return result.media.map((img: any, i: number) => ({
      prompt: prompts[i],
      url: img.uri,
      mediaId: img.name,
      width: img.width,
      height: img.height,
      mimeType: img.mimeType
    }))
  }

  async generateBatchWithProgress(
    prompts: string[],
    aspectRatio: string,
    onProgress: (current: number, total: number, prompt: string) => void
  ) {
    const results = []

    for (let i = 0; i < prompts.length; i++) {
      onProgress(i, prompts.length, prompts[i])

      const result = await this.generateBatch([prompts[i]], aspectRatio)
      results.push(result[0])

      // Delay between individual requests (2 seconds)
      if (i < prompts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    onProgress(prompts.length, prompts.length, '')
    return results
  }

  async generateWithRetry(
    prompts: string[],
    aspectRatio: string,
    maxRetries: number = 3
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateBatch(prompts, aspectRatio)
      } catch (error: any) {
        console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed:`, error.message)

        if (attempt === maxRetries) {
          throw error
        }

        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt) * 1000
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  async downloadImage(url: string, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url,
          filename,
          saveAs: false
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            console.log(`📥 Downloaded: ${filename} (ID: ${downloadId})`)
            resolve()
          }
        }
      )
    })
  }

  async generateAndDownload(
    prompts: string[],
    aspectRatio: string,
    downloadPrefix: string = 'flow_image'
  ) {
    // Generate images
    const images = await this.generateBatch(prompts, aspectRatio)

    // Download each image
    for (let i = 0; i < images.length; i++) {
      const filename = `${downloadPrefix}_${i + 1}.png`
      await this.downloadImage(images[i].url, filename)
    }

    console.log(`✅ Downloaded ${images.length} images`)
    return images
  }
}
```

### Usage Examples

#### Example 1: Basic Batch Generation

```typescript
const generator = new BatchImageGenerator()
await generator.initialize()

const images = await generator.generateBatch([
  'a sunset over mountains',
  'a futuristic city',
  'a tropical beach'
], 'IMAGE_ASPECT_RATIO_LANDSCAPE')

console.log('Generated images:', images)
```

#### Example 2: With Progress Tracking

```typescript
const images = await generator.generateBatchWithProgress(
  [
    'prompt 1',
    'prompt 2',
    'prompt 3',
    'prompt 4',
    'prompt 5'
  ],
  'IMAGE_ASPECT_RATIO_SQUARE',
  (current, total, prompt) => {
    console.log(`Progress: ${current}/${total}`)
    if (prompt) {
      console.log(`  Generating: "${prompt}"`)
    }
  }
)

// Output:
// Progress: 0/5
//   Generating: "prompt 1"
// Progress: 1/5
//   Generating: "prompt 2"
// ...
```

#### Example 3: With Retry Logic

```typescript
try {
  const images = await generator.generateWithRetry(
    ['a sunset', 'a city'],
    'IMAGE_ASPECT_RATIO_LANDSCAPE',
    3  // Max 3 attempts
  )
  console.log('Success:', images)
} catch (error) {
  console.error('Failed after 3 attempts:', error)
}
```

#### Example 4: Generate and Download

```typescript
await generator.generateAndDownload(
  [
    'a mountain landscape',
    'a beach sunset',
    'a forest path'
  ],
  'IMAGE_ASPECT_RATIO_LANDSCAPE',
  'my_images'
)

// Downloads:
// - my_images_1.png
// - my_images_2.png
// - my_images_3.png
```

---

## Performance Optimization

### Optimal Batch Sizes

```typescript
const prompts = [
  // ... 12 prompts total
]

// ✅ Good: Split into batches of 4
const batches = [
  prompts.slice(0, 4),   // Batch 1
  prompts.slice(4, 8),   // Batch 2
  prompts.slice(8, 12)   // Batch 3
]

for (const batch of batches) {
  const images = await generator.generateBatch(batch, aspectRatio)
  console.log(`Batch complete: ${images.length} images`)

  // 3-second delay between batches
  await new Promise(resolve => setTimeout(resolve, 3000))
}
```

### Parallel Generation (Different Aspect Ratios)

```typescript
const [landscape, portrait, square] = await Promise.all([
  generator.generateBatch(['prompt1'], 'IMAGE_ASPECT_RATIO_LANDSCAPE'),
  generator.generateBatch(['prompt2'], 'IMAGE_ASPECT_RATIO_PORTRAIT'),
  generator.generateBatch(['prompt3'], 'IMAGE_ASPECT_RATIO_SQUARE')
])

console.log('Generated 3 images in parallel with different aspect ratios')
```

---

## Real-World Example: Theme Generator

```typescript
async function generateThemeSet(theme: string) {
  const generator = new BatchImageGenerator()
  await generator.initialize()

  const prompts = {
    landscape: `${theme} landscape in wide format`,
    portrait: `${theme} portrait orientation`,
    square: `${theme} square composition`,
    ultrawide: `${theme} ultra-wide panorama`
  }

  const results = {
    landscape: await generator.generateBatch(
      [prompts.landscape],
      'IMAGE_ASPECT_RATIO_LANDSCAPE'
    ),
    portrait: await generator.generateBatch(
      [prompts.portrait],
      'IMAGE_ASPECT_RATIO_PORTRAIT'
    ),
    square: await generator.generateBatch(
      [prompts.square],
      'IMAGE_ASPECT_RATIO_SQUARE'
    ),
    ultrawide: await generator.generateBatch(
      [prompts.ultrawide],
      'IMAGE_ASPECT_RATIO_ULTRA_WIDE'
    )
  }

  // Download all images
  await generator.downloadImage(results.landscape[0].url, `${theme}_landscape.png`)
  await generator.downloadImage(results.portrait[0].url, `${theme}_portrait.png`)
  await generator.downloadImage(results.square[0].url, `${theme}_square.png`)
  await generator.downloadImage(results.ultrawide[0].url, `${theme}_ultrawide.png`)

  console.log(`✅ Generated complete theme set for: ${theme}`)
  return results
}

// Usage
await generateThemeSet('cyberpunk')
// Generates: cyberpunk_landscape.png, cyberpunk_portrait.png, etc.
```

---

## Error Handling Strategies

### Graceful Degradation

```typescript
async function generateWithFallback(
  prompts: string[],
  aspectRatio: string
) {
  const generator = new BatchImageGenerator()

  try {
    // Try batch generation first
    return await generator.generateBatch(prompts, aspectRatio)
  } catch (error: any) {
    console.warn('Batch generation failed, trying individual requests...', error.message)

    // Fallback: Generate one at a time
    const results = []
    for (const prompt of prompts) {
      try {
        const [image] = await generator.generateBatch([prompt], aspectRatio)
        results.push(image)
      } catch (err) {
        console.error(`Failed to generate: ${prompt}`, err)
        results.push(null)
      }

      // Delay between individual requests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return results.filter(img => img !== null)
  }
}
```

---

## See Also

- [Making API Calls Guide](../guides/making-api-calls.md) - Basics of API usage
- [Image Generation API](../api-reference/image-generation.md) - Complete API reference
- [reCAPTCHA Troubleshooting](../troubleshooting/recaptcha-errors.md) - Fix common errors
- [Architecture Overview](../architecture/overview.md) - How the extension works
