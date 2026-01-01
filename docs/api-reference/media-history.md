# Media History API

## Overview

The Media History API allows you to fetch user's uploaded and generated media assets from Google Flow platform. This endpoint retrieves paginated media objects with metadata including workflow IDs, aspect ratios, and creation timestamps.

## Endpoints

### 1. Fetch User History

Retrieve user's media history (uploaded images and generated assets) with pagination support.

**Endpoint**: `/api/trpc/media.fetchUserHistoryDirectly`

**Method**: `GET` (tRPC query)

**Base URL**: `https://labs.google/fx`

**Request Parameters**:

The parameters are passed as URL-encoded JSON in the `input` query parameter:

```typescript
interface FetchUserHistoryInput {
  json: {
    type: 'ASSET_MANAGER'           // Media type filter
    pageSize: number                // Number of items per page (default: 18)
    responseScope: string           // Scope filter (usually 'RESPONSE_SCOPE_UNSPECIFIED')
    cursor: string | null           // Pagination cursor (null for first page)
  }
  meta: {
    values: {
      cursor: ['undefined']         // Metadata for cursor handling
    }
  }
}
```

**Response Structure**:
```typescript
interface FetchUserHistoryResponse {
  result: {
    data: {
      json: {
        result: {
          userWorkflows: Array<{
            name: string                    // Base64-encoded workflow identifier
            media: {
              name: string                  // Media identifier (same as workflow name)
              userUploadedImage: {
                aspectRatio: string         // Image aspect ratio constant
              }
              mediaGenerationId: {
                mediaType: 'IMAGE'          // Media type
                workflowId: string          // UUID of workflow
                workflowStepId: string      // Workflow step ID
                mediaKey: string            // UUID of media asset
              }
            }
            createTime: string              // ISO 8601 timestamp
          }>
        }
        status: number                      // HTTP status code
        statusText: string                  // HTTP status text
      }
    }
  }
}
```

---

## Request Examples

### cURL Example

```bash
curl 'https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=%7B%22json%22%3A%7B%22type%22%3A%22ASSET_MANAGER%22%2C%22pageSize%22%3A18%2C%22responseScope%22%3A%22RESPONSE_SCOPE_UNSPECIFIED%22%2C%22cursor%22%3Anull%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22cursor%22%3A%5B%22undefined%22%5D%7D%7D%7D' \
  -H 'accept: */*' \
  -H 'content-type: application/json' \
  -b 'session-cookie-here'
```

### Decoded URL Parameters

```json
{
  "json": {
    "type": "ASSET_MANAGER",
    "pageSize": 18,
    "responseScope": "RESPONSE_SCOPE_UNSPECIFIED",
    "cursor": null
  },
  "meta": {
    "values": {
      "cursor": ["undefined"]
    }
  }
}
```

### JavaScript Fetch Example

```typescript
async function fetchUserMediaHistory(
  pageSize: number = 18,
  cursor: string | null = null
): Promise<FetchUserHistoryResponse> {
  const input = {
    json: {
      type: 'ASSET_MANAGER',
      pageSize,
      responseScope: 'RESPONSE_SCOPE_UNSPECIFIED',
      cursor
    },
    meta: {
      values: {
        cursor: ['undefined']
      }
    }
  }

  const encodedInput = encodeURIComponent(JSON.stringify(input))
  const url = `https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=${encodedInput}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'content-type': 'application/json'
    },
    credentials: 'include'  // Include cookies for authentication
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch media history: ${response.statusText}`)
  }

  return await response.json()
}
```

---

## Response Examples

### Success Response

