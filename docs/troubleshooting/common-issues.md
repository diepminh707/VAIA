# Common Issues and Solutions

## Overview

This guide covers the most common issues users encounter when using the Flowcio extension and their solutions.

---

## Installation and Setup Issues

### Issue: Extension Won't Load

**Symptoms**:
- Extension icon doesn't appear in toolbar
- Error message in `chrome://extensions/`
- "Manifest file is missing or unreadable"

**Solutions**:

1. **Verify build output exists**:
   ```bash
   ls flowcio/extension/dist/
   # Should show: manifest.json, popup.js, background.js, content.js, injected.js
   ```

2. **Rebuild extension**:
   ```bash
   cd flowcio
   npm run build:extension
   ```

3. **Check manifest.json**:
   - Open `flowcio/extension/dist/manifest.json`
   - Verify it's valid JSON (no syntax errors)

4. **Use Chrome (not Firefox)**:
   - Extension uses Manifest V3 (Chrome/Edge only)
   - Firefox support requires different manifest

---

### Issue: "Status: Not connected"

**Symptoms**:
- Popup shows "Not connected"
- No project ID or session ID detected

**Solutions**:

1. **Navigate to Flow project page**:
   ```
   https://labs.google/fx/tools/flow/project/YOUR_PROJECT_ID
   ```

2. **Wait for page to fully load** (3-5 seconds)

3. **Refresh the page**:
   - Press F5 or Cmd+R
   - Extension scripts re-inject on page load

4. **Check console for errors**:
   - Open DevTools (F12)
   - Look for `[Flowcio]` messages
   - Should see "Injected script initialized"

5. **Verify URL pattern**:
   - Must be `labs.google/fx/tools/flow/project/...`
   - Extension only activates on Flow pages

---

## Authentication Issues

### Issue: "No auth token available"

**Symptoms**:
- API calls fail with "No auth token"
- `hasAuth: false` in connection status

**Solutions**:

1. **Trigger token capture**:
   - Use Flow UI to generate an image
   - Extension captures token from Flow's own API call

2. **Refresh page**:
   - OAuth tokens captured on page load
   - Refresh to re-capture

3. **Check login status**:
   - Ensure signed into Google account
   - Try signing out and back in

4. **Clear browser cache**:
   ```javascript
   // In DevTools console
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

---

### Issue: 401 Unauthorized

**Symptoms**:
```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials"
  }
}
```

**Solutions**:

1. **Token expired** - Refresh Flow page
2. **Not signed in** - Sign into Google account
3. **Wrong account** - Sign in with account that has Flow access

---

## reCAPTCHA Issues

### Issue: 403 "reCAPTCHA evaluation failed"

**See**: [reCAPTCHA Errors Guide](./recaptcha-errors.md) for comprehensive troubleshooting

**Quick Solutions**:

1. **Update to latest version** (with fix):
   ```bash
   git pull origin master
   npm run build:extension
   ```

2. **Generate image in Flow UI first**:
   - Establishes trust with Google reCAPTCHA
   - Then try extension again

3. **Add delays between requests**:
   ```typescript
   await generateImages(prompts1, aspectRatio)
   await new Promise(resolve => setTimeout(resolve, 3000))  // 3s delay
   await generateImages(prompts2, aspectRatio)
   ```

---

## API Call Issues

### Issue: "Command timeout"

**Symptoms**:
- API calls fail after 30 seconds
- Error: "Command timeout: batchGenerateImages"

**Solutions**:

1. **Check network connection**:
   - Ensure stable internet
   - Try different network if on VPN

2. **Retry the request**:
   ```typescript
   // Implement retry logic
   for (let i = 0; i < 3; i++) {
      try {
        return await generateImages(prompts, aspectRatio)
      } catch (error) {
        if (i === 2) throw error
        await new Promise(r => setTimeout(r, 5000))
      }
   }
   ```

3. **Reduce batch size**:
   ```typescript
   // Instead of 4 prompts
   prompts: ['p1', 'p2', 'p3', 'p4']

   // Try 1-2 prompts
   prompts: ['p1', 'p2']
   ```

---

### Issue: Empty or Invalid Response

**Symptoms**:
- `response.result` is undefined
- `response.result.media` is empty array

**Solutions**:

1. **Check for errors first**:
   ```typescript
   if (response?.error) {
     console.error('Error:', response.error)
     return
   }

   if (!response?.result?.media) {
     console.error('Invalid response:', response)
     return
   }
   ```

2. **Verify request structure**:
   - Ensure prompts is an array: `['prompt']`, not `'prompt'`
   - Verify aspectRatio is a valid constant

3. **Check console logs**:
   - Look for API error messages
   - Verify request was actually sent

---

## Performance Issues

### Issue: Slow Image Generation

**Symptoms**:
- Images take > 60 seconds to generate
- Timeout errors

**Solutions**:

1. **Check batch size**:
   ```typescript
   // ✅ Optimal: 1-4 prompts
   prompts: ['p1', 'p2', 'p3']

   // ❌ Too large: > 4 prompts
   prompts: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
   ```

2. **Simplify prompts**:
   - Shorter prompts generate faster
   - Avoid overly complex descriptions

3. **Check Flow server status**:
   - Try generating in Flow UI directly
   - If Flow UI is slow, it's a server issue

---

### Issue: Extension Slows Down Browser

**Symptoms**:
- Browser becomes sluggish
- High CPU/memory usage

**Solutions**:

1. **Close unused tabs**:
   - Extension only active on Flow pages
   - Close other Flow tabs

2. **Clear extension state**:
   ```javascript
   // In DevTools on Flow page
   location.reload()
   ```

3. **Check for memory leaks**:
   - Open Chrome Task Manager (Shift+Esc)
   - Look for high memory usage
   - Report issue if consistent

---

## Communication Issues

### Issue: "No response from injected script"

**Symptoms**:
- Commands sent but no response
- 30-second timeout

**Solutions**:

1. **Verify injected script loaded**:
   ```javascript
   // In DevTools console
   console.log('Testing injected script...')
   window.dispatchEvent(new CustomEvent('flowExtensionCommand', {
     detail: { id: 'test', action: 'testConnection', params: {} }
   }))
   ```

2. **Check content script injection**:
   - Open DevTools
   - Go to Elements tab
   - Search for `<script src="chrome-extension://`
   - Should see injected.js

