# Analytics API

## Overview

The Analytics API allows you to submit usage events to Flow's analytics system. This is useful for tracking extension usage, monitoring performance, and integrating with Flow's analytics pipeline.

## Endpoint

**URL**: `https://labs.google/fx/api/trpc/general.submitBatchLog`

**Method**: `POST`

**Content-Type**: `application/json`

---

## Request Structure

```typescript
interface SubmitBatchLogRequest {
  json: {
    appEvents: Array<{
      event: string                    // Event name
      eventMetadata: {
        sessionId: string              // User session ID
      }
      eventProperties: Array<{
        key: string                    // Property key
        stringValue?: string           // String value
        boolValue?: boolean            // Boolean value
        intValue?: number              // Integer value
      }>
      activeExperiments: string[]      // A/B test experiments
      eventTime: string                // ISO timestamp
    }>
  }
}
```

## Response

```typescript
interface SubmitBatchLogResponse {
  result: {
    data: {
      json: {
        success: boolean
      }
    }
  }
}
```

---

## Common Event Names

| Event Name | Description | When to Use |
|------------|-------------|-------------|
| `PINHOLE_GENERATE_IMAGE` | Image generation event | After successful image generation |
| `PINHOLE_GENERATE_VIDEO` | Video generation event | After video generation starts |
| `PINHOLE_UPLOAD_IMAGE` | Image upload event | After uploading reference image |
| `PINHOLE_EXTEND_VIDEO` | Video extension event | After video extension starts |
| `PINHOLE_RESHOOT_VIDEO` | Video reshoot event | After camera control applied |

---

## Standard Event Properties

These properties are automatically included by the extension:

```typescript
const standardProperties = [
  { key: 'TOOL_NAME', stringValue: 'PINHOLE' },
  { key: 'G1_PAYGATE_TIER', stringValue: 'PAYGATE_TIER_TWO' },
  { key: 'PINHOLE_PROMPT_BOX_MODE', stringValue: 'IMAGE_GENERATION' },
  { key: 'USER_AGENT', stringValue: navigator.userAgent },
  { key: 'IS_DESKTOP' }  // Boolean (no value = true)
]
```

---

## Extension API Usage

### Command: `submitBatchLog`

**Parameters**:
```typescript
{
  eventName: string                  // Event name (default: 'PINHOLE_GENERATE_IMAGE')
  eventProperties?: Record<string, string | boolean>  // Custom properties
}
```

### Example 1: Basic Event

```typescript
chrome.tabs.sendMessage(tabId, {
  action: 'submitBatchLog',
  params: {
    eventName: 'PINHOLE_GENERATE_IMAGE'
  }
}, (response) => {
  console.log('Event logged:', response.result)
})
```

### Example 2: Event with Custom Properties

```typescript
chrome.tabs.sendMessage(tabId, {
  action: 'submitBatchLog',
  params: {
    eventName: 'PINHOLE_GENERATE_IMAGE',
    eventProperties: {
      'PROMPT_LENGTH': '45',
      'ASPECT_RATIO': 'LANDSCAPE',
      'BATCH_SIZE': '4',
      'USED_REFERENCE_IMAGE': false
    }
  }
}, (response) => {
  console.log('Event with properties logged')
})
```

---

## Code Examples

### TypeScript Implementation (Injected Script)

```typescript
async function submitBatchLog(
  eventName: string,
  eventProperties?: Record<string, string | boolean>
): Promise<any> {
  const url = 'https://labs.google/fx/api/trpc/general.submitBatchLog'

  // Build event properties array
  const properties = [
    { key: 'TOOL_NAME', stringValue: 'PINHOLE' },
    { key: 'G1_PAYGATE_TIER', stringValue: 'PAYGATE_TIER_TWO' },
    { key: 'PINHOLE_PROMPT_BOX_MODE', stringValue: 'IMAGE_GENERATION' },
    { key: 'USER_AGENT', stringValue: navigator.userAgent },
    { key: 'IS_DESKTOP' },
  ]

  // Add custom properties
  if (eventProperties) {
    for (const [key, value] of Object.entries(eventProperties)) {
      if (typeof value === 'string') {
        properties.push({ key, stringValue: value })
      } else if (typeof value === 'boolean') {
        properties.push({ key, boolValue: value })
      }
    }
  }

  const payload = {
    json: {
      appEvents: [
        {
          event: eventName,
          eventMetadata: {
            sessionId: flowContext.sessionId || `;${Date.now()}`,
          },
          eventProperties: properties,
          activeExperiments: [],
          eventTime: new Date().toISOString(),
        },
      ],
    },
  }

  console.log('[Flowcio] 📊 Submitting batch log:', eventName)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
    mode: 'cors',
  })

  if (!response.ok) {
    throw new Error(`Failed to submit log: ${response.status}`)
  }

  const data = await response.json()
  console.log('[Flowcio] ✅ Batch log submitted')

  return data
}
```

