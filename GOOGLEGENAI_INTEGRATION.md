# GoogleGenAI Integration via Chrome Extension Bridge

This document explains how to use the GoogleGenAI integration feature of the Chrome Extension Bridge to generate images using Google's Gemini API.

## Overview

The Chrome Extension Bridge now supports calling GoogleGenAI's image generation API. This allows web applications to securely leverage the Chrome extension to make API calls to Google's generative AI services without exposing API keys in client-side code.

## Architecture

### Data Flow

```
Web Application → Injected Script → Content Script → Background Worker → GoogleGenAI API
                                                    ↓
Web Application ← Injected Script ← Content Script ← Background Worker ← Response
```

1. **Web Application**: Calls the bridge API with image generation parameters
2. **Injected Script**: Exposes `window.__chromeExtensionBridge.googleGenAI.generateImage()`
3. **Content Script**: Relays messages between injected script and background worker
4. **Background Worker**: Executes the actual GoogleGenAI API call using `@google/genai`
5. **Response Flow**: Results are returned back through the same chain

## Installation

The `@google/genai` package is already included as a dependency:

```bash
npm install @google/genai
```

## API Reference

### `googleGenAI.generateImage(request)`

Generates an image using Google's Gemini API with optional reference images.

#### Parameters

```typescript
interface GoogleGenAIGenerateImageRequest {
  apiKey: string;        // Google AI API key (get from https://aistudio.google.com)
  images: string[];      // Array of base64-encoded images or data URLs (optional)
  prompt: string;        // Text prompt describing the desired image
  aspectRatio: string;   // Aspect ratio: "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"
}
```

#### Returns

```typescript
interface GoogleGenAIGenerateImageResponse {
  success: boolean;      // Whether the generation was successful
  imageData?: string;    // Base64-encoded generated image (if successful)
  mimeType?: string;     // MIME type of the generated image (e.g., "image/jpeg")
  error?: string;        // Error message (if failed)
}
```

## Usage Example

### Basic Image Generation

```javascript
// Check if the bridge is available
if (window.__chromeExtensionBridge?.googleGenAI) {
  try {
    const result = await window.__chromeExtensionBridge.googleGenAI.generateImage({
      apiKey: 'YOUR_GOOGLE_AI_API_KEY',
      images: [],
      prompt: 'A beautiful sunset over mountains with vibrant colors',
      aspectRatio: '16:9'
    });

    if (result.success) {
      // Display the generated image
      const img = document.createElement('img');
      img.src = `data:${result.mimeType};base64,${result.imageData}`;
      document.body.appendChild(img);
    } else {
      console.error('Generation failed:', result.error);
    }
  } catch (error) {
    console.error('API call failed:', error);
  }
}
```

### Image Generation with Reference Images

```javascript
// Convert an image file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Generate image with reference
async function generateWithReference(file) {
  const referenceImage = await fileToBase64(file);
  
  const result = await window.__chromeExtensionBridge.googleGenAI.generateImage({
    apiKey: 'YOUR_GOOGLE_AI_API_KEY',
    images: [referenceImage],
    prompt: 'Transform this image into a watercolor painting style',
    aspectRatio: '1:1'
  });

  return result;
}
```

### Complete Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>GoogleGenAI Image Generation Demo</title>
</head>
<body>
  <h1>Image Generation Demo</h1>
  
  <div>
    <label>API Key:</label>
    <input type="password" id="apiKey" />
  </div>
  
  <div>
    <label>Prompt:</label>
    <textarea id="prompt">A serene landscape with mountains and lake</textarea>
  </div>
  
  <div>
    <label>Aspect Ratio:</label>
    <select id="aspectRatio">
      <option value="1:1">Square (1:1)</option>
      <option value="16:9">Landscape (16:9)</option>
      <option value="9:16">Portrait (9:16)</option>
    </select>
  </div>
  
  <button onclick="generate()">Generate Image</button>
  
  <div id="result"></div>

  <script>
    async function generate() {
      const apiKey = document.getElementById('apiKey').value;
      const prompt = document.getElementById('prompt').value;
      const aspectRatio = document.getElementById('aspectRatio').value;
      
      if (!window.__chromeExtensionBridge?.googleGenAI) {
        alert('Chrome Extension Bridge not available');
        return;
      }
      
      try {
        const result = await window.__chromeExtensionBridge.googleGenAI.generateImage({
          apiKey,
          images: [],
          prompt,
          aspectRatio
        });
        
        const resultDiv = document.getElementById('result');
        
        if (result.success) {
          resultDiv.innerHTML = `
            <h2>Generated Image:</h2>
            <img src="data:${result.mimeType};base64,${result.imageData}" 
                 style="max-width: 100%;" />
          `;
        } else {
          resultDiv.innerHTML = `<p style="color: red;">Error: ${result.error}</p>`;
        }
      } catch (error) {
        alert('Generation failed: ' + error.message);
      }
    }
  </script>
