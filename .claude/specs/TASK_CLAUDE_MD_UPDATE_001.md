# TASK_CLAUDE_MD_UPDATE_001: Update CLAUDE.md Documentation

**Created:** 2026-01-01
**Status:** Planning → Awaiting Approval
**Assigned to:** Claude Code

---

## Objective

Update the project's `CLAUDE.md` file to reflect significant architectural changes and new features added in recent development, specifically:
- React Context and Hooks architecture for media state management
- Media history API integration
- Upload tracking system with status feedback
- Expanded UI component library
- New documentation files

---

## Background

### Current State
The existing `CLAUDE.md` file (222 lines) documents:
- Three-layer message bridge architecture
- Basic service architecture (flowApi.ts, activityLogger.ts)
- File organization (without contexts/ and hooks/)
- TypeScript message contracts (without media history types)
- Development workflow and testing

### Desired State
Update CLAUDE.md to include:
- **MediaContext architecture** - State management for media library and uploads
- **useMediaContext hook** - Custom hook pattern
- **Media history feature** - API integration, types, and workflows
- **Upload tracking** - Status badges and UI feedback mechanisms
- **Expanded file organization** - New directories and components
- **Updated type definitions** - Media-related types
- **New documentation references** - Link to comprehensive API docs

### Why This Update Is Needed
1. **Developer Onboarding** - New developers need accurate documentation of current architecture
2. **Context Management Pattern** - MediaContext is a major architectural addition not documented
3. **API Integration** - Media history API is complex and requires clear documentation
4. **File Organization** - Two new directories (contexts/, hooks/) are not mentioned
5. **Feature Completeness** - 4-tab layout and upload tracking are core features

---

## Analysis of Current CLAUDE.md

### Strengths to Preserve
✅ Clear architecture overview with Layer 1-2-3 explanation
✅ Message flow diagram
✅ Development workflow instructions
✅ Services architecture section (well-explained)
✅ Security best practices
✅ Common issues & solutions

### Gaps to Address
❌ No mention of React Context/Hooks architecture
❌ Media history API not documented
❌ Upload tracking system not explained
❌ File organization missing contexts/ and hooks/
❌ Type definitions incomplete (missing media types)
❌ MediaLibrary component not mentioned
❌ No reference to new documentation files
❌ TabLayout now has 4 tabs (not documented)

---

## Proposed Updates

### 1. **File Organization Section** (Line 102-112)

**Current:**
```markdown
### File Organization
- `src/shared/` - Cross-layer TypeScript types and utilities
- `src/background-worker/` - Service worker (Chrome API executor)
- `src/content-script/` - Bridge scripts (content + injected)
- `src/side-panel/` - React side panel UI
- `src/popup/` - React popup UI
- `src/components/` - Shadcn UI components (flattened structure)
- `src/ui/` - Custom UI components (Header, Forms, Layouts)
- `src/services/` - Business logic and API services
- `src/lib/` - Utility functions (cn helper, etc.)
```

**Proposed Addition:**
```markdown
### File Organization
- `src/shared/` - Cross-layer TypeScript types and utilities
- `src/background-worker/` - Service worker (Chrome API executor)
- `src/content-script/` - Bridge scripts (content + injected)
- `src/contexts/` - React Context providers (MediaContext for state management) ⬅️ NEW
- `src/hooks/` - Custom React hooks (useMediaContext) ⬅️ NEW
- `src/side-panel/` - React side panel UI (wrapped with MediaProvider)
- `src/popup/` - React popup UI
- `src/components/` - Shadcn UI components (flattened structure)
- `src/ui/` - Custom UI components (Header, Forms, Layouts, MediaLibrary) ⬅️ UPDATED
- `src/services/` - Business logic and API services
- `src/lib/` - Utility functions (cn helper, promptUtils)
```

### 2. **New Section: React Context & Hooks Architecture** (After Line 150)

**Proposed New Section:**
```markdown
### React Context & Hooks Architecture

**MediaContext** (`src/contexts/MediaContext.tsx`):
- Centralized state management for media library and upload tracking
- Provides global access to media state across components
- Singleton pattern with MediaProvider wrapper

**State Management**:
```typescript
interface MediaContextState {
  // Media library from Flow API
  mediaLibrary: MediaWorkflow[];
  isLoadingLibrary: boolean;
  libraryError: string | null;

  // Upload tracking with status
  uploadedImages: UploadedImage[];

  // File URL caching
  fileUrlCache: Map<string, string>;

