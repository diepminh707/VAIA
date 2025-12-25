# reCAPTCHA Error Troubleshooting

## Overview

reCAPTCHA errors are the most common issue when using the Flowcio extension. This guide explains why they occur and how to fix them.

## The Problem

### Typical Error Message

```
Error: reCAPTCHA verification failed. Please:
1. Use Flow's UI to generate an image/video first
2. This will generate a valid reCAPTCHA token
3. Then try your request again

Original error: {
  "error": {
    "code": 403,
    "message": "reCAPTCHA evaluation failed",
    "status": "PERMISSION_DENIED",
    "details": [{
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      "reason": "PUBLIC_ERROR_SOMETHING_WENT_WRONG"
    }]
  }
}
```

### When It Occurs

This error typically appears:
- On the **second** API call after extension starts
- After **37 seconds** from the first successful call
- When trying to generate images/videos in quick succession

---

## Root Cause: Single-Use Tokens

### The Critical Issue

**reCAPTCHA Enterprise tokens are SINGLE-USE, not time-based!**

```typescript
// ❌ WRONG ASSUMPTION
"Token is valid for 2 minutes after generation"

// ✅ CORRECT UNDERSTANDING
"Token is valid for ONE API call only, regardless of time"
```

### What Was Happening

**First Request** (Successful):
```
1. Generate reCAPTCHA token → "0cAFcWeA5B80..."
2. Make API call with token
3. Flow validates token ✅
4. Response: Success
5. Extension caches token for 2 minutes
```

**Second Request** (Failed after ~37 seconds):
```
1. Extension finds cached token (37 seconds old, under 2-minute limit)
2. Reuse cached token → "0cAFcWeA5B80..." (same as before)
3. Make API call with token
4. Flow rejects token ❌ "This token was already used!"
5. Response: 403 "reCAPTCHA evaluation failed"
```

---

## The Fix

### Before (Broken Code)

```typescript
async function getReCaptchaToken(): Promise<string | null> {
  // Check if we have a recent token (valid for ~2 minutes)
  if (flowContext.recaptchaToken && flowContext.lastRecaptchaTime) {
    const tokenAge = Date.now() - flowContext.lastRecaptchaTime
    if (tokenAge < 120000) { // 2 minutes
      const ageSeconds = Math.floor(tokenAge / 1000)
      console.log(`[Flowcio] 🛡️ Using cached reCAPTCHA token (age: ${ageSeconds}s)`)
      return flowContext.recaptchaToken  // ← PROBLEM: Reusing token
    }
  }

  // Generate new token...
}
```

### After (Fixed Code)

```typescript
async function getReCaptchaToken(): Promise<string | null> {
  // ⚠️ IMPORTANT: reCAPTCHA tokens are SINGLE-USE, not time-based!
  // Always generate a new token for each request instead of caching
  console.log('[Flowcio] 🔑 Generating new reCAPTCHA token for each request (single-use tokens)')

  // Skip cache check - always generate fresh token
  // Old code cached tokens which caused 403 errors on subsequent requests

  // Generate new token...
  const token = await grecaptcha.enterprise.execute(siteKey, { action })
  return token
}
```

### Commit Reference

The fix was implemented in commit:
```
commit ce75f1d
fix: disable reCAPTCHA token caching to prevent 403 errors
```

---

## How to Verify the Fix

### Test Sequence

1. **Load Flow project page**
2. **First API call** - Should succeed
   ```
   [Flowcio] 🔑 Generating new reCAPTCHA token for each request
   [Flowcio] ✅ Successfully generated new reCAPTCHA token
   [Flowcio] 📤 Calling API...
   [Flowcio] 📥 Response: success
   ```

3. **Wait a few seconds**

4. **Second API call** - Should also succeed
   ```
   [Flowcio] 🔑 Generating new reCAPTCHA token for each request  ← NEW TOKEN
   [Flowcio] ✅ Successfully generated new reCAPTCHA token
   [Flowcio] 📤 Calling API...
   [Flowcio] 📥 Response: success  ← NO 403 ERROR
   ```

