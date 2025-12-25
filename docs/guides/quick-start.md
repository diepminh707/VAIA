# Quick Start Guide

Get up and running with the Flowcio extension in 5 minutes.

---

## Prerequisites

- ✅ Chrome or Edge browser
- ✅ Google Flow account ([labs.google/fx/tools/flow](https://labs.google/fx/tools/flow))
- ✅ Node.js and npm installed

---

## Step 1: Build the Extension (2 minutes)

```bash
# Clone or navigate to the repository
cd flowcio-extension/flowcio

# Install dependencies
npm install

# Build the extension
npm run build:extension
```

**Output**: Extension files in `flowcio/extension/dist/`

---

## Step 2: Load Extension in Chrome (1 minute)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Navigate to and select: `flowcio-extension/flowcio/extension/dist/`
5. Extension icon should appear in toolbar

**Verify**: You should see the Flowcio icon (a purple square) in your browser toolbar.

---

## Step 3: Connect to Flow (1 minute)

1. Navigate to [https://labs.google/fx/tools/flow](https://labs.google/fx/tools/flow)
2. Sign in with your Google account
3. Create a new project or open an existing one
4. **Wait 3-5 seconds** for the extension to initialize

**Verify**:
- Click the Flowcio extension icon
- You should see "✅ Connected to Flow"
- Project ID and Session ID should be displayed

---

## Step 4: Generate Your First Image (1 minute)

### Option A: Using the Extension Popup

1. Click the Flowcio extension icon
2. In the prompt field, enter: `a serene mountain landscape at sunset`
3. Select aspect ratio: **Landscape**
4. Click **"Generate Images"**
5. Wait ~15-20 seconds
6. View the generated image URL in the response

### Option B: Using DevTools Console

1. Open DevTools (F12) on the Flow page
2. Paste and run this code:

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'batchGenerateImages',
    params: {
      prompts: ['a serene mountain landscape at sunset'],
      aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
    }
  }, (response) => {
    if (response?.result?.media) {
      console.log('✅ Image generated!')
      console.log('URL:', response.result.media[0].uri)

      // Open image in new tab
      window.open(response.result.media[0].uri, '_blank')
    } else {
      console.error('Error:', response?.error)
    }
  })
})
```

**Expected**: Image URL logged to console and opened in new tab

---

## Quick Examples

### Generate Multiple Images

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'batchGenerateImages',
    params: {
      prompts: [
        'a peaceful zen garden',
        'a futuristic cityscape',
        'a tropical beach at sunrise'
      ],
      aspectRatio: 'IMAGE_ASPECT_RATIO_SQUARE'
    }
  }, (response) => {
    const images = response.result.media
    console.log(`Generated ${images.length} images:`)
    images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.uri}`)
    })
  })
})
```

### Test Connection

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'testConnection'
  }, (response) => {
    console.log('Connection status:', response)
  })
})
```

### Generate Video

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'generateVideoText',
    params: {
      prompt: 'a serene mountain landscape with flowing river',
      aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE'
    }
  }, (genResponse) => {
    const operation = genResponse.result.operations[0]
    console.log('Video generation started')
    console.log('Operation ID:', operation.name)
    console.log('Poll this ID for status in 30-60 seconds')
  })
})
```

---

## Available Aspect Ratios

| Aspect Ratio | Dimensions | Best For |
|--------------|------------|----------|
| `IMAGE_ASPECT_RATIO_SQUARE` | 1024x1024 | Social media, profiles |
| `IMAGE_ASPECT_RATIO_LANDSCAPE` | 1536x864 | Desktop wallpapers |
| `IMAGE_ASPECT_RATIO_PORTRAIT` | 864x1536 | Mobile wallpapers |
| `IMAGE_ASPECT_RATIO_ULTRA_WIDE` | 1920x823 | Ultra-wide monitors |

For videos, use:
- `VIDEO_ASPECT_RATIO_LANDSCAPE` - 16:9
- `VIDEO_ASPECT_RATIO_PORTRAIT` - 9:16

---

## Common First-Time Issues

### "Status: Not connected"

**Solution**:
1. Make sure you're on a Flow project page (`labs.google/fx/tools/flow/project/...`)
2. Refresh the page (F5)
3. Wait 3-5 seconds for initialization

### "No auth token available"

**Solution**:
1. Use Flow's UI to generate an image first
2. This captures the authentication token
3. Then try the extension again

### "reCAPTCHA evaluation failed"

**Solution**:
1. Make sure you're using the latest version (with the fix)
2. Generate one image in Flow UI first
3. Add 2-3 second delays between requests

---

## What's Next?

Now that you're up and running:

### Learn More
- **[Making API Calls](./making-api-calls.md)** - Detailed guide with advanced examples
- **[Architecture Overview](../architecture/overview.md)** - Understand how it works
- **[Image Generation API](../api-reference/image-generation.md)** - Complete API reference
- **[Video Generation API](../api-reference/video-generation.md)** - Video generation guide

### Try Examples
- **[Batch Image Generation](../examples/batch-image-generation.md)** - Generate multiple images
- **[Video Workflows](../examples/video-workflows.md)** - Video generation examples

### Troubleshooting
- **[Common Issues](../troubleshooting/common-issues.md)** - Solutions to frequent problems
- **[reCAPTCHA Errors](../troubleshooting/recaptcha-errors.md)** - Fix reCAPTCHA issues

---

## TypeScript Helper for Quick Testing

Save this as a bookmark in your browser for quick testing:

```javascript
javascript:(function(){
  const prompt = window.prompt('Enter your image prompt:', 'a serene landscape');
  if (!prompt) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'batchGenerateImages',
      params: {
        prompts: [prompt],
        aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE'
      }
    }, (response) => {
      if (response?.result?.media) {
        window.open(response.result.media[0].uri, '_blank');
      } else {
        alert('Error: ' + (response?.error || 'Unknown error'));
      }
    });
  });
})();
```

**Usage**: Click the bookmark while on a Flow page to quickly generate an image

---

## Success Checklist

Before moving on, verify:

- ✅ Extension loaded in Chrome (`chrome://extensions/`)
- ✅ Connected to Flow (extension popup shows "Connected")
- ✅ Generated at least one image successfully
- ✅ Image URL opened in browser
- ✅ No console errors in DevTools

If any items are unchecked, see [Common Issues](../troubleshooting/common-issues.md).

---

## Support

**Need help?**
- Check [Common Issues](../troubleshooting/common-issues.md)
- Review [Architecture Overview](../architecture/overview.md)
- See [Making API Calls](./making-api-calls.md) for detailed examples

Happy generating! 🎨
