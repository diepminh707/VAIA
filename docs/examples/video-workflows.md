# Example: Video Generation Workflows

## Overview

This guide demonstrates complete video generation workflows using the Flowcio extension, from text-to-video to advanced multi-step video creation pipelines.

---

## Prerequisites

- Flowcio extension installed and connected to Flow
- Flow project page open
- Understanding of async video generation (requires polling)

---

## Workflow 1: Simple Text-to-Video

Generate a video from a text prompt and poll until completion.

### Code

```typescript
async function generateVideoSimple(
  prompt: string,
  aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE' | 'VIDEO_ASPECT_RATIO_PORTRAIT'
): Promise<string> {
  const tabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id!

  return new Promise((resolve, reject) => {
    // Step 1: Start video generation
    chrome.tabs.sendMessage(tabId, {
      action: 'generateVideoText',
      params: { prompt, aspectRatio }
    }, (genResponse) => {
      if (genResponse?.error) {
        reject(new Error(genResponse.error))
        return
      }

      const operation = genResponse.result.operations[0]
      console.log('🎬 Video generation started')
      console.log('Operation ID:', operation.name)

      // Step 2: Poll for completion
      let attempts = 0
      const maxAttempts = 120  // 10 minutes
      const pollInterval = 5000  // 5 seconds

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

          console.log(`⏳ Attempt ${attempts}/${maxAttempts}: ${video.status}`)

          if (video.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
            console.log('✅ Video ready!')
            resolve(video.media.uri)
          } else if (video.status === 'MEDIA_GENERATION_STATUS_FAILED') {
            reject(new Error(video.error?.message || 'Generation failed'))
          } else if (attempts >= maxAttempts) {
            reject(new Error('Timeout after 10 minutes'))
          } else {
            setTimeout(poll, pollInterval)
          }
        })
      }

      // Start polling after 5 seconds
      setTimeout(poll, pollInterval)
    })
  })
}

// Usage
try {
  const videoUrl = await generateVideoSimple(
    'a serene mountain landscape with flowing river and birds flying',
    'VIDEO_ASPECT_RATIO_LANDSCAPE'
  )

  console.log('✅ Video generated:', videoUrl)
  window.open(videoUrl, '_blank')  // Open in new tab
} catch (error) {
  console.error('❌ Failed:', error)
}
```

---

## Workflow 2: Image-to-Video Pipeline

Generate images first, then create a video using those images as start/end frames.

### Code

```typescript
async function generateImageToVideoWorkflow() {
  const tabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id!

  console.log('🎨 Step 1: Generating start and end images...')

  // Generate two images
  const imageResponse = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {
      action: 'batchGenerateImages',
      params: {
        prompts: [
          'a mountain landscape at sunrise, wide angle',
          'the same mountain landscape at sunset, wide angle'
        ],
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
      }
    }, (response) => {
      if (response?.error) {
        reject(new Error(response.error))
      } else {
        resolve(response.result)
      }
    })
  })

  const startImageId = imageResponse.media[0].name
  const endImageId = imageResponse.media[1].name

  console.log('✅ Images generated')
  console.log('Start image:', imageResponse.media[0].uri)
  console.log('End image:', imageResponse.media[1].uri)

  console.log('\n🎬 Step 2: Creating video from images...')

  // Generate video from images
  const videoResponse = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {
      action: 'generateVideoImages',
      params: {
        prompt: 'smooth transition from sunrise to sunset',
        startImageId,
        endImageId,
        aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
      }
    }, (response) => {
      if (response?.error) {
        reject(new Error(response.error))
      } else {
        resolve(response.result)
      }
    })
  })

  const operation = videoResponse.operations[0]

  console.log('⏳ Step 3: Polling for video completion...')

  // Poll for completion
  const videoUrl = await pollVideoStatus(tabId, operation)

  console.log('✅ Video ready:', videoUrl)
  return {
    startImage: imageResponse.media[0].uri,
    endImage: imageResponse.media[1].uri,
    video: videoUrl
  }
}

// Helper function for polling
async function pollVideoStatus(tabId: number, operation: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let attempts = 0
    const maxAttempts = 120
    const pollInterval = 5000

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

        if (video.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
          resolve(video.media.uri)
        } else if (video.status === 'MEDIA_GENERATION_STATUS_FAILED') {
          reject(new Error(video.error?.message || 'Failed'))
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout'))
        } else {
          setTimeout(poll, pollInterval)
        }
      })
    }

    setTimeout(poll, pollInterval)
  })
}

// Usage
const result = await generateImageToVideoWorkflow()
console.log('Workflow complete:', result)
```

