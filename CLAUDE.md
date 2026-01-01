# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VAIA is a Chrome extension that bridges web applications with Chrome APIs and Google Flow (Generative AI platform). Built with React, TypeScript, Tailwind CSS, and Vite, it provides secure bi-directional communication through a three-layer message passing architecture.

## Development Commands

### Essential Commands
```bash
npm run dev          # Start Vite dev server with hot reload
npm run build        # Production build → dist/ folder (load this in Chrome)
npm run preview      # Preview production build locally
npm run type-check   # TypeScript type checking without emit
```

### Chrome Extension Development Workflow
1. `npm run build` - Build extension for Chrome
2. Open `chrome://extensions/` → Enable Developer Mode → Load unpacked → Select `dist/`
3. Test using `sample.html`, `google-genai-test.html`, or `test-media-history.html` demo pages
4. After code changes: rebuild and refresh extension or reload test page

## Architecture Overview

### Three-Layer Message Bridge System

**Layer 1: Injected Script** (`src/content-script/injected-script.ts`)
- Runs in page context with access to web page's DOM and JavaScript
- Exposes `window.__chromeExtensionBridge` API to web pages
- Methods: `call()` for Chrome APIs, `execute()` for Flow operations
- Handles async request/response matching with unique request IDs

**Layer 2: Content Script** (`src/content-script/index.ts`)
- Runs in isolated context with limited Chrome API access
- Routes messages between web pages and extension background worker
- Converts `window.postMessage` ↔ `chrome.runtime.sendMessage`
- Acts as secure middleware layer

**Layer 3: Background Worker** (`src/background-worker/index.ts`)
- Service worker with full Chrome API access
- Executes Chrome API calls and Flow API operations
- Returns results through content script back to web pages

### Message Flow
```
Web Page → Injected Script → Content Script → Background Worker → Chrome/Flow APIs
         ←                  ←                ←                  ←
```