### Complete Request Example

```json
{
  "json": {
    "appEvents": [
      {
        "event": "PINHOLE_GENERATE_IMAGE",
        "eventMetadata": {
          "sessionId": ";1766302095275"
        },
        "eventProperties": [
          { "key": "TOOL_NAME", "stringValue": "PINHOLE" },
          { "key": "G1_PAYGATE_TIER", "stringValue": "PAYGATE_TIER_TWO" },
          { "key": "PINHOLE_PROMPT_BOX_MODE", "stringValue": "IMAGE_GENERATION" },
          { "key": "USER_AGENT", "stringValue": "Mozilla/5.0..." },
          { "key": "IS_DESKTOP" },
          { "key": "PROMPT_LENGTH", "stringValue": "45" },
          { "key": "BATCH_SIZE", "stringValue": "4" },
          { "key": "USED_REFERENCE_IMAGE", "boolValue": false }
        ],
        "activeExperiments": [],
        "eventTime": "2024-12-21T10:30:15.123Z"
      }
    ]
  }
}
```

---

## Use Cases

### 1. Track Image Generations

```typescript
async function generateAndTrack(prompts: string[], aspectRatio: string) {
  // Generate images
  const result = await batchGenerateImages(prompts, aspectRatio)

  // Log event
  await submitBatchLog('PINHOLE_GENERATE_IMAGE', {
    'BATCH_SIZE': prompts.length.toString(),
    'ASPECT_RATIO': aspectRatio,
    'SUCCESS': true
  })

  return result
}
```

### 2. Track Performance Metrics

```typescript
async function generateWithMetrics(prompts: string[], aspectRatio: string) {
  const startTime = Date.now()

  try {
    const result = await batchGenerateImages(prompts, aspectRatio)
    const duration = Date.now() - startTime

    // Log success with timing
    await submitBatchLog('PINHOLE_GENERATE_IMAGE', {
      'DURATION_MS': duration.toString(),
      'SUCCESS': 'true',
      'IMAGE_COUNT': result.media.length.toString()
    })

    return result
  } catch (error: any) {
    const duration = Date.now() - startTime

    // Log failure
    await submitBatchLog('PINHOLE_GENERATE_IMAGE', {
      'DURATION_MS': duration.toString(),
      'SUCCESS': 'false',
      'ERROR_MESSAGE': error.message
    })

    throw error
  }
}
```

### 3. Track Feature Usage

```typescript
// Track which features users are using
async function trackFeatureUsage(feature: string, metadata: Record<string, any>) {
  await submitBatchLog(`EXTENSION_FEATURE_${feature.toUpperCase()}`, {
    'FEATURE_NAME': feature,
    ...metadata
  })
}

// Usage
await trackFeatureUsage('batch_generation', {
  'BATCH_SIZE': '4',
  'HAS_REFERENCE': 'true'
})

await trackFeatureUsage('video_extension', {
  'VIDEO_LENGTH': '4s',
  'EXTENSION_DIRECTION': 'forward'
})
```

---

## Analytics Helper Class

