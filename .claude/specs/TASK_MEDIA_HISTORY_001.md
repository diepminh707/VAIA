# TASK_MEDIA_HISTORY_001: Add Media History API Support

**Created**: 2025-12-30
**Status**: ✅ Completed
**Actual Time**: ~90 minutes (including MediaContext implementation)

## Objective

Add support for fetching user's media history from Google Flow platform's tRPC endpoint `media.fetchUserHistoryDirectly`. This will enable the VAIA extension to display previously uploaded/generated images in the side panel for selection and reuse.

---

## Background

### Current State
- Extension supports generating images, uploading images, and generating videos
- No way to access previously uploaded/generated media
- Users must re-upload images if they want to reuse them

### Desired State
- Extension can fetch paginated media history from Flow
- Side panel can display media library
- Users can select from existing media for image-to-image generation

### API Endpoint
```
GET https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly
```

This is a tRPC endpoint that requires URL-encoded JSON input parameter.

---

## Architecture Analysis

### Message Flow
```
Side Panel → Background Worker → Content Script → Injected Script → tRPC API
    ↓                ↓                  ↓                 ↓              ↓
1. Request     2. Find Flow Tab   3. Forward       4. Execute     5. GET request
flow_api_call                     to content       fetch()        with cookies
    ↑                ↑                  ↑                 ↑              ↑
6. Response    5. Forward         4. Forward       3. Parse       2. JSON response
```

### Existing Patterns
The extension already supports similar Flow API calls:
- `generate_image`: Calls `/v1/projects/{id}/flowMedia:batchGenerateImages`
- `upload_image`: Calls `/v1:uploadUserImage`
- `generate_video`: Calls `/v1/video:batchAsyncGenerateVideoText`

**Key Pattern**: All commands:
1. Are handled in `injected-script.ts` via `flowExtensionCommand` event listener
2. Use `updateFlowAuthContext()` to get session/project info
3. Call Flow API with `credentials: 'include'` for cookie-based auth
4. Return results via `flowExtensionResponse` event

---

## Technical Specification

### 1. Type Definitions (`src/shared/types.ts`)

#### Add to FlowAPIMessage command enum:
```typescript
export interface FlowAPIMessage extends ExtensionMessage {
  type: 'flow_api_call';
  payload: {
    command:
      | 'generate_image'
      | 'generate_video'
      | 'upload_image'
      | 'get_auth_status'
      | 'fetch_media_history';  // ← NEW
    data:
      | FlowImageGenerateRequest
      | FlowVideoGenerateRequest
      | FlowImageUploadRequest
      | FlowMediaHistoryRequest   // ← NEW
      | null;
  };
}
```

#### New Request Interface:
```typescript
export interface FlowMediaHistoryRequest {
  pageSize?: number;        // Default: 18 (Flow's default)
  cursor?: string | null;   // Pagination cursor, null for first page
}
```

#### New Response Interfaces:
```typescript
export interface MediaGenerationId {
  mediaType: 'IMAGE';
  workflowId: string;       // UUID
  workflowStepId: string;   // Usually 'CAE'
  mediaKey: string;         // UUID - unique media identifier
}

export interface MediaObject {
  name: string;             // Base64-encoded workflow name
  userUploadedImage: {
    aspectRatio: string;    // IMAGE_ASPECT_RATIO_*
  };
  mediaGenerationId: MediaGenerationId;
}

export interface MediaWorkflow {
  name: string;             // Base64-encoded identifier
  media: MediaObject;
  createTime: string;       // ISO 8601 timestamp
}

export interface FlowMediaHistoryResult {
  userWorkflows: MediaWorkflow[];
  status: number;           // HTTP status (200 = success)
  statusText: string;       // 'OK'
}
```

---

### 2. Injected Script Implementation (`src/content-script/injected-script.ts`)

#### Add fetchMediaHistory() function (after uploadImage):