### Request ID Pattern
All async operations use unique request IDs to prevent response mixing in concurrent operations:
```typescript
const generateRequestId = (): string =>
  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### Timeout Protection
- Chrome API calls: 5-second timeout
- Flow API operations: 30-second timeout
- Prevents hanging promises and memory leaks

## Code Architecture Patterns

### Entry Points & Build System
Vite handles 5 distinct entry points:
- `popup/popup.html` → React popup component
- `side-panel/side-panel.html` → React side panel component (wrapped with MediaProvider)
- `content-script/index.ts` → Content script (page injection)
- `background-worker/index.ts` → Service worker (Chrome API executor)
- `content-script/injected-script.ts` → Injected script (page context)

**Build Output** (after `npm run build`):
- ~1811 modules bundled
- side-panel.js: ~184KB (main UI bundle)
- dist/ folder ready for Chrome extension loading

### TypeScript Message Contracts
All communication uses strongly-typed interfaces in `src/shared/types.ts`:

**Chrome Extension Messages:**
- `APICallMessage` - Chrome API requests
- `ResponseMessage` - API responses
- `TabDataMessage` - Tab information

**Flow API Messages:**
- `FlowAPIMessage` - Flow API requests
- `FlowAPIResponse` - Flow API responses
- `FlowImageGenerateRequest` - Image generation parameters
- `FlowVideoGenerateRequest` - Video generation parameters
- `FlowImageUploadRequest` - Image upload parameters

**Media History Types:**
- `FlowMediaHistoryRequest` - Pagination parameters (pageSize, cursor)
- `FlowMediaHistoryResult` - Response with userWorkflows array
- `MediaWorkflow` - Workflow metadata (name, media, createTime)
- `MediaObject` - Media item structure with mediaGenerationId
- `MediaGenerationId` - Unique identifier (mediaType, workflowId, workflowStepId, mediaKey)
- `FlowMediaDetailRequest` - Request media details by ID
- `FlowMediaDetailResponse` - Detailed media info with fileUrl

### File Organization
```
src/
├── shared/           # Cross-layer TypeScript types and utilities
├── background-worker/ # Service worker (Chrome API executor)
├── content-script/   # Bridge scripts (content + injected)
├── contexts/         # React Context providers for global state
│   └── MediaContext.tsx  # Media state management
├── hooks/            # Custom React hooks
│   └── useMediaContext.ts # Hook for MediaContext access
├── side-panel/       # React side panel UI
├── popup/            # React popup UI
├── components/       # Shadcn UI components (flattened structure)
├── ui/               # Custom UI components
│   ├── Header.tsx
│   ├── TabLayout.tsx        # 4-tab navigation (Image, Video, Library, Activity)
│   ├── ImageGenerationForm.tsx
│   ├── VideoGenerationForm.tsx
│   ├── MediaLibrary.tsx     # Media browser with upload tracking
│   └── ActivityLog.tsx
├── services/         # Business logic and API services
│   ├── flowApi.ts           # Flow API communication
│   └── activityLogger.ts    # Activity logging
└── lib/              # Utility functions (cn helper, promptUtils)
```

## Services Architecture

**Separation of Concerns**: All API logic and business logic are isolated in `src/services/`, separate from UI components.

### Flow API Service (`src/services/flowApi.ts`)
Core API communication with Flow through Chrome messaging.

**Functions:**
- `testConnection()` - Check Flow connection status
- `generateImages(params)` - Generate images from prompts
- `generateVideo(params)` - Generate video from prompt/image
- `uploadImage(params)` - Upload image, returns mediaId
- `fetchMediaHistory(params)` - Fetch user's media history
- `fetchMediaDetails(params)` - Fetch detailed media information

**Singleton Class:**
- `FlowApiService.getInstance()` - Get singleton instance
- `flowApiService` - Exported singleton

**Type-Safe Interfaces:**
- `ConnectionStatus` - Connection state with auth info
- `ImageGenerationParams` - Image generation parameters
- `VideoGenerationParams` - Video generation parameters
- `ImageUploadParams` - Image upload parameters
- `MediaHistoryParams` - Pagination parameters
- `MediaDetailParams` - Media detail request

**Usage Pattern:**
```typescript
import { generateImages, uploadImage, fetchMediaHistory } from '@/services/flowApi';

// Generate images
const result = await generateImages({
  prompts: ['a beautiful landscape'],
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
  referenceImageIds: ['CAMa...'],
});

// Upload image
const mediaId = await uploadImage({
  imageData: base64String,
  mimeType: 'image/jpeg',
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
});

// Fetch media history
const history = await fetchMediaHistory({
  pageSize: 18,
  cursor: null,
});
```

### Activity Logger Service (`src/services/activityLogger.ts`)
Centralized activity logging with severity levels.

**Features:**
- Observable pattern with subscribe/unsubscribe
- Severity levels: info, success, warning, error
- Automatic timestamp generation
- History management (max 50 entries)

**Helper Methods:**
- `success(message)` - Log success message
- `info(message)` - Log info message
- `warning(message)` - Log warning message
- `error(message)` - Log error message

### Best Practices
- ✅ UI components only handle rendering and user interactions
- ✅ Services handle all API calls and business logic
- ✅ Never call `chrome.runtime.sendMessage` directly from components
- ✅ Use TypeScript types exported from services
- ✅ Services can be tested independently from UI

## React Context & State Management

### MediaContext (`src/contexts/MediaContext.tsx`)
Centralized state management for media library and upload tracking.

**State Structure:**
```typescript
interface MediaContextState {
  // Media library from Flow API
  mediaLibrary: MediaWorkflow[];
  isLoadingLibrary: boolean;
  libraryError: string | null;

  // File URL cache for media items
  fileUrlCache: Map<string, string>;

  // Uploaded images with status tracking
  uploadedImages: UploadedImage[];