  // Actions
  fetchMedia(pageSize?, cursor?): Promise<void>;
  uploadImageFile(file, aspectRatio?): Promise<string>;
  removeUploadedImage(index): void;
  clearUploads(): void;
  refreshLibrary(): Promise<void>;
  getFileUrl(mediaId): string | undefined;
}
```

**Upload Status Tracking**:
- `pending` - File selected, not yet uploaded
- `uploading` - Upload in progress
- `uploaded` - Successfully uploaded, mediaId available
- `failed` - Upload failed with error message

**Usage Pattern**:
```typescript
import { MediaProvider } from '@/contexts/MediaContext';
import { useMediaContext } from '@/hooks/useMediaContext';

// Wrap root component
<MediaProvider>
  <SidePanel />
</MediaProvider>

// In child components
const { mediaLibrary, uploadImageFile, isLoadingLibrary } = useMediaContext();

// Upload with tracking
const mediaId = await uploadImageFile(file, aspectRatio);
```

**Best Practices**:
- ✅ Use `useMediaContext()` hook instead of direct Context.Consumer
- ✅ MediaProvider must wrap components needing media state
- ✅ Upload status automatically tracked in context
- ✅ File URL caching prevents redundant API calls
- ✅ Automatic preview cleanup on unmount
```

### 3. **Services Architecture Update** (Line 117-150)

**Proposed Addition to Flow API Service:**
```markdown
**Flow API Service** (`src/services/flowApi.ts`):
- Core API communication with Flow through Chrome messaging
- Functions: `testConnection()`, `generateImages()`, `generateVideo()`, `uploadImage()`,
  `fetchMediaHistory()`, `fetchMediaDetails()` ⬅️ NEW
- Singleton class `FlowApiService` for state management
- Type-safe interfaces: `ConnectionStatus`, `ImageGenerationParams`, `VideoGenerationParams`,
  `MediaHistoryParams`, `MediaDetailsParams` ⬅️ NEW

**Media History Integration**: ⬅️ NEW SUBSECTION
- Fetches user's media generation history from Flow
- Cursor-based pagination (default: 18 items per page)
- Nested response structure with workflow metadata
- File URL lazy loading with caching mechanism

```typescript
// Fetch media history
const result = await fetchMediaHistory({
  pageSize: 18,
  cursor: null  // or previous cursor for pagination
});

// Access media workflows
result.userWorkflows.forEach(workflow => {
  console.log(workflow.name);           // Base64-encoded name
  console.log(workflow.media.mediaId);  // Media ID
  console.log(workflow.createTime);     // ISO 8601 timestamp
});
```
```

### 4. **TypeScript Message Contracts Update** (After Line 64)

**Proposed Addition:**
```markdown
### TypeScript Message Contracts
All communication uses strongly-typed interfaces in `src/shared/types.ts`:
- `APICallMessage` - Chrome API requests
- `GoogleGenAIBridgeMessage` - GenAI operations
- `ResponseMessage` - API responses
- `TabDataMessage` - Tab information
- `FlowMediaHistoryRequest` - Media history pagination ⬅️ NEW
- `FlowMediaHistoryResult` - Media history response ⬅️ NEW
- `MediaWorkflow` - Workflow metadata ⬅️ NEW
- `MediaObject` - Media item structure ⬅️ NEW
- `MediaGenerationId` - Media identifier ⬅️ NEW

**Media History Types**: ⬅️ NEW SUBSECTION
```typescript
interface FlowMediaHistoryRequest {
  pageSize?: number;        // Default: 18
  cursor?: string | null;   // Pagination cursor
}

interface MediaWorkflow {
  name: string;             // Base64-encoded workflow name
  media: MediaObject;       // Media details
  createTime: string;       // ISO 8601 timestamp
}

interface MediaObject {
  mediaId: string;          // UUID
  mediaType: 'IMAGE';
  // ... additional fields
}
```
```

### 5. **React Component Conventions Update** (Line 96-101)

**Current:**
```markdown
### React Component Conventions
- Functional components with hooks (useState, useEffect)
- Tailwind CSS for styling (configured in tailwind.config.js)
- TypeScript interfaces for all props and state
- Activity logging with timestamp, message, and severity
```

**Proposed Update:**
```markdown
### React Component Conventions
- Functional components with hooks (useState, useEffect, useMediaContext) ⬅️ UPDATED
- Tailwind CSS for styling (configured in tailwind.config.js)
- TypeScript interfaces for all props and state
- Activity logging with timestamp, message, and severity
- Context providers for shared state (MediaProvider) ⬅️ NEW
- Custom hooks for context access (useMediaContext) ⬅️ NEW
- Upload status badges (pending/uploading/uploaded/failed) ⬅️ NEW
```

### 6. **New Section: Media Library Feature** (After Services Architecture)