```json
{
  "result": {
    "data": {
      "json": {
        "result": {
          "userWorkflows": [
            {
              "name": "CAMaJGRlY2IzMDc3LTJlM2YtNDQxZC04YWM0LTU3NzA1ODQwOTVmZSIDQ0FFKiQ4NDFlYzViZS01ZTNmLTRjYjMtYWNjMC1jZjc3MDQ1NzY5N2M",
              "media": {
                "name": "CAMaJGRlY2IzMDc3LTJlM2YtNDQxZC04YWM0LTU3NzA1ODQwOTVmZSIDQ0FFKiQ4NDFlYzViZS01ZTNmLTRjYjMtYWNjMC1jZjc3MDQ1NzY5N2M",
                "userUploadedImage": {
                  "aspectRatio": "IMAGE_ASPECT_RATIO_PORTRAIT"
                },
                "mediaGenerationId": {
                  "mediaType": "IMAGE",
                  "workflowId": "decb3077-2e3f-441d-8ac4-5770584095fe",
                  "workflowStepId": "CAE",
                  "mediaKey": "841ec5be-5e3f-4cb3-acc0-cf770457697c"
                }
              },
              "createTime": "2025-12-26T17:46:23.596639Z"
            },
            {
              "name": "CAMaJGRiY2JlYTc3LWRkNTktNDY2Yy1hMzMwLWE3ODc2Y2UyZmI3MyIDQ0FFKiQxMWMwNzRmMy1hNjM1LTQzMmMtYWQ5Ny04YjliMzIwNmM5ODA",
              "media": {
                "name": "CAMaJGRiY2JlYTc3LWRkNTktNDY2Yy1hMzMwLWE3ODc2Y2UyZmI3MyIDQ0FFKiQxMWMwNzRmMy1hNjM1LTQzMmMtYWQ5Ny04YjliMzIwNmM5ODA",
                "userUploadedImage": {
                  "aspectRatio": "IMAGE_ASPECT_RATIO_SQUARE"
                },
                "mediaGenerationId": {
                  "mediaType": "IMAGE",
                  "workflowId": "dbcbea77-dd59-466c-a330-a7876ce2fb73",
                  "workflowStepId": "CAE",
                  "mediaKey": "11c074f3-a635-432c-ad97-8b9b3206c980"
                }
              },
              "createTime": "2025-12-26T16:43:53.704063Z"
            }
          ]
        },
        "status": 200,
        "statusText": "OK"
      }
    }
  }
}
```

---

## Extension API Usage

### Command: `fetchMediaHistory`

Add this command to your Chrome extension to fetch user's media history.

**Implementation in Background Worker**:

```typescript
// background-worker/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchMediaHistory') {
    const { pageSize, cursor } = message.params

    fetchMediaHistory(pageSize, cursor)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }))

    return true  // Keep channel open for async response
  }
})

async function fetchMediaHistory(
  pageSize: number = 18,
  cursor: string | null = null
) {
  const input = {
    json: {
      type: 'ASSET_MANAGER',
      pageSize,
      responseScope: 'RESPONSE_SCOPE_UNSPECIFIED',
      cursor
    },
    meta: {
      values: {
        cursor: ['undefined']
      }
    }
  }

  const encodedInput = encodeURIComponent(JSON.stringify(input))
  const url = `https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=${encodedInput}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': '*/*',
      'content-type': 'application/json'
    },
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return await response.json()
}
```

**Usage from Popup/Content Script**:

```typescript
// Example 1: Fetch first page
chrome.runtime.sendMessage(
  {
    action: 'fetchMediaHistory',
    params: {
      pageSize: 18,
      cursor: null
    }
  },
  (response) => {
    if (response.success) {
      const workflows = response.result.result.data.json.result.userWorkflows
      console.log(`Loaded ${workflows.length} media items`)
      workflows.forEach(workflow => {
        console.log(`- ${workflow.media.mediaGenerationId.workflowId}`)
        console.log(`  Aspect ratio: ${workflow.media.userUploadedImage.aspectRatio}`)
        console.log(`  Created: ${workflow.createTime}`)
      })
    } else {
      console.error('Failed to fetch media:', response.error)
    }
  }
)

// Example 2: Pagination
let currentCursor = null

function loadNextPage() {
  chrome.runtime.sendMessage(
    {
      action: 'fetchMediaHistory',
      params: {
        pageSize: 18,
        cursor: currentCursor
      }
    },
    (response) => {
      if (response.success) {
        const workflows = response.result.result.data.json.result.userWorkflows

        // Update cursor for next page (if API provides it)
        // currentCursor = response.result.nextCursor

        // Process workflows...
        displayMediaItems(workflows)
      }
    }
  )
}
```

---

## Media Object Structure

### Workflow Object

Each media item is represented as a workflow object:

```typescript
interface UserWorkflow {
  name: string                      // Base64-encoded identifier
  media: MediaObject
  createTime: string                // ISO 8601 timestamp
}
```

### Media Object

```typescript
interface MediaObject {
  name: string                      // Same as workflow name
  userUploadedImage: {
    aspectRatio: AspectRatio        // Image dimensions
  }
  mediaGenerationId: {
    mediaType: 'IMAGE'              // Type of media
    workflowId: string              // UUID - unique workflow identifier
    workflowStepId: string          // Step identifier (usually 'CAE')
    mediaKey: string                // UUID - unique media asset key
  }
}
```

### Aspect Ratios

Media objects use the same aspect ratio constants as image generation:

| Constant | Ratio | Typical Use |
|----------|-------|-------------|
| `IMAGE_ASPECT_RATIO_SQUARE` | 1:1 | Square images |
| `IMAGE_ASPECT_RATIO_LANDSCAPE` | 16:9 | Landscape images |
| `IMAGE_ASPECT_RATIO_PORTRAIT` | 9:16 | Portrait images |
| `IMAGE_ASPECT_RATIO_ULTRA_WIDE` | 21:9 | Ultra-wide images |
| `IMAGE_ASPECT_RATIO_4_3` | 4:3 | Classic 4:3 |
| `IMAGE_ASPECT_RATIO_3_2` | 3:2 | Photography standard |

---

## Constructing Media URLs

To display media from the history, you need to construct the media URL from the workflow data:

```typescript
function getMediaUrl(workflow: UserWorkflow, projectId: string): string {
  const { workflowId, mediaKey } = workflow.media.mediaGenerationId

  // Method 1: Direct media endpoint (if available)
  return `https://labs.google/fx/api/v1/projects/${projectId}/media/${mediaKey}`

  // Method 2: Via workflow endpoint
  // return `https://labs.google/fx/api/v1/workflows/${workflowId}/media/${mediaKey}`
}

// Usage
const workflows = response.result.data.json.result.userWorkflows
const projectId = 'your-project-id'

workflows.forEach(workflow => {
  const mediaUrl = getMediaUrl(workflow, projectId)
  console.log(`Media URL: ${mediaUrl}`)

  // Display in UI
  const img = document.createElement('img')
  img.src = mediaUrl
  document.body.appendChild(img)
})
```

---

## Pagination

### First Page Request

```typescript
const firstPage = await fetchMediaHistory(18, null)
```

### Subsequent Pages

If the API provides a cursor in the response (check for `nextCursor` or similar field):

```typescript
// Note: The current response structure doesn't show nextCursor
// You may need to check the actual API behavior
const nextPage = await fetchMediaHistory(18, nextCursor)
```

### Infinite Scroll Implementation

```typescript
class MediaHistoryLoader {
  private cursor: string | null = null
  private loading: boolean = false
  private hasMore: boolean = true

  async loadMore(pageSize: number = 18): Promise<UserWorkflow[]> {
    if (this.loading || !this.hasMore) {
      return []
    }

    this.loading = true

    try {
      const response = await fetchMediaHistory(pageSize, this.cursor)
      const workflows = response.result.data.json.result.userWorkflows

      // Update cursor if provided in response
      // this.cursor = response.nextCursor || null

      // Check if we got fewer items than requested (end of data)
      if (workflows.length < pageSize) {
        this.hasMore = false
      }

      return workflows
    } finally {
      this.loading = false
    }
  }

  reset() {
    this.cursor = null
    this.hasMore = true
  }
}

// Usage
const loader = new MediaHistoryLoader()

async function loadNextBatch() {
  const workflows = await loader.loadMore(18)
  workflows.forEach(workflow => {
    // Display workflow...
  })
}
```

---

## Filtering and Sorting

### Filter by Aspect Ratio

```typescript
function filterByAspectRatio(
  workflows: UserWorkflow[],
  aspectRatio: string
): UserWorkflow[] {
  return workflows.filter(
    workflow => workflow.media.userUploadedImage.aspectRatio === aspectRatio
  )
}

// Usage
const squareImages = filterByAspectRatio(workflows, 'IMAGE_ASPECT_RATIO_SQUARE')
const portraitImages = filterByAspectRatio(workflows, 'IMAGE_ASPECT_RATIO_PORTRAIT')
```

### Sort by Creation Time

```typescript
function sortByCreateTime(
  workflows: UserWorkflow[],
  order: 'asc' | 'desc' = 'desc'
): UserWorkflow[] {
  return workflows.sort((a, b) => {
    const timeA = new Date(a.createTime).getTime()
    const timeB = new Date(b.createTime).getTime()
    return order === 'desc' ? timeB - timeA : timeA - timeB
  })
}

// Usage
const newestFirst = sortByCreateTime(workflows, 'desc')
const oldestFirst = sortByCreateTime(workflows, 'asc')
```

---

## Error Handling

### Common Errors

**401 Unauthorized - Not Authenticated**
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```

**Solution**: Ensure user is logged into Google Flow. Credentials are handled via cookies.

**403 Forbidden - Permission Denied**
```json
{
  "error": {
    "code": 403,
    "message": "Permission denied",
    "status": "PERMISSION_DENIED"
  }
}
```

**Solution**: User may not have access to requested resources.

**500 Internal Server Error**
```json
{
  "error": {
    "code": 500,
    "message": "Internal server error",
    "status": "INTERNAL"
  }
}
```

**Solution**: Retry request after a delay.

### Error Handling Implementation

```typescript
async function fetchMediaHistoryWithRetry(
  pageSize: number = 18,
  cursor: string | null = null,
  maxRetries: number = 3
): Promise<FetchUserHistoryResponse> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchMediaHistory(pageSize, cursor)
    } catch (error: any) {
      lastError = error
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message)

      if (error.message.includes('401')) {
        // Auth error - don't retry
        throw new Error('Authentication required. Please log into Google Flow.')
      }

      if (error.message.includes('403')) {
        // Permission error - don't retry
        throw new Error('Permission denied. Check your account access.')
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Failed to fetch media history')
}
```

---

## TypeScript Types

Complete type definitions for use in your project:

```typescript
// Request types
export interface FetchUserHistoryInput {
  json: {
    type: 'ASSET_MANAGER'
    pageSize: number
    responseScope: string
    cursor: string | null
  }
  meta: {
    values: {
      cursor: string[]
    }
  }
}

// Response types
export interface UserWorkflow {
  name: string
  media: MediaObject
  createTime: string
}

export interface MediaObject {
  name: string
  userUploadedImage: {
    aspectRatio: string
  }
  mediaGenerationId: MediaGenerationId
}

export interface MediaGenerationId {
  mediaType: 'IMAGE'
  workflowId: string
  workflowStepId: string
  mediaKey: string
}

export interface FetchUserHistoryResult {
  userWorkflows: UserWorkflow[]
}

export interface FetchUserHistoryResponse {
  result: {
    data: {
      json: {
        result: FetchUserHistoryResult
        status: number
        statusText: string
      }
    }
  }
}
```

---

## Best Practices

### 1. Caching

Cache media history to reduce API calls:

```typescript
class MediaHistoryCache {
  private cache: Map<string, UserWorkflow[]> = new Map()
  private ttl: number = 5 * 60 * 1000  // 5 minutes

  async get(
    pageSize: number,
    cursor: string | null
  ): Promise<UserWorkflow[] | null> {
    const key = `${pageSize}-${cursor}`
    const cached = this.cache.get(key)

    if (cached) {
      return cached
    }

    return null
  }

  set(
    pageSize: number,
    cursor: string | null,
    workflows: UserWorkflow[]
  ): void {
    const key = `${pageSize}-${cursor}`
    this.cache.set(key, workflows)

    // Auto-clear after TTL
    setTimeout(() => this.cache.delete(key), this.ttl)
  }

  clear(): void {
    this.cache.clear()
  }
}
```

### 2. Lazy Loading

Load media URLs only when needed:

```typescript
async function loadMediaUrl(workflow: UserWorkflow): Promise<string> {
  const { mediaKey } = workflow.media.mediaGenerationId

  // Construct and verify URL
  const url = `https://labs.google/fx/media/${mediaKey}`

  // Optional: Verify image is accessible
  const response = await fetch(url, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(`Media not accessible: ${url}`)
  }

  return url
}
```

### 3. Progress Tracking

```typescript
async function loadAllMedia(
  onProgress: (loaded: number, total: number) => void
): Promise<UserWorkflow[]> {
  const pageSize = 18
  const allWorkflows: UserWorkflow[] = []
  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    const response = await fetchMediaHistory(pageSize, cursor)
    const workflows = response.result.data.json.result.userWorkflows

    allWorkflows.push(...workflows)
    onProgress(allWorkflows.length, -1)  // -1 = unknown total

    if (workflows.length < pageSize) {
      hasMore = false
    }

    // Update cursor if provided
    // cursor = response.nextCursor
  }

  return allWorkflows
}

// Usage
await loadAllMedia((loaded, total) => {
  console.log(`Loaded ${loaded} media items...`)
})
```

---

## See Also

- [Image Generation API](./image-generation.md) - Generate images
- [Video Generation API](./video-generation.md) - Generate videos
- [Analytics API](./analytics.md) - Track usage