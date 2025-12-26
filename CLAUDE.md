# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VAIA is a Chrome extension that bridges web applications with Chrome APIs and Google Generative AI. Built with React, TypeScript, Tailwind CSS, and Vite, it provides secure bi-directional communication through a three-layer message passing architecture.

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
3. Test using `sample.html` or `google-genai-test.html` demo pages
4. After code changes: rebuild and refresh extension or reload test page

## Architecture Overview

### Three-Layer Message Bridge System

**Layer 1: Injected Script** (`src/content-script/injected-script.ts`)
- Exposes `window.__chromeExtensionBridge` API to web pages
- Methods: `call()` for Chrome APIs, `execute()` for GoogleGenAI operations
- Serializes GoogleGenAI instances and handles async request/response matching

**Layer 2: Content Script** (`src/content-script/index.ts`)
- Routes messages between web pages and extension background worker
- Converts `window.postMessage` ↔ `chrome.runtime.sendMessage`
- Acts as secure middleware layer

**Layer 3: Background Worker** (`src/background-worker/index.ts`)**
- Service worker with full Chrome API access
- Reconstructs GoogleGenAI instances from serialized data
- Executes API calls and returns results through content script

### Message Flow
```
Web Page → Injected Script → Content Script → Background Worker → Chrome/GenAI APIs
         ←                  ←              ←                  ←
```

## Code Architecture Patterns

### Entry Points & Build System
Vite handles 5 distinct entry points:
- `popup/popup.html` → React popup component
- `side-panel/side-panel.html` → React side panel component
- `content-script/index.ts` → Content script (page injection)
- `background-worker/index.ts` → Service worker (Chrome API executor)
- `content-script/injected-script.ts` → Injected script (page context)

### TypeScript Message Contracts
All communication uses strongly-typed interfaces in `src/shared/types.ts`:
- `APICallMessage` - Chrome API requests
- `GoogleGenAIBridgeMessage` - GenAI operations
- `ResponseMessage` - API responses
- `TabDataMessage` - Tab information

### Request ID Pattern
```typescript
const generateRequestId = (): string =>
  `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```
Prevents response mixing in concurrent async operations.

### Timeout Protection
- Chrome API calls: 5-second timeout
- GenAI operations: 30-second timeout
- Prevents hanging promises and memory leaks

### GoogleGenAI Integration Pattern
Web apps create GoogleGenAI instances → Only API key transmitted → Extension reconstructs instance → Executes operations → Returns results. This keeps API keys primarily in web app context.

## Development Guidelines

### Adding New Chrome APIs
1. Add new message type to `src/shared/types.ts`
2. Update background worker handler in `background-worker/index.ts`
3. Test via demo pages or create new test HTML
4. Update manifest permissions if needed

### Adding New GenAI Capabilities
1. Extend `GoogleGenAICommand` type in `src/shared/types.ts`
2. Add command handler in background worker's `executeGenAICommand()`
3. Test using `google-genai-test.html`
4. Ensure proper error handling and timeouts

### React Component Conventions
- Functional components with hooks (useState, useEffect)
- Tailwind CSS for styling (configured in tailwind.config.js)
- TypeScript interfaces for all props and state
- Activity logging with timestamp, message, and severity

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

### Services Architecture

**Separation of Concerns**: All API logic and business logic are isolated in `src/services/`, separate from UI components.

**Flow API Service** (`src/services/flowApi.ts`):
- Core API communication with Flow through Chrome messaging
- Functions: `testConnection()`, `generateImages()`, `generateVideo()`
- Singleton class `FlowApiService` for state management
- Type-safe interfaces: `ConnectionStatus`, `ImageGenerationParams`, `VideoGenerationParams`

**Activity Logger Service** (`src/services/activityLogger.ts`):
- Centralized activity logging with severity levels (info, success, warning, error)
- Observable pattern with subscribe/unsubscribe for React integration
- Helper methods: `success()`, `info()`, `warning()`, `error()`
- Automatic timestamp generation and history management (max 50 entries)

**Usage Pattern**:
```typescript
import { testConnection, generateImages } from '@/services/flowApi';
import { activityLogger } from '@/services/activityLogger';

// In components
const status = await testConnection();
activityLogger.success('Connected successfully');

const result = await generateImages({
  prompts: ['...'],
  aspectRatio: '...',
});
```

**Best Practices**:
- ✅ UI components only handle rendering and user interactions
- ✅ Services handle all API calls and business logic
- ✅ Never call `chrome.runtime.sendMessage` directly from components
- ✅ Use TypeScript types exported from services
- ✅ Services can be tested independently from UI

## Testing Strategy

### Demo Pages
- `sample.html` - Basic Chrome API bridge testing
- `google-genai-test.html` - GoogleGenAI integration testing

### Manual Testing Process
1. Build extension: `npm run build`
2. Load in Chrome: `chrome://extensions/` → Developer Mode → Load unpacked `dist/`
3. Open demo pages to test functionality
4. Check browser console and extension logs for errors
5. Test side panel activity logging

### No Unit Testing Framework
Currently no Jest/Vitest setup. All testing is integration-based through demo HTML pages.

## Manifest V3 Considerations

### Required Permissions
```json
{
  "permissions": ["activeTab", "scripting", "tabs", "sidePanel"],
  "host_permissions": ["<all_urls>"],
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
- GoogleGenAI API keys remain in web app context
- Only transmitted when needed for operations
- Never logged or persisted by extension

### Error Boundaries
- All Chrome API calls wrapped in try-catch
- Structured error responses with request IDs
- Timeout protection prevents resource leaks

## Common Issues & Solutions

### "Bridge not available" on web pages
- Ensure extension loaded in `chrome://extensions/`
- Check that content script injection succeeded
- Verify `web_accessible_resources` in manifest

### Side panel not opening
- Check if `sidePanel` permission is granted
- Ensure popup calls `chrome.sidePanel.open()` correctly
- Verify React components render without errors

### GenAI operations failing
- Verify API key is valid in test page
- Check network connectivity and CORS policies
- Review timeout settings for large operations

### Build artifacts missing
- Run `npm run build` before loading extension
- Ensure all entry points compile successfully
- Check that custom Vite plugin copies manifest correctly