**Proposed New Section:**
```markdown
### Media Library Feature

**MediaLibrary Component** (`src/ui/MediaLibrary.tsx`):
- Displays user's media generation history from Flow
- Grid layout with responsive design
- Upload tracking with status badges
- File URL lazy loading with caching

**Key Features**:
- **Pagination**: Cursor-based pagination (18 items per page)
- **Upload Tracking**: Visual status indicators (pending → uploading → uploaded/failed)
- **File Caching**: Prevents redundant API calls for file URLs
- **Error Handling**: Displays error states with retry options
- **Empty States**: User-friendly messages when no media exists

**Upload Status Badges**:
```typescript
pending    → Gray badge, file selected
uploading  → Blue badge, upload in progress
uploaded   → Green badge, mediaId available
failed     → Red badge, error message shown
```

**Integration**:
- Uses `useMediaContext()` for state access
- Integrated into TabLayout as "Library" tab (4th tab)
- Automatic refresh on upload completion
- Supports image selection for image-to-image generation

**API Endpoint**:
- Flow API: `/api/trpc/media.fetchUserHistoryDirectly`
- Request format: URL-encoded JSON parameter
- Response: Nested structure with `result.data.json.userWorkflows`
```

### 7. **TabLayout Update** (In React Component Conventions)

**Proposed Addition:**
```markdown
**TabLayout** (`src/ui/TabLayout.tsx`):
- 4-tab navigation: "Image", "Video", "Library", "Activity" ⬅️ UPDATED from 3 tabs
- Tab persistence with local state
- Integrates MediaLibrary for media browsing
```

### 8. **Documentation References Section** (New Section at End)

**Proposed New Section:**
```markdown
## Documentation References

### API Documentation
- **Media History API** (`docs/api-reference/media-history.md`) - Comprehensive guide with:
  - Request/response structures
  - Pagination strategies
  - Error handling patterns
  - TypeScript type definitions
  - Best practices (caching, lazy loading, progress tracking)

- **Image Model Style v2** (`docs/prompts/image-model-style-v2.md`) - Updated style guide

### Specifications
- **TASK_MEDIA_HISTORY_001** (`.claude/specs/TASK_MEDIA_HISTORY_001.md`) - Complete implementation spec:
  - Architecture analysis
  - Technical specifications
  - Implementation steps
  - Testing plan
  - Security considerations

### Testing Files
- `test-media-history.html` - Media history API testing page
- `sample.html` - Basic Chrome API bridge testing
- `google-genai-test.html` - GoogleGenAI integration testing
```

### 9. **Entry Points Update** (Line 52-59)

**Current:**
```markdown
### Entry Points & Build System
Vite handles 5 distinct entry points:
- `popup/popup.html` → React popup component
- `side-panel/side-panel.html` → React side panel component
- `content-script/index.ts` → Content script (page injection)
- `background-worker/index.ts` → Service worker (Chrome API executor)
- `content-script/injected-script.ts` → Injected script (page context)
```

**Proposed Update:**
```markdown
### Entry Points & Build System
Vite handles 5 distinct entry points:
- `popup/popup.html` → React popup component
- `side-panel/side-panel.html` → React side panel component (wrapped with MediaProvider) ⬅️ UPDATED
- `content-script/index.ts` → Content script (page injection)
- `background-worker/index.ts` → Service worker (Chrome API executor)
- `content-script/injected-script.ts` → Injected script (page context, includes media history API)

**Build Output** (after `npm run build`):
- ~1811 modules bundled
- side-panel.js: ~184KB (main UI bundle)
- dist/ folder ready for Chrome extension loading
```

---

## Implementation Steps

### Phase 1: File Organization Updates
- [ ] Update "File Organization" section (Line 102-112)
  - Add `src/contexts/` directory
  - Add `src/hooks/` directory
  - Update `src/ui/` description to mention MediaLibrary

### Phase 2: Architecture Documentation
- [ ] Add "React Context & Hooks Architecture" section after Services Architecture
  - Document MediaContext state structure
  - Document upload status tracking
  - Provide usage examples
  - List best practices

### Phase 3: Type Definitions Update
- [ ] Update "TypeScript Message Contracts" section (Line 61-65)
  - Add media history types
  - Include code examples for key interfaces

### Phase 4: Component Documentation
- [ ] Update "React Component Conventions" section
  - Add context provider pattern
  - Add custom hooks pattern
  - Add upload status badges

- [ ] Add "Media Library Feature" section
  - Document MediaLibrary component
  - Explain upload tracking
  - Document API integration

