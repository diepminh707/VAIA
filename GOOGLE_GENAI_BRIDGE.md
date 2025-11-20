# GoogleGenAI Extension Bridge Implementation

This Chrome extension provides a bridge for web applications to execute Google Generative AI operations (image generation, text generation, and content generation) through the extension's background service worker.

## Architecture Overview

The implementation follows a **generic execution bridge** pattern where:

1. **Web Application** - Initializes GoogleGenAI and passes the instance to the extension
2. **Extension Bridge** - Serializes the GoogleGenAI instance and routes commands to the background service worker
3. **Background Worker** - Reconstructs the GoogleGenAI instance and executes operations
4. **Response** - Results are returned back to the web application

## Key Change: Web App Initialization

**Important**: GoogleGenAI is now initialized in the web application, not in the Chrome extension. The web app creates the GoogleGenAI instance and passes it to the extension for execution.

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

### Step 1: Initialize GoogleGenAI in Web App

```html
<!-- Include GoogleGenerativeAI library -->
<script src="https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/dist/generative-ai.min.js"></script>

<script>
// Initialize GoogleGenAI in your web application
const googleGenAI = new GoogleGenerativeAI('YOUR_API_KEY');

// Store API key in instance for serialization
googleGenAI.apiKey = 'YOUR_API_KEY';
</script>
```

### API Methods

#### `execute(googleGenAI, command)`

Executes a GoogleGenAI command through the extension using a GoogleGenAI instance from the web app.

**Parameters:**
- `googleGenAI` (object): The GoogleGenAI instance created in the web app
- `command` (object): Command object with type and payload

**Returns:** Promise with the result

### Command Types

#### 1. Generate Image

```typescript
const result = await window.__chromeExtensionBridge.execute(
  googleGenAIInstance,
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
  googleGenAIInstance,
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
  googleGenAIInstance,
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
    <script src="https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/dist/generative-ai.min.js"></script>
</head>
<body>
    <div>
        <input type="password" id="apiKey" placeholder="Google AI API Key">
        <button onclick="initializeGoogleGenAI()">Initialize</button>
        <textarea id="prompt" placeholder="Enter your prompt..."></textarea>
        <button onclick="generateImage()" disabled>Generate Image</button>
        <button onclick="generateText()" disabled>Generate Text</button>
        <div id="results"></div>
    </div>

    <script>
        let googleGenAIInstance = null;

        function initializeGoogleGenAI() {
            const apiKey = document.getElementById('apiKey').value;
            
            // Initialize GoogleGenAI in web app
            googleGenAIInstance = new GoogleGenerativeAI(apiKey);
            googleGenAIInstance.apiKey = apiKey;
            
            // Enable buttons
            document.querySelectorAll('button[disabled]').forEach(btn => btn.disabled = false);
        }

        function generateImage() {
            const prompt = document.getElementById('prompt').value;

            window.__chromeExtensionBridge.execute(googleGenAIInstance, {
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
            const prompt = document.getElementById('prompt').value;

            window.__chromeExtensionBridge.execute(googleGenAIInstance, {
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
        function waitForBridge(callback) {
            if (window.__chromeExtensionBridge) {
                callback();
            } else {
                setTimeout(() => waitForBridge(callback), 100);
            }
        }

        waitForBridge(() => {
            console.log('GoogleGenAI Extension Bridge is ready!');
        });
    </script>
</body>
</html>
```

## Architecture Details

### Instance Serialization

The web app's GoogleGenAI instance is serialized and transmitted to the extension:

1. **Web App**: Creates GoogleGenAI instance and stores API key
2. **Serialization**: Extracts API key and creates JSON representation
3. **Transmission**: Sends serialized instance to extension via message passing
4. **Reconstruction**: Extension reconstructs GoogleGenAI instance from API key
5. **Execution**: Uses reconstructed instance to make API calls

### Security Considerations

1. **API Key Management**: The web app manages the API key and passes it securely to the extension
2. **Instance Isolation**: Each web app maintains its own GoogleGenAI instance
3. **Content Security**: The extension validates all incoming commands before execution
4. **Temporary Storage**: API keys are not permanently stored in the extension

### Error Handling

The bridge provides structured error responses:

```typescript
try {
    const result = await window.__chromeExtensionBridge.execute(googleGenAIInstance, command);
    // Handle success
} catch (error) {
    // Handle errors
    console.error('GoogleGenAI Error:', error.message);
}
```

Common errors:
- GoogleGenAI instance not initialized
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

1. **Web Page** → `postMessage` with GoogleGenAI instance → **Content Script**
2. **Content Script** → `chrome.runtime.sendMessage` → **Background Worker**
3. **Background Worker** → Reconstructs GoogleGenAI instance → GoogleGenAI API
4. **Background Worker** → Response → **Content Script**
5. **Content Script** → `postMessage` → **Web Page**

### File Structure

```
src/
├── shared/
│   └── types.ts          # TypeScript interfaces for messages
├── background-worker/
│   └── index.ts          # GoogleGenAI reconstruction and execution
├── content-script/
│   ├── index.ts          # Message routing
│   └── injected-script.ts # Web page bridge interface and serialization
└── manifest.json         # Extension permissions
```

### Key Features

- **Type Safety**: Full TypeScript support with proper interfaces
- **Error Handling**: Comprehensive error catching and reporting
- **Timeout Management**: 30-second timeout for AI operations
- **Multiple Models**: Support for different GoogleGenAI models
- **Image Support**: Base64 image handling for multimodal operations
- **Instance Management**: Web app controls GoogleGenAI initialization
- **Extensible**: Easy to add new command types

## Testing

Use the provided `google-genai-test.html` file to test the implementation:

1. Open the test page in Chrome
2. Enter your Google AI API key
3. Click "Initialize GoogleGenAI"
4. Try generating images and text
5. Check browser console for debugging information

## API Key Requirements

Get your API key from:
1. [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Enable the Generative Language API
4. Use the key to initialize GoogleGenAI in your web application

## Rate Limits & Quotas

Be aware of Google's API rate limits:
- Free tier: 60 requests per minute
- Paid tier: Higher limits available
- Image generation may have separate quotas

Monitor usage in your Google Cloud Console.