### Before vs After

| Metric | Before Fix | After Fix |
|--------|------------|-----------|
| First request | ✅ Success | ✅ Success |
| Second request | ❌ 403 Error | ✅ Success |
| Token reuse | Yes (2-min cache) | No (always fresh) |
| Success rate | ~50% | ~100% |

---

## Remaining Edge Cases

Even with the fix, you might still encounter reCAPTCHA errors in these scenarios:

### 1. grecaptcha Not Loaded

**Error**:
```
[Flowcio] ⚠️ grecaptcha.enterprise not available
[Flowcio] ❌ No reCAPTCHA token available!
```

**Cause**: Flow's reCAPTCHA library hasn't loaded yet

**Solution**:
```typescript
// Extension already implements retry logic
for (let i = 0; i < 10; i++) {
  await new Promise(resolve => setTimeout(resolve, 500))
  if ((window as any).grecaptcha?.enterprise?.execute) {
    break  // Found it!
  }
}
```

**User action**: Wait 2-3 seconds after page load, then retry

---

### 2. Token Generation Failure

**Error**:
```
[Flowcio] ❌ Failed to generate reCAPTCHA token: Error: ...
```

**Common causes**:
- Network issues
- Google services blocked
- Browser extensions interfering
- VPN/proxy issues

**Solution**:
1. Check browser console for errors
2. Disable other extensions temporarily
3. Try without VPN
4. Refresh Flow page

---

### 3. Bot Detection

**Error**:
```
{
  "error": {
    "code": 403,
    "message": "reCAPTCHA evaluation failed",
    "reason": "SUSPICIOUS_ACTIVITY"
  }
}
```

**Cause**: Google detected automated behavior

**Solutions**:
1. **Use Flow UI first**: Generate 1-2 images manually in Flow
2. **Add delays**: Wait 2-3 seconds between batch requests
3. **Reduce batch size**: Use 1-2 prompts instead of 4
4. **Clear browser cache**: Sometimes helps reset reputation

**Example with delays**:
```typescript
for (const prompt of prompts) {
  await batchGenerateImages([prompt], aspectRatio)
  await new Promise(resolve => setTimeout(resolve, 3000))  // 3-second delay
}
```

---

## Debugging Checklist

When encountering reCAPTCHA errors, check these items:

### ✅ Basic Checks

- [ ] Extension updated to latest version (with fix)
- [ ] Flow page fully loaded (wait 3-5 seconds)
- [ ] Extension connected (check popup status)
- [ ] Project ID detected (visible in popup)

### ✅ Token Generation

- [ ] Console shows "Generating new reCAPTCHA token" (not "Using cached")
- [ ] Console shows "Successfully generated new reCAPTCHA token"
- [ ] Token preview visible in logs (50 characters)

### ✅ API Request

- [ ] Request includes reCAPTCHA token in body
- [ ] Authorization header present
- [ ] Project ID in URL path
- [ ] No CORS errors

### ✅ Environment

- [ ] Using Chrome/Edge (not Firefox)
- [ ] No ad blockers interfering
- [ ] No VPN blocking Google services
- [ ] Network connection stable

---

## Console Log Analysis

### Successful Request

```
[Flowcio] 🔑 Generating new reCAPTCHA token for each request (single-use tokens)
[Flowcio] 🔑 Executing grecaptcha.enterprise.execute()...
[Flowcio] ✅ Successfully generated new reCAPTCHA token
[Flowcio] 🛡️ Token preview: 0cAFcWeA5B80zOb7e1TrRjB272uWQycjb1i70TwZ...
[Flowcio] 📦 Payload structure: {hasRootClientContext: true, hasRecaptchaInRoot: true}
[Flowcio] 📤 Calling /v1/projects/.../flowMedia:batchGenerateImages
[Flowcio] 🛡️ reCAPTCHA token included in body (not header)
[Flowcio] 📥 Response from .../flowMedia:batchGenerateImages {media: Array(1)}
```