  // Actions
  fetchMedia(pageSize?, cursor?): Promise<void>;
  uploadImageFile(file, aspectRatio?): Promise<string>;
  removeUploadedImage(index): void;
  clearUploads(): void;
  refreshLibrary(): Promise<void>;
  getFileUrl(mediaId): string | undefined;
}
```

**Upload Status Tracking:**
```typescript
interface UploadedImage {
  file: File;
  preview: string;  // Object URL for preview
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  mediaData?: ImageUploadResponse;  // API response storage
  mediaId?: string;  // For image-to-image generation
  error?: string;
  aspectRatio?: string;
}
```

**Upload Status Flow:**
- `pending` → File selected, not yet uploaded
- `uploading` → Upload in progress
- `uploaded` → Successfully uploaded, mediaId available
- `failed` → Upload failed with error message

**Usage Pattern:**
```typescript
import { MediaProvider } from '@/contexts/MediaContext';
import { useMediaContext } from '@/hooks/useMediaContext';

// Wrap root component
<MediaProvider>
  <SidePanel />
</MediaProvider>

// In child components
const {
  mediaLibrary,
  uploadImageFile,
  isLoadingLibrary,
  fileUrlCache,
} = useMediaContext();

// Upload with automatic status tracking
const mediaId = await uploadImageFile(file, 'IMAGE_ASPECT_RATIO_SQUARE');
```

**Key Features:**
- ✅ Automatic upload status tracking
- ✅ File URL lazy loading and caching
- ✅ Preview URL cleanup on unmount
- ✅ File-to-base64 conversion helper
- ✅ Singleton provider pattern

**Best Practices:**
- ✅ Always use `useMediaContext()` hook instead of direct Context.Consumer
- ✅ MediaProvider must wrap components needing media state
- ✅ Upload status automatically tracked in context
- ✅ File URL caching prevents redundant API calls

## React Component Conventions

- Functional components with hooks (useState, useEffect, useMediaContext)
- Tailwind CSS for styling (configured in tailwind.config.js)
- TypeScript interfaces for all props and state
- Activity logging with timestamp, message, and severity
- Context providers for shared state (MediaProvider)
- Custom hooks for context access (useMediaContext)
- Upload status badges (pending/uploading/uploaded/failed)

### Tab Layout
`TabLayout.tsx` provides 4-tab navigation:
1. **Image** - Image generation with prompts and reference images
2. **Video** - Video generation (text-to-video, image-to-video)
3. **Library** - Media library browser with upload tracking
4. **Activity** - Activity log with severity-based filtering

### Media Library Component
`MediaLibrary.tsx` displays user's media generation history from Flow.

**Features:**
- Grid layout with responsive design
- Upload status badges with visual indicators
- Cursor-based pagination (default: 18 items per page)
- File URL lazy loading with caching
- Error states with retry options
- Empty states with user-friendly messages

**Upload Status Badges:**
```
pending    → Gray badge, file selected
uploading  → Blue badge, upload in progress
uploaded   → Green badge, mediaId available
failed     → Red badge, error message shown
```

## Flow API Integration

### Authentication Context
Flow authentication is captured from the active Flow tab:
- OAuth bearer token from network requests
- Session ID from URL/localStorage
- Project ID from URL parameters

### Image Generation
```typescript
// Generate images with prompts
const result = await generateImages({
  prompts: ['prompt 1', 'prompt 2'],  // Max 4 prompts
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
  referenceImageIds: ['CAMa...'],  // Optional reference images
});
```

### Video Generation
```typescript
// Text-to-video
const result = await generateVideo({
  type: 'text-to-video',
  prompt: 'a flowing river',
  model: 'VEO_3_1',
});

// Image-to-video
const result = await generateVideo({
  type: 'image-to-video',
  prompt: 'zoom in slowly',
  model: 'VEO_3_1',
  startImage: base64ImageData,
});
```

### Image Upload
```typescript
// Upload image and get media ID
const mediaId = await uploadImage({
  imageData: base64String,  // With or without data URL prefix
  mimeType: 'image/jpeg',
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
});

