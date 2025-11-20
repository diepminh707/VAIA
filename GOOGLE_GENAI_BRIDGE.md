# GoogleGenAI Extension Bridge Implementation

This Chrome extension provides a bridge for web applications to execute Google Generative AI operations (image generation, text generation, and content generation) through the extension's background service worker.

## Architecture Overview

The implementation follows a **generic execution bridge** pattern where:

1. **Web Application** - Initializes GoogleGenAI and sends commands to the extension
2. **Extension Bridge** - Routes commands to the background service worker
3. **Background Worker** - Executes GoogleGenAI operations with proper API keys
4. **Response** - Results are returned back to the web application

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install @google/generative-ai
   ```

2. **Build the Extension**
   ```bash
   npm run build
   ```

3. **Load Extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Web Application Usage

### Basic Setup

The extension bridge is available at `window.__chromeExtensionBridge` once the page loads and the content script is injected.

### API Methods

#### `execute(apiKey, command)`

Executes a GoogleGenAI command through the extension.

**Parameters:**
- `apiKey` (string): Your Google AI API key
- `command` (object): Command object with type and payload

**Returns:** Promise with the result

### Command Types

#### 1. Generate Image

```typescript
const result = await window.__chromeExtensionBridge.execute(
  'YOUR_API_KEY',
  {
    type: 'generateImage',
    payload: {
      prompt: 'A beautiful sunset over mountains with vibrant colors',
      aspectRatio: '16:9', // Optional: '1:1', '16:9', '9:16', '4:3'
      model: 'gemini-2.0-flash-exp-image-generation' // Optional
    }
  }
);
```

**Response:**
```typescript
{
  images: string[], // Base64 encoded images
  text: string,    // Generated text (if any)
  success: boolean
}
```

#### 2. Generate Content (with optional images)

```typescript
const result = await window.__chromeExtensionBridge.execute(
  'YOUR_API_KEY',
  {
    type: 'generateContent',
    payload: {
      prompt: 'Describe what you see in these images',
      images: ['base64_image_data_1', 'base64_image_data_2'], // Optional
      model: 'gemini-1.5-flash', // Optional
      temperature: 0.7, // Optional: 0.0 - 1.0
      maxTokens: 1024 // Optional
    }
  }
);
```

**Response:**
```typescript
{
  text: string,    // Generated text
  success: boolean
}
```

#### 3. Generate Text

```typescript
const result = await window.__chromeExtensionBridge.execute(
  'YOUR_API_KEY',
  {
    type: 'generateText',
    payload: {
      prompt: 'Write a short story about a robot discovering emotions',
      model: 'gemini-1.5-flash', // Optional
      temperature: 0.7, // Optional: 0.0 - 1.0
      maxTokens: 1024 // Optional
    }
  }
);
```

**Response:**
```typescript
{
  text: string,    // Generated text
  success: boolean
}
```

## Complete Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>GoogleGenAI Extension Demo</title>
</head>
<body>
    <div>
        <input type="password" id="apiKey" placeholder="Google AI API Key">
        <textarea id="prompt" placeholder="Enter your prompt..."></textarea>
        <button onclick="generateImage()">Generate Image</button>
        <button onclick="generateText()">Generate Text</button>
        <div id="results"></div>
    </div>

    <script>
        function waitForBridge(callback) {
            if (window.__chromeExtensionBridge) {
                callback();
            } else {
                setTimeout(() => waitForBridge(callback), 100);
            }
        }

        function generateImage() {
            const apiKey = document.getElementById('apiKey').value;
            const prompt = document.getElementById('prompt').value;

            window.__chromeExtensionBridge.execute(apiKey, {
                type: 'generateImage',
                payload: { prompt }
            }).then(result => {
                if (result.success && result.images.length > 0) {
                    const img = document.createElement('img');
                    img.src = `data:image/png;base64,${result.images[0]}`;
                    document.getElementById('results').appendChild(img);
                }
            }).catch(error => {
                console.error('Error:', error);
            });
        }

        function generateText() {
            const apiKey = document.getElementById('apiKey').value;
            const prompt = document.getElementById('prompt').value;

            window.__chromeExtensionBridge.execute(apiKey, {
                type: 'generateText',
                payload: { prompt }
            }).then(result => {
                if (result.success) {
                    const div = document.createElement('div');
                    div.textContent = result.text;
                    document.getElementById('results').appendChild(div);
                }
            }).catch(error => {
                console.error('Error:', error);
            });
        }

        // Wait for bridge to be available
        waitForBridge(() => {
            console.log('GoogleGenAI Extension Bridge is ready!');
        });
    </script>
</body>
</html>
```

## Security Considerations

1. **API Key Management**: The web application sends the API key to the extension. The extension doesn't store the key permanently.

2. **Content Security**: The extension validates all incoming commands before execution.

3. **Isolation**: All GoogleGenAI operations happen in the extension's background service worker, isolated from the web page.

## Error Handling

The bridge provides structured error responses:

```typescript
try {
    const result = await window.__chromeExtensionBridge.execute(apiKey, command);
    // Handle success
} catch (error) {
    // Handle errors
    console.error('GoogleGenAI Error:', error.message);
}
```

Common errors:
- Invalid API key
- Network issues
- Invalid prompt format
- Model not available
- Quota exceeded

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Requires user to install the Chrome extension
- Works on all websites (requires `<all_urls>` permission)

## Implementation Details

### Message Flow

1. **Web Page** → `postMessage` → **Content Script**
2. **Content Script** → `chrome.runtime.sendMessage` → **Background Worker**
3. **Background Worker** → GoogleGenAI API
4. **Background Worker** → Response → **Content Script**
5. **Content Script** → `postMessage` → **Web Page**

### File Structure

```
src/
├── shared/
│   └── types.ts          # TypeScript interfaces for messages
├── background-worker/
│   └── index.ts          # GoogleGenAI execution logic
├── content-script/
│   ├── index.ts          # Message routing
│   └── injected-script.ts # Web page bridge interface
└── manifest.json         # Extension permissions
```

### Key Features

- **Type Safety**: Full TypeScript support with proper interfaces
- **Error Handling**: Comprehensive error catching and reporting
- **Timeout Management**: 30-second timeout for AI operations
- **Multiple Models**: Support for different GoogleGenAI models
- **Image Support**: Base64 image handling for multimodal operations
- **Extensible**: Easy to add new command types

## Testing

Use the provided `google-genai-test.html` file to test the implementation:

1. Open the test page in Chrome
2. Enter your Google AI API key
3. Try generating images and text
4. Check browser console for debugging information

## API Key Requirements

Get your API key from:
1. [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enable the Generative Language API
4. Use the key in your web application

## Rate Limits & Quotas

Be aware of Google's API rate limits:
- Free tier: 60 requests per minute
- Paid tier: Higher limits available
- Image generation may have separate quotas

Monitor usage in your Google Cloud Console.