---

## Workflow 3: Video Extension Chain

Create a base video and extend it multiple times.

### Code

```typescript
async function extendVideoChain(
  initialPrompt: string,
  extensionPrompts: string[],
  aspectRatio: string
) {
  const tabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id!

  console.log('🎬 Creating initial video...')

  // Step 1: Create initial video
  const initialVideoUrl = await generateVideoSimple(initialPrompt, aspectRatio)
  console.log('✅ Initial video:', initialVideoUrl)

  // Extract media ID from URL or response
  const initialVideoId = 'projects/.../media/...'  // From response

  let currentVideoId = initialVideoId
  let currentVideoUrl = initialVideoUrl

  // Step 2: Extend video multiple times
  for (let i = 0; i < extensionPrompts.length; i++) {
    console.log(`\n🔄 Extension ${i + 1}/${extensionPrompts.length}...`)
    console.log('Prompt:', extensionPrompts[i])

    // Extend video
    const extendResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'extendVideo',
        params: {
          prompt: extensionPrompts[i],
          videoMediaId: currentVideoId,
          startFrame: 0,
          endFrame: 120,  // Full video
          aspectRatio
        }
      }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response.result)
        }
      })
    })

    // Poll for extended video
    const extendedVideoUrl = await pollVideoStatus(
      tabId,
      extendResponse.operations[0]
    )

    console.log(`✅ Extended video ${i + 1}:`, extendedVideoUrl)

    // Update current video for next extension
    currentVideoId = extendResponse.operations[0].media?.name || currentVideoId
    currentVideoUrl = extendedVideoUrl

    // Small delay between extensions
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  return currentVideoUrl
}

// Usage
const finalVideo = await extendVideoChain(
  'a person walking through a forest',
  [
    'they discover a hidden waterfall',
    'the waterfall leads to a secret cave',
    'inside the cave are glowing crystals'
  ],
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)

console.log('✅ Final extended video:', finalVideo)
```

---

## Workflow 4: Camera Motion Variations

Generate multiple versions of the same scene with different camera motions.

### Code

```typescript
async function generateCameraMotionVariations(
  videoMediaId: string,
  aspectRatio: string
) {
  const tabId = (await chrome.tabs.query({ active: true, currentWindow: true }))[0].id!

  const motionTypes = [
    'PAN_UP',
    'PAN_DOWN',
    'DOLLY_FORWARD',
    'DOLLY_BACKWARD',
    'ZOOM_IN',
    'ZOOM_OUT'
  ]

  const results = []

  for (const motionType of motionTypes) {
    console.log(`\n📹 Generating ${motionType} variation...`)

    // Apply camera motion
    const reshootResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'reshootVideo',
        params: {
          videoMediaId,
          motionType,
          aspectRatio
        }
      }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response.result)
        }
      })
    })

    // Poll for completion
    const videoUrl = await pollVideoStatus(
      tabId,
      reshootResponse.operations[0]
    )

    console.log(`✅ ${motionType}:`, videoUrl)

    results.push({
      motionType,
      url: videoUrl
    })

    // Delay between variations
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  return results
}

// Usage
const variations = await generateCameraMotionVariations(
  'projects/.../media/video123',
  'VIDEO_ASPECT_RATIO_LANDSCAPE'
)

console.log('\n✅ All variations generated:')
variations.forEach(v => {
  console.log(`${v.motionType}: ${v.url}`)
})
```

---

## Workflow 5: Complete Video Production Pipeline

End-to-end workflow: concept → images → video → extensions → variations

### Code

