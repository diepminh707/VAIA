# Flowcio Extension Documentation

> Comprehensive documentation for the Flowcio browser extension's integration with Google Flow API

## Overview

Flowcio is a Chrome extension that provides programmatic access to Google Flow's image and video generation capabilities. The extension acts as a control panel that interfaces with Flow's internal API, enabling batch operations, automation, and advanced workflows.

## Documentation Structure

### 📐 Architecture

Understand how the extension is built and how components communicate:

- **[Architecture Overview](./architecture/overview.md)** - High-level system design and component responsibilities
- **[Communication Flow](./architecture/communication-flow.md)** - Message passing patterns between extension layers
- **[Authentication](./architecture/authentication.md)** - OAuth tokens, reCAPTCHA handling, and session management

### 📚 API Reference

Complete reference for all available Flow API endpoints:

- **[Image Generation API](./api-reference/image-generation.md)** - Text-to-image and image-to-image generation
- **[Video Generation API](./api-reference/video-generation.md)** - Text-to-video, image-to-video, extend, and reshoot operations
- **[Analytics API](./api-reference/analytics.md)** - Batch log submission for tracking

### 📖 Guides

Step-by-step guides for common tasks:

- **[Making API Calls](./guides/making-api-calls.md)** - How to use the extension to call Flow APIs
- **[Quick Start](./guides/quick-start.md)** - Get up and running in 5 minutes
- **[Authentication Flow](./guides/authentication-flow.md)** - Understanding how authentication works
- **[Extending the Extension](./guides/extending-the-extension.md)** - Add new features and endpoints

### 🔧 Troubleshooting

Solutions to common issues:

- **[Common Issues](./troubleshooting/common-issues.md)** - FAQ and frequent problems
- **[reCAPTCHA Errors](./troubleshooting/recaptcha-errors.md)** - Fixing 403 "reCAPTCHA evaluation failed" errors
- **[Debugging Guide](./troubleshooting/debugging.md)** - Debug tools and techniques

### 💡 Examples

Real-world code examples:

- **[Batch Image Generation](./examples/batch-image-generation.md)** - Generate multiple images in one request
- **[Video Workflows](./examples/video-workflows.md)** - Complete video generation examples
- **[Custom Commands](./examples/custom-commands.md)** - Extending functionality with new commands

## Quick Links

- **Installation**: Load `flowcio/extension/dist/` as an unpacked extension in Chrome
- **Build**: Run `npm run build:extension` to build the extension
- **Source Code**: Extension source is in `flowcio/extension/src/`

## Key Concepts

### 4-Layer Architecture

The extension uses a multi-layer architecture for security and isolation:

```
┌─────────────────┐
│   Popup UI      │ ← User Interface (React)
└────────┬────────┘
         ↓ chrome.runtime.sendMessage
┌────────┴────────┐
│   Background    │ ← Message Router (Service Worker)
└────────┬────────┘
         ↓ chrome.tabs.sendMessage
┌────────┴────────┐
│ Content Script  │ ← Bridge Layer (Isolated DOM Context)
└────────┬────────┘
         ↓ CustomEvent
┌────────┴────────┐
│ Injected Script │ ← API Access (Page Context)
└────────┬────────┘
         ↓ fetch()
┌────────┴────────┐
│  Flow API       │ ← Google Flow Backend
└─────────────────┘
```

### Authentication Model

- **OAuth Bearer Token**: Captured from Flow's own requests via fetch interception
- **reCAPTCHA Token**: Generated fresh for each API call (single-use tokens)
- **Session ID**: Extracted from URL parameters or localStorage
- **Project ID**: Parsed from Flow's URL pathname

### API Base URL

All Flow API calls go through:
```
https://aisandbox-pa.googleapis.com
```

## Security Considerations

1. **Sandboxing**: Each layer runs in a different security context
2. **Token Handling**: Tokens are never stored persistently, only in memory
3. **CORS**: API calls made from page context inherit Flow's authentication
4. **Single-Use Tokens**: reCAPTCHA tokens are generated fresh for each request

## Version Information

- **Extension Manifest**: v3 (Chrome Extension Manifest V3)
- **Image Model**: `GEM_PIX_2` (Gemini Imagen 2)
- **Video Models**: `veo_3_1_*` series (Veo 3.1)
- **reCAPTCHA**: Enterprise reCAPTCHA v3

## Contributing

See [Extending the Extension](./guides/extending-the-extension.md) for guidance on:
- Adding new API endpoints
- Implementing new commands
- Testing changes
- Submitting contributions

## Support

For issues and questions:
1. Check [Common Issues](./troubleshooting/common-issues.md)
2. Review [Debugging Guide](./troubleshooting/debugging.md)
3. Open an issue on the project repository

## License

This documentation reflects the current implementation as of December 2024.