```typescript
class AnalyticsTracker {
  private enabled: boolean = true

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  async track(
    eventName: string,
    properties?: Record<string, string | boolean>
  ): Promise<void> {
    if (!this.enabled) {
      console.log('[Analytics] Tracking disabled, skipping event:', eventName)
      return
    }

    try {
      await submitBatchLog(eventName, properties)
      console.log('[Analytics] ✅ Tracked:', eventName)
    } catch (error) {
      console.error('[Analytics] ❌ Failed to track:', eventName, error)
      // Don't throw - analytics failures shouldn't break functionality
    }
  }

  async trackImageGeneration(
    promptCount: number,
    aspectRatio: string,
    success: boolean,
    duration: number
  ) {
    await this.track('PINHOLE_GENERATE_IMAGE', {
      'BATCH_SIZE': promptCount.toString(),
      'ASPECT_RATIO': aspectRatio,
      'SUCCESS': success.toString(),
      'DURATION_MS': duration.toString()
    })
  }

  async trackVideoGeneration(
    videoType: 'text' | 'images' | 'extend' | 'reshoot',
    aspectRatio: string,
    success: boolean
  ) {
    await this.track('PINHOLE_GENERATE_VIDEO', {
      'VIDEO_TYPE': videoType,
      'ASPECT_RATIO': aspectRatio,
      'SUCCESS': success.toString()
    })
  }

  async trackError(
    operation: string,
    errorMessage: string
  ) {
    await this.track('EXTENSION_ERROR', {
      'OPERATION': operation,
      'ERROR_MESSAGE': errorMessage
    })
  }
}

// Usage
const analytics = new AnalyticsTracker()

// Track image generation
await analytics.trackImageGeneration(4, 'LANDSCAPE', true, 25000)

// Track video generation
await analytics.trackVideoGeneration('text', 'PORTRAIT', true)

// Track errors
await analytics.trackError('batchGenerateImages', 'reCAPTCHA failed')
```

---

## Best Practices

### 1. Don't Block on Analytics

```typescript
// ✅ Good: Fire and forget
generateImages(prompts, aspectRatio).then(result => {
  submitBatchLog('PINHOLE_GENERATE_IMAGE').catch(() => {})  // Ignore errors
  return result
})

// ❌ Bad: Wait for analytics
const result = await generateImages(prompts, aspectRatio)
await submitBatchLog('PINHOLE_GENERATE_IMAGE')  // Blocks user
return result
```

### 2. Include Meaningful Properties

```typescript
// ✅ Good: Useful metrics
{
  'PROMPT_LENGTH': '45',
  'BATCH_SIZE': '4',
  'ASPECT_RATIO': 'LANDSCAPE',
  'USED_REFERENCE': 'true',
  'GENERATION_TIME_MS': '25000'
}

// ❌ Bad: Not useful
{
  'RANDOM_VALUE': '123',
  'TIMESTAMP': '2024-12-21'  // Already in eventTime
}
```

### 3. Handle Failures Gracefully

```typescript
async function trackSafely(eventName: string, properties: any) {
  try {
    await submitBatchLog(eventName, properties)
  } catch (error) {
    console.warn('Analytics failed (non-fatal):', error)
    // Continue - don't let analytics break the app
  }
}
```

### 4. Respect Privacy

```typescript
// ✅ Good: Don't include PII
{
  'PROMPT_LENGTH': '45',
  'HAS_WORDS': 'true'
}

// ❌ Bad: Includes user content
{
  'PROMPT_TEXT': 'Generate image of John Smith at 123 Main St'
}
```

---

## Debugging

### Check Event Submission

```typescript
// Enable verbose logging
const originalSubmit = submitBatchLog

submitBatchLog = async (eventName, properties) => {
  console.group('[Analytics Debug]')
  console.log('Event:', eventName)
  console.log('Properties:', properties)
  console.log('Timestamp:', new Date().toISOString())
  console.groupEnd()

  return originalSubmit(eventName, properties)
}
```

### Verify in Network Tab

1. Open DevTools → Network tab
2. Filter for `submitBatchLog`
3. Check request payload
4. Verify 200 OK response

---

## Error Handling

### Common Errors

**1. 400 Bad Request**
```json
{
  "error": {
    "message": "Invalid event structure"
  }
}
```

**Solution**: Check payload format matches spec

**2. CORS Error**
```
Access to fetch at '...' has been blocked by CORS policy
```

**Solution**: Ensure request is made from Flow page context (injected script)

**3. Network Error**
```
Failed to fetch
```

**Solution**: Check network connection, retry with backoff

---

## See Also

- [Image Generation API](./image-generation.md) - Generate images
- [Video Generation API](./video-generation.md) - Generate videos
- [Making API Calls](../guides/making-api-calls.md) - Getting started