```typescript
class VideoProductionPipeline {
  private tabId: number | null = null

  async initialize() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    this.tabId = tabs[0].id!
  }

  async produceVideo(concept: {
    theme: string
    scenes: string[]
    cameraMotions: string[]
  }) {
    console.log('🎬 Starting video production pipeline...')
    console.log('Theme:', concept.theme)

    // Step 1: Generate concept images
    console.log('\n📸 Step 1: Generating concept images...')
    const images = await this.generateConceptImages(concept.scenes)
    console.log(`✅ Generated ${images.length} concept images`)

    // Step 2: Create base video from images
    console.log('\n🎬 Step 2: Creating base video...')
    const baseVideo = await this.createBaseVideo(
      images[0],
      images[images.length - 1],
      concept.theme
    )
    console.log('✅ Base video created:', baseVideo.url)

    // Step 3: Create camera motion variations
    console.log('\n📹 Step 3: Creating camera variations...')
    const variations = await this.createCameraVariations(
      baseVideo.mediaId,
      concept.cameraMotions
    )
    console.log(`✅ Created ${variations.length} variations`)

    // Step 4: Compile results
    const result = {
      theme: concept.theme,
      conceptImages: images,
      baseVideo: baseVideo.url,
      variations: variations.map(v => ({
        motion: v.motionType,
        url: v.url
      }))
    }

    console.log('\n✅ Production complete!')
    return result
  }

  private async generateConceptImages(scenes: string[]) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId!, {
        action: 'batchGenerateImages',
        params: {
          prompts: scenes,
          aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
        }
      }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response.result.media.map(m => ({
            mediaId: m.name,
            url: m.uri
          })))
        }
      })
    })
  }

  private async createBaseVideo(
    startImage: any,
    endImage: any,
    prompt: string
  ) {
    const genResponse = await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.tabId!, {
        action: 'generateVideoImages',
        params: {
          prompt,
          startImageId: startImage.mediaId,
          endImageId: endImage.mediaId,
          aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
        }
      }, (response) => {
        if (response?.error) {
          reject(new Error(response.error))
        } else {
          resolve(response.result)
        }
      })
    })

    const videoUrl = await pollVideoStatus(this.tabId!, genResponse.operations[0])

    return {
      mediaId: genResponse.operations[0].media?.name,
      url: videoUrl
    }
  }

  private async createCameraVariations(videoMediaId: string, motions: string[]) {
    const results = []

    for (const motionType of motions) {
      const reshootResponse = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(this.tabId!, {
          action: 'reshootVideo',
          params: {
            videoMediaId,
            motionType,
            aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
          }
        }, (response) => {
          if (response?.error) {
            reject(new Error(response.error))
          } else {
            resolve(response.result)
          }
        })
      })

      const videoUrl = await pollVideoStatus(this.tabId!, reshootResponse.operations[0])

      results.push({ motionType, url: videoUrl })

      // Delay between variations
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    return results
  }
}

// Usage
const pipeline = new VideoProductionPipeline()
await pipeline.initialize()

const production = await pipeline.produceVideo({
  theme: 'A journey through an enchanted forest',
  scenes: [
    'entrance to a mystical forest with glowing trees',
    'deep in the forest with magical creatures',
    'emerging from the forest into a bright clearing'
  ],
  cameraMotions: ['DOLLY_FORWARD', 'PAN_UP', 'ZOOM_IN']
})

console.log('Production results:', production)
```

---

## Best Practices

### 1. Always Implement Polling

```typescript
// ✅ Good: Poll for video completion
const genResponse = await generateVideo(prompt, aspectRatio)
const videoUrl = await pollUntilComplete(genResponse.operations[0])

// ❌ Bad: No polling (video not ready)
const genResponse = await generateVideo(prompt, aspectRatio)
console.log(genResponse.operations[0].media)  // undefined!
```

### 2. Add Delays Between Operations

```typescript
// Between video generations
await generateVideo(prompt1, aspectRatio)
await new Promise(resolve => setTimeout(resolve, 3000))  // 3s delay
await generateVideo(prompt2, aspectRatio)
```

### 3. Handle Timeouts Gracefully

```typescript
try {
  const videoUrl = await pollWithTimeout(operation, 600000)  // 10 min
} catch (error) {
  if (error.message === 'Timeout') {
    console.log('Video taking longer than expected, check Flow UI')
  }
}
```

### 4. Provide Progress Updates

```typescript
async function generateWithProgress(prompt, aspectRatio, onProgress) {
  onProgress('Starting generation...')

  const genResponse = await generateVideo(prompt, aspectRatio)

  onProgress('Polling for completion...')

  const videoUrl = await pollVideoStatus(genResponse.operations[0], (status) => {
    onProgress(`Status: ${status}`)
  })

  onProgress('Complete!')
  return videoUrl
}
```

---

## See Also

- [Video Generation API](../api-reference/video-generation.md) - Complete API reference
- [Image Generation API](../api-reference/image-generation.md) - Image generation for video inputs
- [Making API Calls](../guides/making-api-calls.md) - Basic usage guide
- [Batch Image Generation](./batch-image-generation.md) - Image generation examples
