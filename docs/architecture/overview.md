# Architecture Overview

## Introduction

The Flowcio extension uses a **multi-layer architecture** to securely interface with Google Flow's API while respecting browser security boundaries. Each layer operates in a different security context, communicating through well-defined channels.

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Google Flow Website                      │
│         https://labs.google/fx/tools/flow                │
└───────────────────────┬──────────────────────────────────┘
                        │
        ┌───────────────┴────────────────┐
        │                                │
   ┌────▼─────────┐             ┌───────▼────────┐
   │  Injected    │             │  Fetch         │
   │  Script      │◄────────────┤  Interceptor   │
   │              │   Capture   │                │
   │ - API Calls  │   Auth      └────────────────┘
   │ - Auth Flow  │
   │ - reCAPTCHA  │
   └────▲─────────┘
        │ CustomEvent (flowExtensionCommand/Response)
        │
   ┌────┴─────────────────┐
   │  Content Script      │
   │                      │
   │ - Script Injection   │
   │ - Message Queue      │
   │ - Request/Response   │
   └────▲─────────────────┘
        │ chrome.runtime.sendMessage
        │
   ┌────┴───────────────────────┐
   │  Background Service Worker  │
   │                             │
   │ - Message Routing           │
   │ - Tab Monitoring            │
   │ - Lifecycle Management      │
   └────▲────────────────────────┘
        │ chrome.tabs.sendMessage
        │
   ┌────┴──────────┐
   │  Popup UI     │
   │  (React)      │
   │               │
   │ - Controls    │
   │ - Status      │
   │ - Results     │
   └───────────────┘
```

## Layer Breakdown

### Layer 1: Popup UI

**File**: `extension/src/popup/Popup.tsx`

**Security Context**: Extension isolated context

**Responsibilities**:
- Renders user interface using React 19
- Displays connection status to Flow
- Accepts user inputs (prompts, settings)
- Shows API responses and errors
- Provides control buttons for API operations

**Technology Stack**:
- React 19 + TypeScript
- TailwindCSS for styling
- Chrome Extension APIs for messaging

**Key Features**:
- Real-time connection status indicator
- Batch image generation interface
- API endpoint discovery
- Error message display
- Debug information viewer

---

### Layer 2: Background Service Worker

**File**: `extension/src/background.ts`

**Security Context**: Extension background context

**Responsibilities**:
- Routes messages between popup and content script
- Monitors tab navigation to detect Flow pages
- Manages extension lifecycle (install, update)
- Maintains no persistent state (stateless router)

**Key APIs Used**:
```typescript
chrome.runtime.onInstalled      // Installation lifecycle
chrome.runtime.onMessage        // Message handling
chrome.tabs.onUpdated           // Tab navigation detection
chrome.tabs.sendMessage         // Forward to content script
```

**Message Flow**:
1. Receives message from popup via `chrome.runtime.onMessage`
2. Forwards to active tab via `chrome.tabs.sendMessage`
3. Returns response back to popup

---

### Layer 3: Content Script

**File**: `extension/src/content.ts`

**Security Context**: Isolated DOM context (cannot access page JavaScript)

**Responsibilities**:
- Injects the injected script into the page context
- Bridges communication between extension and page
- Manages asynchronous message queue with UUID tracking
- Implements 30-second timeout for requests
- Converts event-based communication to Promise-based API

**Communication Pattern**:

**To Page** (Command):
```typescript
const id = crypto.randomUUID()
const pending = { resolve, reject }
pendingMessages.set(id, pending)

window.dispatchEvent(new CustomEvent('flowExtensionCommand', {
  detail: { id, action, params }
}))