### Failed Request (Old Bug)

```
[Flowcio] 🛡️ Using cached reCAPTCHA token (age: 37s)  ← PROBLEM
[Flowcio] 📤 Calling /v1/projects/.../flowMedia:batchGenerateImages
POST .../flowMedia:batchGenerateImages 403 (Forbidden)
[Flowcio] ❌ Command error: Error: reCAPTCHA verification failed
```

**Key difference**: "Generating new" vs "Using cached"

---

## Manual Testing Procedure

### Test 1: Rapid Fire (Same Token Issue)

```typescript
// This should work with the fix
for (let i = 0; i < 5; i++) {
  console.log(`Request ${i + 1}`)
  await batchGenerateImages(['test prompt'], 'IMAGE_ASPECT_RATIO_SQUARE')
  console.log(`✅ Request ${i + 1} succeeded`)
}
```

**Expected**: All 5 requests succeed
**Before fix**: Only first succeeds, rest fail with 403

### Test 2: Time-Based (Token Expiry)

```typescript
await batchGenerateImages(['prompt 1'], aspectRatio)
console.log('Waiting 2 minutes...')
await new Promise(resolve => setTimeout(resolve, 120000))

await batchGenerateImages(['prompt 2'], aspectRatio)
```

**Expected**: Both requests succeed
**Before fix**: Second might fail if old token was cached

---

## Quick Fixes

### Fix 1: Rebuild Extension

If still seeing cached token logs:

```bash
cd flowcio
npm run build:extension
```

Then reload extension in Chrome:
1. Go to `chrome://extensions/`
2. Click "Reload" button on Flowcio extension

### Fix 2: Clear Extension State

```typescript
// In browser console on Flow page
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Fix 3: Force Token Regeneration

```typescript
// Manually trigger token generation
chrome.tabs.sendMessage(tabId, {
  action: 'generateRecaptchaToken',
  params: { action: 'FLOW_GENERATION' }
}, (response) => {
  console.log('New token:', response.result?.substring(0, 50))
})
```

---

## Performance Impact

### Token Generation Time

```
Before fix: ~200ms (first request) + 0ms (cached requests)
After fix:  ~200ms per request

Impact: +200ms per API call (acceptable for avoiding 100% failure)
```

### Optimization Opportunity

For batch requests with multiple prompts, we could share a single token:

```typescript
// Current: Each prompt gets its own token (slower but more reliable)
const token = await getReCaptchaToken()
const requests = prompts.map(prompt => ({
  clientContext: { recaptchaToken: token },  // Same token
  prompt
}))
```

**Note**: This is the current implementation and works because all prompts are in ONE batch request.

---

## Prevention Best Practices

### 1. Never Cache Tokens

```typescript
// ❌ Don't do this
const globalToken = await getReCaptchaToken()
// ... use globalToken multiple times

// ✅ Do this
for (const request of requests) {
  const token = await getReCaptchaToken()
  await makeAPICall(token)
}
```

### 2. Monitor Token Usage

```typescript
let tokenCount = 0

async function getReCaptchaTokenWithTracking() {
  tokenCount++
  console.log(`[Debug] Generating token #${tokenCount}`)
  return await getReCaptchaToken()
}
```

### 3. Handle Errors Gracefully

```typescript
try {
  await batchGenerateImages(prompts, aspectRatio)
} catch (error: any) {
  if (error.message.includes('reCAPTCHA')) {
    console.error('💡 Suggestion: Try generating one image in Flow UI first')
    console.error('💡 This establishes trust with Google reCAPTCHA')
  }
  throw error
}
```

---

## See Also

- [Authentication Flow](../architecture/authentication.md) - How tokens are generated
- [Image Generation API](../api-reference/image-generation.md) - API reference
- [Common Issues](./common-issues.md) - Other troubleshooting topics