3. **Reload extension**:
   - Go to `chrome://extensions/`
   - Click "Reload" on Flowcio extension
   - Refresh Flow page

---

### Issue: Extension Icon Not Responding

**Symptoms**:
- Clicking icon does nothing
- Popup doesn't open

**Solutions**:

1. **Check for popup errors**:
   - Right-click extension icon
   - Click "Inspect popup"
   - Check console for errors

2. **Reload extension**:
   - `chrome://extensions/`
   - Click "Reload"

3. **Rebuild popup**:
   ```bash
   npm run build:extension
   ```

---

## Browser-Specific Issues

### Issue: Works in Chrome but not Edge

**Symptoms**:
- Extension works in Chrome
- Fails in Edge

**Solutions**:

1. **Enable Developer Mode in Edge**:
   - Go to `edge://extensions/`
   - Toggle "Developer mode"

2. **Clear Edge cache**:
   - Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

3. **Reinstall in Edge**:
   - Remove extension
   - Re-add from dist folder

---

## Content Policy Issues

### Issue: "Content policy violation"

**Symptoms**:
```json
{
  "error": {
    "message": "Generation failed due to content policy violation"
  }
}
```

**Solutions**:

1. **Review prompt content**:
   - Avoid violent, sexual, or offensive content
   - Remove brand names or copyrighted material

2. **Rephrase prompt**:
   ```typescript
   // ❌ May violate policy
   "realistic photo of [celebrity name]"

   // ✅ Better
   "portrait of a person in professional attire"
   ```

3. **Check Flow's content policies**:
   - Visit Flow documentation
   - Review acceptable use guidelines

---

## Debug Techniques

### Enable Verbose Logging

```typescript
// Add to console
localStorage.setItem('flowcio_debug', 'true')
location.reload()

// Check logs
// Should see detailed [Flowcio] messages
```

### Check Extension Version

```javascript
// In DevTools on extension popup
chrome.runtime.getManifest().version
```

### Inspect Network Requests

1. Open DevTools → Network tab
2. Filter for: `aisandbox-pa.googleapis.com`
3. Click on request
4. Check Headers, Payload, Response

### Test Connection Manually

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'testConnection'
  }, (response) => {
    console.log('Connection test:', response)
  })
})
```

---

## Emergency Recovery

### Complete Reset

If nothing works, try a complete reset:

```bash
# 1. Remove extension from Chrome
# chrome://extensions/ → Remove

# 2. Clear local storage
# DevTools console:
localStorage.clear()
sessionStorage.clear()

# 3. Clean rebuild
cd flowcio
rm -rf node_modules
rm -rf extension/dist
npm install
npm run build:extension

# 4. Reload extension
# chrome://extensions/ → Load unpacked → select extension/dist/

# 5. Refresh Flow page
# Press F5
```

---

## Getting Help

If issues persist after trying solutions above:

### 1. Gather Debug Information

```typescript
// Run this in DevTools console on Flow page
const debugInfo = {
  url: window.location.href,
  userAgent: navigator.userAgent,
  extensionVersion: chrome.runtime.getManifest().version,
  localStorage: Object.keys(localStorage),
  connectionTest: null
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {
    action: 'testConnection'
  }, (response) => {
    debugInfo.connectionTest = response
    console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2))
  })
})
```

### 2. Check Logs

- Browser console (F12)
- Extension background console (chrome://extensions/ → Service worker)
- Network tab for API calls

### 3. Report Issue

Include:
- Debug information from step 1
- Console logs
- Steps to reproduce
- Expected vs actual behavior

---

## See Also

- [reCAPTCHA Errors](./recaptcha-errors.md) - Detailed reCAPTCHA troubleshooting
- [Architecture Overview](../architecture/overview.md) - Understanding how extension works
- [Authentication Flow](../architecture/authentication.md) - Auth debugging
- [Making API Calls](../guides/making-api-calls.md) - Proper usage guide