```typescript
// Media History API
async function fetchMediaHistory(
  pageSize: number = 18,
  cursor: string | null = null
): Promise<FlowMediaHistoryResult> {
  console.log('[VAIA] 📚 Fetching media history...', { pageSize, cursor });

  // Build tRPC input according to Flow's format
  const input = {
    json: {
      type: 'ASSET_MANAGER',
      pageSize,
      responseScope: 'RESPONSE_SCOPE_UNSPECIFIED',
      cursor
    },
    meta: {
      values: {
        cursor: ['undefined']  // Flow expects this format
      }
    }
  };

  // Encode input for URL
  const encodedInput = encodeURIComponent(JSON.stringify(input));
  const url = `https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=${encodedInput}`;

  console.log('[VAIA] 📤 Calling tRPC endpoint');

  try {
    // Call tRPC endpoint
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json'
      },
      credentials: 'include'  // ✅ Include session cookies for auth
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[VAIA] 📥 Received media history response');

    // Extract workflows from deeply nested structure
    const result = data?.result?.data?.json?.result;

    if (!result || !result.userWorkflows) {
      throw new Error('Invalid response structure from media history API');
    }

    return {
      userWorkflows: result.userWorkflows,
      status: data.result?.data?.json?.status || 200,
      statusText: data.result?.data?.json?.statusText || 'OK'
    };
  } catch (error) {
    console.error('[VAIA] ❌ Failed to fetch media history:', error);
    throw error;
  }
}
```

#### Add command handler (in flowExtensionCommand listener switch):

Add this case after the `upload_image` case (around line 750):

```typescript
case 'fetch_media_history':
  const { pageSize = 18, cursor = null } = data as FlowMediaHistoryRequest || {};
  result = await fetchMediaHistory(pageSize, cursor);
  authContext = getFlowAuthStatus();
  break;
```

---

## Implementation Steps

### Step 1: Update Types
**File**: `src/shared/types.ts`
**Location**: After `FlowImageUploadRequest` interface (around line 78)

1. Add `fetch_media_history` to command union type
2. Add `FlowMediaHistoryRequest` to data union type
3. Add new interfaces: `MediaGenerationId`, `MediaObject`, `MediaWorkflow`, `FlowMediaHistoryResult`

### Step 2: Implement fetchMediaHistory()
**File**: `src/content-script/injected-script.ts`
**Location**: After `uploadImage()` function (around line 424)

1. Add `fetchMediaHistory()` function
2. Implement tRPC URL building with proper encoding
3. Add error handling for HTTP errors
4. Extract data from nested response structure

### Step 3: Add Command Handler
**File**: `src/content-script/injected-script.ts`
**Location**: In `flowExtensionCommand` listener switch (around line 750)

1. Add `case 'fetch_media_history':`
2. Extract pageSize and cursor from data
3. Call `fetchMediaHistory()`
4. Set authContext for response

---

## API Request/Response Examples

### Request (URL-encoded):
```
GET https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=%7B%22json%22%3A%7B%22type%22%3A%22ASSET_MANAGER%22%2C%22pageSize%22%3A18%2C%22responseScope%22%3A%22RESPONSE_SCOPE_UNSPECIFIED%22%2C%22cursor%22%3Anull%7D%2C%22meta%22%3A%7B%22values%22%3A%7B%22cursor%22%3A%5B%22undefined%22%5D%7D%7D%7D
```

### Decoded Input:
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

### Response Structure:
```json
{
  "result": {
    "data": {
      "json": {
        "result": {
          "userWorkflows": [
            {
              "name": "CAMaJGRlY2IzMDc3...",
              "media": {
                "name": "CAMaJGRlY2IzMDc3...",
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

## Usage Example (from Side Panel)

```typescript
// side-panel/SidePanel.tsx

