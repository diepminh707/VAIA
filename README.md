# Chrome Extension with Side Panel

A fully-featured Chrome extension built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**. This extension provides bi-directional communication between web pages and Chrome APIs through a secure message-passing bridge.

## 🎯 Features

- **Side Panel Interface**: Beautiful React-powered side panel that displays extension status and activity logs
- **Bi-directional Communication Bridge**: Seamless message passing between web pages and the extension
- **GoogleGenAI Image Generation**: Securely call Google's Gemini image APIs via the extension bridge
- **Content Script Layer**: Injects a communication bridge into web pages for secure API access
- **Background Service Worker**: Handles Chrome API calls on behalf of web pages
- **TypeScript Support**: Full type safety with TypeScript interfaces for all message structures
- **Tailwind CSS**: Modern, responsive UI styling
- **Manifest V3**: Latest Chrome extension manifest version

## 📋 Architecture

### Core Components

1. **Background Service Worker** (`src/background-worker/index.ts`)
   - Listens for Chrome API requests from content scripts
   - Executes Chrome APIs safely
   - Sends responses back to requesting pages

2. **Content Script** (`src/content-script/index.ts`)
   - Injects the communication bridge into web pages
   - Relays messages between web pages and the background worker
   - Provides the `__chromeExtensionBridge` interface

3. **Injected Script** (`src/content-script/injected-script.ts`)
   - Runs in the context of web pages
   - Exposes the `window.__chromeExtensionBridge` API
   - Handles request/response tracking with request IDs

4. **Side Panel** (`src/side-panel/SidePanel.tsx`)
   - React component displaying current active tab
   - Real-time activity log of extension operations
   - Status indicator showing extension health

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Chrome browser (latest version)

### Installation

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Development mode with hot reload
npm run dev
```

### Loading the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project

## 💻 Usage

### For Web Page Developers

Web pages can access Chrome APIs through the extension bridge:

```javascript
// Check if bridge is available
if (window.__chromeExtensionBridge) {
  // Query current tab
  const tabs = await window.__chromeExtensionBridge.call('tabs', 'query', {
    active: true,
    currentWindow: true
  });

  // Access storage
  await window.__chromeExtensionBridge.call('storage', 'local', 'set', {
    key: 'value'
  });

  // Any Chrome API can be called this way
  const result = await window.__chromeExtensionBridge.call(
    'namespace',
    'method',
    arg1,
    arg2
  );
}
```

### GoogleGenAI Image Generation

Generate images using Google's Gemini API:

```javascript
const result = await window.__chromeExtensionBridge.googleGenAI.generateImage({
  apiKey: 'YOUR_GOOGLE_AI_API_KEY',
  images: [],  // Optional reference images as base64 or data URLs
  prompt: 'A beautiful sunset over mountains',
  aspectRatio: '16:9'  // Options: "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"
});

if (result.success) {
  const img = document.createElement('img');
  img.src = `data:${result.mimeType};base64,${result.imageData}`;
  document.body.appendChild(img);
}
```

For detailed documentation on GoogleGenAI integration, see [GOOGLEGENAI_INTEGRATION.md](./GOOGLEGENAI_INTEGRATION.md).

### Message Types

The extension uses several message types for communication:

```typescript
// API Call Request
{
  type: 'api_call',
  payload: {
    apiNamespace: 'tabs',
    apiMethod: 'query',
    args: [{ active: true }]
  },
  requestId: 'req_xxx'
}

// API Response
{
  type: 'api_response',
  payload: {
    requestId: 'req_xxx',
    result: [{ /* tab object */ }],
    error?: 'error message'
  }
}

// Tab Data
{
  type: 'tab_data',
  payload: {
    tabId: 1,
    url: 'https://example.com',
    title: 'Example'
  }
}
```

## 📁 Project Structure

```
.
├── src/
│   ├── manifest.json              # Extension manifest (V3)
│   ├── shared/
│   │   └── types.ts              # Shared TypeScript types
│   ├── background-worker/
│   │   └── index.ts              # Service worker
│   ├── content-script/
│   │   ├── index.ts              # Content script
│   │   └── injected-script.ts    # Injected page script
│   ├── side-panel/
│   │   ├── SidePanel.tsx         # React component
│   │   ├── main.tsx              # Entry point
│   │   ├── styles.css            # Tailwind styles
│   │   └── side-panel.html       # HTML template
│   └── popup/
│       ├── Popup.tsx             # Popup component
│       ├── main.tsx              # Entry point
│       ├── styles.css            # Tailwind styles
│       └── popup.html            # HTML template
├── sample.html                    # Demo page
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS configuration
└── package.json                  # Dependencies
```

## 🔧 Development

### Building

```bash
# Production build
npm run build

# Output will be in the `dist/` folder
```

### Type Checking

```bash
npm run type-check
```

### Hot Reload in Development

The extension supports hot reload during development:

```bash
npm run dev
```

When running in dev mode, changes to source files will trigger a rebuild. You may need to refresh the extension in Chrome to see changes.

## 🔐 Security Considerations

- **Message Validation**: All messages are validated before processing
- **API Isolation**: Content scripts cannot directly access Chrome APIs
- **Error Handling**: Errors are caught and reported without exposing sensitive information
- **Request IDs**: All async operations use request IDs to prevent response mixing
- **API Key Handling**: GoogleGenAI API keys are provided per request and never persisted by the extension
- **Timeout Protection**: Standard Chrome API calls have a 5-second timeout, while GoogleGenAI image generation requests have a 60-second timeout to accommodate longer processing

## 📦 Build Output

The build process generates the following structure in `dist/`:

```
dist/
├── manifest.json
├── background-worker.js          # Service worker
├── content-script.js             # Content script
├── injected-script.js            # Injected script
├── side-panel.html
├── side-panel.js
├── side-panel.css
├── popup.html
├── popup.js
└── popup.css
```

## 🧪 Testing

To test the extension:

1. Load the extension in Chrome (see "Loading the Extension" section)
2. Open `sample.html` in your browser (or any web page)
3. The side panel should appear on the right
4. Use the demo buttons to test API communication

## 🐛 Troubleshooting

### Bridge Not Available
- Check that the extension is loaded in `chrome://extensions/`
- Ensure "Developer mode" is enabled
- Refresh the web page
- Check browser console for errors

### Side Panel Not Showing
- Click the extension icon in the toolbar
- Click "Open Side Panel" button
- Or use the keyboard shortcut if configured

### Messages Not Being Received
- Check the browser console for errors
- Verify the manifest.json permissions are correct
- Ensure the extension is enabled in `chrome://extensions/`

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