// Use in image generation
await generateImages({
  prompts: ['enhance this image'],
  aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE',
  referenceImageIds: [mediaId],
});
```

### Media History
```typescript
// Fetch first page
const result = await fetchMediaHistory({
  pageSize: 18,
  cursor: null,
});

// Pagination with cursor
const nextPage = await fetchMediaHistory({
  pageSize: 18,
  cursor: result.userWorkflows[17].createTime,  // Use last item's createTime
});
```

**API Endpoint:**
- Flow tRPC: `/api/trpc/media.fetchUserHistoryDirectly`
- Request format: URL-encoded JSON parameter
- Response: Nested structure with `result.data.json.userWorkflows`

### Media Details
```typescript
// Fetch detailed media information
const details = await fetchMediaDetails({
  mediaId: 'CAMa...',
  tool: 'PINHOLE',
});

// Access file URL
const fileUrl = details.userUploadedImage?.fifeUrl;
```

## Manifest V3 Considerations

### Required Permissions
```json
{
  "permissions": ["activeTab", "scripting", "tabs", "sidePanel", "storage"],
  "host_permissions": ["<all_urls>", "https://labs.google/*"],
  "web_accessible_resources": [
    {"resources": ["injected-script.js"], "matches": ["<all_urls>"]}
  ]
}
```

### Service Worker Limitations
- No persistent background pages (use service worker pattern)
- Limited lifetime - design for frequent wake/sleep cycles
- Use `chrome.action.onClicked` and message passing for UI interactions

## Security Best Practices

### Message Validation
- All messages validated before processing
- No sensitive data exposed in error messages
- API calls isolated to background worker only

### API Key Handling
- Flow auth tokens captured from active Flow tab
- Only transmitted when needed for operations
- Never logged or persisted by extension

### Error Boundaries
- All Chrome API calls wrapped in try-catch
- Structured error responses with request IDs
- Timeout protection prevents resource leaks

## Testing Strategy

### Demo Pages
- `sample.html` - Basic Chrome API bridge testing
- `google-genai-test.html` - Flow integration testing
- `test-media-history.html` - Media history API testing

### Manual Testing Process
1. Build extension: `npm run build`
2. Load in Chrome: `chrome://extensions/` → Developer Mode → Load unpacked `dist/`
3. Open demo pages to test functionality
4. Check browser console and extension logs for errors
5. Test side panel activity logging and media library

### No Unit Testing Framework
Currently no Jest/Vitest setup. All testing is integration-based through demo HTML pages.

## Common Issues & Solutions

### "Bridge not available" on web pages
- Ensure extension loaded in `chrome://extensions/`
- Check that content script injection succeeded
- Verify `web_accessible_resources` in manifest
- Refresh the web page

### Side panel not opening
- Check if `sidePanel` permission is granted
- Ensure popup calls `chrome.sidePanel.open()` correctly
- Verify React components render without errors

### Flow operations failing
- Verify Flow tab is open and authenticated
- Check network connectivity and CORS policies
- Review timeout settings for large operations
- Ensure OAuth token is valid

### Upload tracking issues
- Check MediaContext is properly wrapped around components
- Verify useMediaContext hook is used correctly
- Check upload status transitions in console logs

### Build artifacts missing
- Run `npm run build` before loading extension
- Ensure all entry points compile successfully
- Check that custom Vite plugin copies manifest correctly

## Documentation References

### API Documentation
- `docs/api-reference/media-history.md` - Comprehensive media history API guide
- `docs/api-reference/image-generation.md` - Image generation API
- `docs/api-reference/video-generation.md` - Video generation API

### Specifications
- `.claude/specs/TASK_MEDIA_HISTORY_001.md` - Media history implementation spec

### Additional Resources
- `README.md` - Project overview and getting started
- `GOOGLE_GENAI_BRIDGE.md` - Flow integration details
- `IMPLEMENTATION.md` - Implementation notes