### Phase 5: Services Update
- [ ] Update "Services Architecture" section
  - Add fetchMediaHistory() and fetchMediaDetails() to Flow API Service
  - Add media history integration subsection
  - Include usage examples

### Phase 6: Entry Points & Documentation
- [ ] Update "Entry Points & Build System" section
  - Note MediaProvider wrapper
  - Add build output details

- [ ] Add "Documentation References" section
  - Link to media-history.md
  - Link to TASK_MEDIA_HISTORY_001.md
  - Link to test files

### Phase 7: Final Review
- [ ] Verify all line number references are accurate
- [ ] Ensure code examples are syntactically correct
- [ ] Check for consistency in formatting
- [ ] Validate all file paths
- [ ] Test that examples match actual implementation

---

## Risk Assessment

### Low Risk
✅ Adding new sections (no deletion of existing content)
✅ Updating file organization (simple list addition)
✅ Code examples (can be validated against codebase)

### Medium Risk
⚠️ Line number references may shift after additions
⚠️ Need to preserve existing structure and flow

### Mitigation Strategies
- Make incremental updates per section
- Verify each change against actual codebase
- Keep existing content intact unless explicitly incorrect
- Test all code examples before adding to documentation

---

## Success Criteria

### Must Have
- ✅ MediaContext architecture fully documented
- ✅ Upload tracking system explained
- ✅ File organization updated with new directories
- ✅ Media history types documented
- ✅ All new components listed

### Should Have
- ✅ Code examples for MediaContext usage
- ✅ Upload status flow diagram
- ✅ Links to comprehensive API docs
- ✅ Best practices for context usage

### Nice to Have
- ✅ Build output details
- ✅ Performance considerations
- ✅ Common pitfalls section for MediaContext

---

## Testing Plan

### Validation Steps
1. **Code Example Verification**
   - Copy each code snippet into IDE
   - Verify against actual implementation files
   - Check TypeScript syntax and imports

2. **File Path Verification**
   - Verify all mentioned files exist
   - Check directory structure accuracy
   - Validate documentation references

3. **Completeness Check**
   - Ensure all new features are documented
   - Verify no critical components are missing
   - Check that workflow examples are complete

4. **Readability Test**
   - Read through entire updated CLAUDE.md
   - Ensure logical flow and structure
   - Verify markdown formatting renders correctly

---

## Timeline Estimate

- Phase 1: File Organization Updates - 5 minutes
- Phase 2: Architecture Documentation - 15 minutes
- Phase 3: Type Definitions Update - 10 minutes
- Phase 4: Component Documentation - 15 minutes
- Phase 5: Services Update - 10 minutes
- Phase 6: Entry Points & Documentation - 10 minutes
- Phase 7: Final Review - 15 minutes

**Total Estimated Time:** ~1.5 hours

---

## Alternatives Considered

### Option 1: Complete Rewrite
**Pros:** Fresh start, perfect organization
**Cons:** High risk, loses good existing content, time-consuming
**Decision:** ❌ Rejected - existing content is high quality

### Option 2: Separate File (CLAUDE_MEDIA.md)
**Pros:** Doesn't modify existing file, modular
**Cons:** Developers need to read multiple files, fragmentation
**Decision:** ❌ Rejected - prefer single source of truth

### Option 3: Incremental Updates (SELECTED)
**Pros:** Low risk, preserves existing content, validates each section
**Cons:** Requires careful line number tracking
**Decision:** ✅ **SELECTED** - Best balance of safety and completeness

---

## Future Enhancements (Not in Scope)

- 🔮 Video upload tracking (similar to image upload)
- 🔮 Media search and filtering in library
- 🔮 Batch operations documentation
- 🔮 Performance optimization guide
- 🔮 Testing framework setup (Jest/Vitest)

---

## Approval Required

**Awaiting User Approval for:**
- Overall update approach (incremental updates to existing CLAUDE.md)
- Proposed new sections and their placement
- Code example formats and detail level
- Documentation structure changes

**Questions for User:**
1. Is the level of detail appropriate, or should we be more concise?
2. Should we include diagrams (ASCII art) for upload status flow?
3. Any specific sections that should be prioritized or deprioritized?
4. Preferred code example format (inline vs. code blocks)?

---

## Change Log

### 2026-01-01 - Initial Plan Created
- Analyzed current CLAUDE.md structure (222 lines)
- Identified 9 major update areas
- Created comprehensive implementation plan
- Defined success criteria and testing plan

**Status:** Awaiting user approval to proceed with implementation

---

**Next Steps After Approval:**
1. Begin Phase 1: File Organization Updates
2. Progress through phases sequentially
3. Update this spec with completion status
4. Document any deviations or discoveries during implementation