// Timeout after 30 seconds
setTimeout(() => {
  if (pendingMessages.has(id)) {
    pendingMessages.delete(id)
    reject(new Error('Command timeout'))
  }
}, 30000)
```

**From Page** (Response):
```typescript
window.addEventListener('flowExtensionResponse', (event) => {
  const { id, result, error, success } = event.detail
  const pending = pendingMessages.get(id)

  if (pending) {
    if (success) {
      pending.resolve(result)
    } else {
      pending.reject(new Error(error))
    }
    pendingMessages.delete(id)
  }
})
```

**Script Injection**:
```typescript
// Inject script into page context
const script = document.createElement('script')
script.src = chrome.runtime.getURL('injected.js')
script.onload = () => script.remove()
document.documentElement.appendChild(script)
```

---

### Layer 4: Injected Script

**File**: `extension/src/injected.ts` (~1000+ lines)

**Security Context**: Full page context (same as Flow's JavaScript)

**Responsibilities**:
- Direct access to Flow's session, cookies, localStorage
- Makes authenticated API calls to Flow backend
- Captures OAuth bearer tokens from fetch requests
- Generates reCAPTCHA tokens using Flow's grecaptcha instance
- Implements all Flow API endpoint wrappers
- Provides debug utilities for network analysis

**Context Extraction**:
```typescript
interface FlowContext {
  sessionId: string | null       // From URL or localStorage
  projectId: string | null       // From URL path (/project/{id})
  authToken: string | null       // Captured from fetch
  recaptchaToken: string | null  // Generated or captured
  lastRecaptchaTime: number | null
  initialized: boolean
}
```

**Fetch Interception**:
```typescript
const originalFetch = window.fetch
window.fetch = async function(...args) {
  const [resource, config] = args

  // Capture Authorization header
  if (config?.headers) {
    const auth = headers.get('authorization')
    if (auth?.startsWith('Bearer ')) {
      flowContext.authToken = auth.replace('Bearer ', '')
    }
  }

  // Log API calls for debugging
  if (url.includes('aisandbox-pa.googleapis.com')) {
    console.log('[Flowcio] API Call:', url, config)
  }

  return originalFetch.apply(this, args)
}
```

**API Call Implementation**:
```typescript
async function callFlowAPI<T>(
  endpoint: string,
  payload: unknown
): Promise<T> {
  const url = `${FLOW_API_BASE}${endpoint}`

  const headers: HeadersInit = {}
  if (flowContext.authToken) {
    headers['Authorization'] = `Bearer ${flowContext.authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include',
    mode: 'cors',
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json() as T
}
```

---

## Component Interaction Flow

### Example: Generate Images

1. **User** clicks "Generate Images" in popup
2. **Popup** calls `chrome.tabs.sendMessage` with action `batchGenerateImages`
3. **Background** forwards message to content script
4. **Content Script** generates UUID, dispatches `CustomEvent` to page
5. **Injected Script** receives event, calls `batchGenerateImages()`
6. **Injected Script** generates fresh reCAPTCHA token
7. **Injected Script** makes authenticated fetch to Flow API
8. **Flow API** responds with generated images
9. **Injected Script** dispatches `CustomEvent` with response
10. **Content Script** resolves promise, sends response back
11. **Background** forwards response to popup
12. **Popup** displays results to user

### Timing

- **Message Queue Timeout**: 30 seconds per command
- **API Call Timeout**: Determined by Flow's backend (typically 30-60s)
- **reCAPTCHA Token Lifespan**: Single-use (generated fresh each time)

---

## File Organization

```
extension/
├── src/
│   ├── popup/
│   │   ├── main.tsx          # React entry point
│   │   └── Popup.tsx         # Main UI component
│   ├── background.ts         # Service worker
│   ├── content.ts            # Content script
│   ├── injected.ts           # Page context script
│   ├── types.ts              # Extension message types
│   └── types/
│       └── flow-api.ts       # Flow API type definitions
├── public/
│   ├── icon*.png             # Extension icons
├── popup.html                # Popup HTML shell
├── manifest.json             # Extension configuration
└── dist/                     # Build output
    ├── popup.js
    ├── background.js
    ├── content.js
    ├── injected.js
    └── manifest.json
```

---

## Security Model

### Sandbox Isolation

Each layer operates in a different security sandbox:

| Layer | Context | Access Level |
|-------|---------|-------------|
| Popup | Extension | Extension APIs, no page access |
| Background | Extension | Extension APIs, tab management |
| Content Script | DOM Isolated | DOM access, no page JS |
| Injected Script | Page | Full page access, Flow's session |

### Token Security

- **OAuth Tokens**: Captured in memory, never persisted
- **reCAPTCHA Tokens**: Generated fresh, single-use
- **Session Data**: Extracted from page, not stored in extension
- **CORS**: Bypassed by making calls from page context

### Communication Security

- **Custom Events**: Cannot be spoofed from page (checked by UUID)
- **Message Validation**: All messages include unique request IDs
- **Timeout Protection**: 30-second timeout prevents hanging requests
- **Error Isolation**: Errors caught and returned, never crash extension

---

## Build System

**Build Tool**: Vite 7

**Entry Points**:
- `popup/main.tsx` → `dist/popup.js`
- `background.ts` → `dist/background.js`
- `content.ts` → `dist/content.js`
- `injected.ts` → `dist/injected.js`

**Build Command**:
```bash
npm run build:extension
```

**Output**: `extension/dist/` (ready to load as unpacked extension)

---

## Technology Stack

- **TypeScript 5.9**: Type-safe development
- **React 19**: Popup UI framework
- **TailwindCSS 4**: Styling
- **Vite 7**: Build system
- **Chrome Extension Manifest V3**: Modern extension API

---

## Next Steps

- [Communication Flow](./communication-flow.md) - Detailed message passing patterns
- [Authentication](./authentication.md) - Deep dive into auth and reCAPTCHA
- [Making API Calls](../guides/making-api-calls.md) - How to use the extension