async function loadMediaHistory() {
  try {
    const response = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'flow_api_call',
          payload: {
            command: 'fetch_media_history',
            data: {
              pageSize: 18,
              cursor: null
            }
          }
        },
        (response) => {
          if (response.payload.success) {
            resolve(response.payload.result);
          } else {
            reject(new Error(response.payload.error));
          }
        }
      );
    });

    const { userWorkflows } = response;
    console.log(`Loaded ${userWorkflows.length} media items`);

    // Display media in UI
    userWorkflows.forEach(workflow => {
      const mediaKey = workflow.media.mediaGenerationId.mediaKey;
      const aspectRatio = workflow.media.userUploadedImage.aspectRatio;
      console.log(`- Media: ${mediaKey}, Aspect: ${aspectRatio}`);
    });
  } catch (error) {
    console.error('Failed to load media:', error);
  }
}
```

---

## Error Handling

### Expected Errors

**401 Unauthorized**
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```
**Solution**: User needs to log into Flow. Extension relies on session cookies.

**403 Forbidden**
```json
{
  "error": {
    "code": 403,
    "message": "Permission denied",
    "status": "PERMISSION_DENIED"
  }
}
```
**Solution**: User may not have access. Check if logged into correct account.

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
**Solution**: Retry after delay. Likely temporary server issue.

### Error Handling in Code:
```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  // ... process response
} catch (error) {
  console.error('[VAIA] ❌ Failed to fetch media history:', error);
  throw error;  // Re-throw to be caught by command handler
}
```

---

## Testing Plan

### Test Case 1: Basic Fetch
```typescript
// Test fetching first page of media
chrome.runtime.sendMessage({
  type: 'flow_api_call',
  payload: {
    command: 'fetch_media_history',
    data: { pageSize: 18, cursor: null }
  }
}, (response) => {
  console.log('Test 1:', response);
  // Expected: Array of workflows
});
```

### Test Case 2: Custom Page Size
```typescript
// Test with smaller page size
chrome.runtime.sendMessage({
  type: 'flow_api_call',
  payload: {
    command: 'fetch_media_history',
    data: { pageSize: 6, cursor: null }
  }
}, (response) => {
  console.log('Test 2:', response);
  // Expected: Max 6 workflows
});
```

### Test Case 3: No Flow Tab
```typescript
// Test without Flow tab open
// Expected: Error message "Flow tab not found"
```

### Test Case 4: Not Logged In
```typescript
// Test on Flow page but not logged in
// Expected: 401 error from API
```

---

## Pagination Strategy

### First Page:
```typescript
{
  pageSize: 18,
  cursor: null
}
```

### Subsequent Pages:
Note: Current API response doesn't show `nextCursor` field. Need to verify if:
1. API returns cursor in response (check actual response structure)
2. Or need to track manually (e.g., last workflow name as cursor)

**Action Required**: Test with real API to confirm pagination mechanism.

---

## Security Considerations

### 1. Authentication
- Uses session cookies via `credentials: 'include'`
- No OAuth token required (cookies handle auth)
- Runs in Flow page context (same origin)

### 2. CORS
- ✅ **No CORS issues** - injected script runs in Flow page context
- Same origin as API endpoint
- Can make requests directly

### 3. Data Privacy
- Media data belongs to authenticated user
- Only accessible when user is logged into Flow
- Extension has no persistent storage of media data

---

## Completion Checklist

- [x] Types updated in `src/shared/types.ts`
- [x] `fetchMediaHistory()` function added to `injected-script.ts`
- [x] Command handler added to `flowExtensionCommand` listener
- [x] Build successful (`npm run build`)
- [x] FlowAPI service integration (`src/services/flowApi.ts`)
- [x] MediaContext implementation with upload tracking
- [x] MediaLibrary component created
- [x] MediaLibrary tab added to SidePanel
- [ ] Test: Fetch first page of media (requires user testing)
- [ ] Test: Fetch with custom page size (requires user testing)
- [ ] Test: Error handling (no Flow tab) (requires user testing)
- [ ] Test: Display media in side panel (requires user testing)
- [x] Documentation updated

---

## Future Enhancements

### Phase 2 (Optional):
1. **Constructing Media URLs**: Add helper to build media display URLs from `mediaKey`
2. **Filtering**: Add filter by aspect ratio
3. **Sorting**: Add sort by creation time
4. **Infinite Scroll**: Implement cursor-based pagination in UI
5. **Caching**: Cache media list to reduce API calls
6. **Thumbnails**: Display media thumbnails in side panel

---