</body>
</html>
```

## Security Considerations

### API Key Management

- **Never expose API keys in client-side code** in production applications
- The web application must provide the API key in each request
- The extension does not store or cache API keys
- Consider implementing a server-side proxy for production use

### Input Validation

The extension validates all inputs before making API calls:
- API key must be a non-empty string
- Prompt must be a non-empty string
- Images must be an array (can be empty)
- Aspect ratio must be a non-empty string

### Timeout Management

- API calls have a 60-second timeout
- Longer timeouts are necessary for image generation
- The promise will reject if the timeout is exceeded

## Error Handling

Common errors and how to handle them:

```javascript
try {
  const result = await window.__chromeExtensionBridge.googleGenAI.generateImage({
    apiKey: 'YOUR_API_KEY',
    images: [],
    prompt: 'A beautiful landscape',
    aspectRatio: '16:9'
  });

  if (!result.success) {
    // API returned an error
    switch (true) {
      case result.error.includes('API key'):
        console.error('Invalid API key');
        break;
      case result.error.includes('quota'):
        console.error('API quota exceeded');
        break;
      case result.error.includes('timeout'):
        console.error('Request timed out');
        break;
      default:
        console.error('Unknown error:', result.error);
    }
  }
} catch (error) {
  // Bridge or network error
  if (error.message.includes('timeout')) {
    console.error('Request timed out after 60 seconds');
  } else {
    console.error('Communication error:', error);
  }
}
```

## Supported Aspect Ratios

The following aspect ratios are supported:
- `"1:1"` - Square
- `"16:9"` - Landscape (widescreen)
- `"9:16"` - Portrait (mobile)
- `"4:3"` - Standard landscape
- `"3:4"` - Standard portrait
- `"3:2"` - Classic photo landscape
- `"2:3"` - Classic photo portrait
- `"21:9"` - Ultra-wide (if supported by the model)

## Model Information

The extension uses the `gemini-2.0-flash-exp` model with:
- Response modality: `IMAGE`
- Configurable aspect ratio
- Support for reference images via inline data
- JPEG output format

## Limitations

1. **File Size**: Large images may take longer to process
2. **API Quota**: Subject to Google AI's rate limits and quotas
3. **Content Policy**: Generated content must comply with Google's usage policies
4. **Image Format**: Input images are automatically converted to base64 inline data
5. **Timeout**: Maximum 60 seconds per generation request

## Troubleshooting

### Bridge Not Available

```javascript
if (!window.__chromeExtensionBridge) {
  console.error('Extension not installed or not loaded yet');
}

if (!window.__chromeExtensionBridge.googleGenAI) {
  console.error('GoogleGenAI feature not available');
}
```

### API Key Issues

- Ensure you have a valid API key from https://aistudio.google.com
- Check that the key has proper permissions
- Verify quota hasn't been exceeded

### Slow Response Times

- Image generation typically takes 30-60 seconds
- Larger images and complex prompts take longer
- Reference images increase processing time

## TypeScript Support

TypeScript definitions are included:

```typescript
import type { 
  GoogleGenAIGenerateImageRequest,
  GoogleGenAIGenerateImageResponse 
} from './src/shared/types';

// Type-safe usage
const request: GoogleGenAIGenerateImageRequest = {
  apiKey: process.env.GOOGLE_AI_API_KEY,
  images: [],
  prompt: 'A landscape',
  aspectRatio: '16:9'
};

const response: GoogleGenAIGenerateImageResponse = 
  await window.__chromeExtensionBridge.googleGenAI.generateImage(request);
```

## License

This integration uses the `@google/genai` SDK. Please refer to Google's terms of service and the SDK license for usage restrictions.