## References

- **API Documentation**: `/docs/api-reference/media-history.md`
- **Type Definitions**: `/src/shared/types.ts`
- **Injected Script**: `/src/content-script/injected-script.ts`
- **Background Worker**: `/src/background-worker/index.ts`

---

## Change Log

### 2025-12-30 - Initial Spec Created
- Analyzed existing architecture
- Documented tRPC endpoint structure
- Created implementation plan
- Defined type definitions
- Documented error handling strategy

---

## Notes

1. **tRPC Format**: This is a tRPC procedure, not REST API. Input must be JSON.stringify + encodeURIComponent
2. **Response Nesting**: Response is deeply nested (`result.data.json.result.userWorkflows`)
3. **Pagination**: Need to verify if API returns `nextCursor` or uses name-based pagination
4. **Cookies Critical**: Session cookies are required. Extension must have `cookies` permission if reading cookies directly.

---

## Implementation Summary (2025-12-30)

### ✅ Core API Implementation (Lines 80-118 in types.ts, Lines 426-493 in injected-script.ts)

**Type Definitions Added:**
- `FlowMediaHistoryRequest` - Request parameters (pageSize, cursor)
- `MediaGenerationId` - Unique media identifier structure
- `MediaObject` - Media metadata with aspect ratio
- `MediaWorkflow` - Workflow containing media and timestamp
- `FlowMediaHistoryResult` - API response with workflows array

**Injected Script (`src/content-script/injected-script.ts`):**
- Added `fetchMediaHistory()` function (lines 426-493)
- Builds tRPC URL with proper JSON encoding
- Calls endpoint with `credentials: 'include'` for session auth
- Extracts data from nested response structure (`result.data.json.result`)
- Added command handler case `fetch_media_history` (lines 822-826)

### ✅ Service Layer Integration (`src/services/flowApi.ts`)

**Added:**
- `MediaHistoryParams` interface - Service-level request type
- `MediaWorkflow` interface - Service-level workflow type
- `MediaHistoryResult` interface - Service-level response type
- `fetchMediaHistory()` function - Async service method
- `FlowApiService.fetchMediaHistory()` - Singleton instance method

**Pattern**: Maintains consistency with existing service methods (`generateImages`, `uploadImage`, etc.)

### ✅ React Context Implementation

**Created `/src/contexts/MediaContext.tsx`:**
- **UploadedImage Interface** with upload state tracking:
  - `uploadStatus`: 'pending' | 'uploading' | 'uploaded' | 'failed'
  - `mediaData`: Stores API response when upload succeeds ✅
  - `mediaId`: Media generation ID for use in image generation ✅
  - `error`: Error message for failed uploads
  - `aspectRatio`: Aspect ratio of uploaded image

- **MediaContextState Interface** with:
  - `mediaLibrary`: Array of MediaWorkflow from Flow API
  - `isLoadingLibrary`: Loading state for API calls
  - `libraryError`: Error state for failed fetches
  - `uploadedImages`: Array of UploadedImage with full state tracking ✅
  - `fetchMedia()`: Fetch media history from Flow
  - `uploadImageFile()`: Upload image with automatic state tracking ✅
  - `removeUploadedImage()`: Remove uploaded image
  - `clearUploads()`: Clear all uploads
  - `refreshLibrary()`: Refresh media library

**Key Features:**
- ✅ Tracks upload state for each image (requested feature)
- ✅ Stores API response data in `mediaData` field (requested feature)
- ✅ Automatic state transitions: pending → uploading → uploaded/failed
- ✅ Error handling with error messages stored per image
- ✅ Preview URL management with cleanup
- ✅ File-to-base64 conversion helper

**Created `/src/hooks/useMediaContext.ts`:**
- Custom hook for accessing MediaContext
- Throws error if used outside MediaProvider
- Simplifies context consumption

### ✅ UI Components

**Created `/src/ui/MediaLibrary.tsx`:**
- Full media library browser component
- Displays recent uploads with status badges:
  - 🔵 Uploading (with spinner)
  - 🟢 Uploaded (green badge)
  - 🔴 Failed (error message)
  - ⚪ Pending
- Shows media library grid from Flow API
- Refresh button with loading state
- Empty state and error state handling
- Hover effects showing media IDs and details

**Modified `/src/ui/TabLayout.tsx`:**
- Updated from 3 tabs to 4 tabs (grid-cols-4)
- Shortened tab labels for better fit
- Added "Library" tab

**Modified `/src/side-panel/SidePanel.tsx`:**
- Wrapped entire app with `<MediaProvider>`
- Added `<MediaLibrary />` tab content
- Imported MediaProvider and MediaLibrary

### 📦 Build Output

```
✓ 1811 modules transformed
dist/side-panel.js: 184.24 kB (was 176.80 kB)
✓ built in 2.39s
```

**Size increase**: +7.44 kB (context + MediaLibrary component)

### 🎯 Key Achievement

**User Request**: "Khi 1 hình được upload lên thì sẽ có data được trả về từ API, vì vậy cần 1 data object trong uploadedImage để xác định xem ảnh đã được upload chưa"

**Solution Implemented**:
```typescript
interface UploadedImage {
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'; // ✅ Track status
  mediaData?: ImageUploadResponse;  // ✅ Store API response data
  mediaId?: string;                  // ✅ Media ID for generation
  error?: string;                    // ✅ Error tracking
}
```

The MediaContext now provides a centralized state management solution for:
1. ✅ Tracking whether images have been uploaded
2. ✅ Storing API response data from uploads
3. ✅ Managing media library from Flow API
4. ✅ Error handling and loading states
5. ✅ Clean preview URL management

### 🔄 How It Works

**Upload Flow:**
1. User selects image file
2. Context creates `UploadedImage` with status='pending'
3. Status updates to 'uploading'
4. File converts to base64
5. API call to upload image
6. On success: status='uploaded', stores mediaData and mediaId ✅
7. On failure: status='failed', stores error message

**Media Library Flow:**
1. Component mounts, calls `fetchMedia()`
2. Context fetches from Flow API via injected script
3. Stores results in `mediaLibrary` array
4. UI displays grid with media information

### 📁 Files Modified/Created

**Created:**
- `/src/contexts/MediaContext.tsx` (159 lines)
- `/src/hooks/useMediaContext.ts` (16 lines)
- `/src/ui/MediaLibrary.tsx` (147 lines)

**Modified:**
- `/src/ui/TabLayout.tsx` (4 tabs instead of 3)
- `/src/side-panel/SidePanel.tsx` (added MediaProvider, MediaLibrary)
- `/src/shared/types.ts` (added media history types)
- `/src/content-script/injected-script.ts` (added fetchMediaHistory)
- `/src/services/flowApi.ts` (added service methods)

**Total Lines Added**: ~500 lines (including types, context, hooks, UI)

### 🧪 Testing Status

**Completed:**
- ✅ TypeScript compilation
- ✅ Build process
- ✅ Component structure
- ✅ Context provider wrapping

**Requires User Testing:**
- [ ] Actual image upload with state tracking
- [ ] Media library fetch from Flow
- [ ] Upload error handling
- [ ] Preview display and cleanup
- [ ] MediaLibrary tab navigation

### 🚀 Next Steps for User

1. **Build and Load Extension:**
   ```bash
   npm run build
   # Load dist/ folder in Chrome
   ```

2. **Test Upload Tracking:**
   - Open side panel
   - Upload an image via ReferenceImageUpload
   - Switch to "Library" tab
   - Verify upload status appears in "Recent Uploads"
   - Check that uploaded images show green "Uploaded" badge
   - Verify mediaId appears on hover

3. **Test Media Library:**
   - Click "Library" tab
   - Click "Refresh" button
   - Verify media library loads from Flow
   - Check for error handling if not logged in

4. **Test Context Access:**
   - Any component can now use `useMediaContext()` hook
   - Access uploadedImages array with full tracking
   - Access mediaLibrary for Flow media

---

**Implementation Complete** ✅
All core functionality implemented and tested via build process. User testing required for runtime verification.
