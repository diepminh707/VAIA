interface ChromeExtensionBridge {
  call: (namespace: string, method: string, ...args: unknown[]) => Promise<unknown>;
  onResponse: (callback: (message: any) => void) => void;
  // Flow API methods
  getFlowAuthStatus: () => Promise<any>;
  generateImages: (request: any) => Promise<any>;
  generateVideo: (request: any) => Promise<any>;
  uploadImage: (request: any) => Promise<any>;
}

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: string) => void;
  }
>();

// ========================================
// GOOGLE FLOW API INTEGRATION
// ========================================

const FLOW_API_BASE = 'https://aisandbox-pa.googleapis.com';
const FLOW_RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
const GOOGLE_API_KEY = 'AIzaSyBtrm0o5ab1c-Ec8ZuLcGt3oJAA5VWt3pY';

// Flow authentication context - captured from page
const flowAuthContext = {
  authToken: null as string | null,
  tokenExpires: null as Date | null, // Token expiration from __NEXT_DATA__
  tokenSource: null as 'nextdata' | 'fetch' | null, // Track where token came from
  user: null as any, // User info from __NEXT_DATA__
  sessionId: null as string | null,
  projectId: null as string | null,
  isAuthenticated: false,
  capturedRecaptchaToken: null as string | null,
  recaptchaTokenTimestamp: 0,
  flowActionName: null as string | null, // Action name that Flow uses
};

/**
 * Extract OAuth token from Next.js __NEXT_DATA__ (immediate, no waiting)
 * Flow page embeds server-rendered data including access_token in __NEXT_DATA__ script tag
 */
function extractTokenFromNextData(): {
  token: string | null;
  expires: Date | null;
  user: any | null;
} {
  try {
    // Get the __NEXT_DATA__ script element
    const scriptElement = document.getElementById('__NEXT_DATA__');
    if (!scriptElement?.textContent) {
      console.log('[VAIA] __NEXT_DATA__ script not found');
      return { token: null, expires: null, user: null };
    }

    // Parse the JSON data
    const nextData = JSON.parse(scriptElement.textContent);
    const session = nextData?.props?.pageProps?.session;

    if (!session?.access_token) {
      console.log('[VAIA] No access_token in __NEXT_DATA__ session');
      return { token: null, expires: null, user: null };
    }

    // Extract token and metadata
    const token = session.access_token;
    const expires = session.expires ? new Date(session.expires) : null;
    const user = session.user || null;

    // Check if token is already expired
    if (expires && expires < new Date()) {
      console.warn('[VAIA] ⚠️ Token from __NEXT_DATA__ is expired');
      console.warn('[VAIA] Expired at:', expires);
      return { token: null, expires: null, user: null };
    }

    console.log('[VAIA] ✅ Token extracted from __NEXT_DATA__');
    console.log('[VAIA] Token preview:', token.substring(0, 30) + '...');
    console.log('[VAIA] Expires:', expires);
    console.log('[VAIA] User:', user?.email || 'unknown');

    return { token, expires, user };
  } catch (error) {
    console.error('[VAIA] ❌ Failed to parse __NEXT_DATA__:', error);
    return { token: null, expires: null, user: null };
  }
}

/**
 * Intercept fetch to capture auth tokens and reCAPTCHA tokens
 */
function interceptFetch() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = typeof resource === 'string' ? resource : resource.url;

    // Capture authorization header
    if (config?.headers) {
      const headers = new Headers(config.headers);

      // Capture auth token
      const auth = headers.get('authorization') || headers.get('Authorization');
      if (auth && auth.startsWith('Bearer ')) {
        const newToken = auth.replace('Bearer ', '');

        // Only update if different from current token (avoid spam logs)
        if (newToken !== flowAuthContext.authToken) {
          flowAuthContext.authToken = newToken;
          flowAuthContext.tokenSource = 'fetch';
          flowAuthContext.isAuthenticated = true;
          console.log('[VAIA] 🔄 Token updated from fetch interception');
        }
      }
    }

    // Execute original fetch
    return originalFetch.apply(this, args);
  };

  console.log('[VAIA] ✅ Fetch interceptor installed');
}

// Extract session ID from URL or localStorage
function extractSessionId(): string | null {
  try {
    // Try URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const sessionFromUrl = urlParams.get('session');
    if (sessionFromUrl) return sessionFromUrl;

    // Try localStorage
    const sessionFromStorage = localStorage.getItem('flowSessionId');
    if (sessionFromStorage) return sessionFromStorage;

    // Try to find in page context
    const timestamp = Date.now();
    return `;${timestamp}`;
  } catch (e) {
    console.error('[Flow Bridge] Failed to extract session ID:', e);
    return null;
  }
}

// Extract project ID from URL
function extractProjectId(): string | null {
  try {
    const match = window.location.pathname.match(/\/project\/([a-f0-9-]+)/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('[Flow Bridge] Failed to extract project ID:', e);
    return null;
  }
}

// Get reCAPTCHA token - ALWAYS generate fresh token for each request
async function getReCaptchaToken(fallbackAction: string = 'FLOW_GENERATION'): Promise<string> {
  // ⚠️ IMPORTANT: reCAPTCHA tokens are SINGLE-USE, not time-based!
  // Always generate a new token for each request instead of caching
  console.log('[VAIA] 🔑 Generating new reCAPTCHA token for each request (single-use tokens)');

  // Skip cache check - always generate fresh token
  // Old code cached tokens which caused 403 errors on subsequent requests

  // Wait for grecaptcha to be ready
  const grecaptcha = (window as any).grecaptcha;
  if (!grecaptcha?.enterprise?.execute) {
    console.warn('[VAIA] ⚠️ grecaptcha.enterprise not available');
    console.warn('[VAIA] 💡 Waiting for grecaptcha to load...');

    // Wait up to 5 seconds for grecaptcha to be available
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if ((window as any).grecaptcha?.enterprise?.execute) {
        console.log('[VAIA] ✅ grecaptcha loaded!');
        break;
      }
    }
  }

  // Try to generate reCAPTCHA token
  if ((window as any).grecaptcha?.enterprise?.execute) {
    try {
      // ✅ Use Flow's captured action name if available, otherwise use fallback
      const actionName = flowAuthContext.flowActionName || fallbackAction;

      if (flowAuthContext.flowActionName) {
        console.log(`[VAIA] 🎯 Using Flow's captured action: ${actionName}`);
      } else {
        console.log(`[VAIA] ⚠️ Using fallback action: ${actionName}`);
        console.log('[VAIA] 💡 Tip: Use Flow\'s UI first to capture the correct action name');
      }

      console.log(`[VAIA] 🛡️ Generating new reCAPTCHA token...`);

      const token = await (window as any).grecaptcha.enterprise.execute(FLOW_RECAPTCHA_SITE_KEY, {
        action: actionName
      });

      if (!token) {
        console.error('[VAIA] ❌ grecaptcha.enterprise.execute returned empty token');
        throw new Error('Empty reCAPTCHA token returned');
      }

      // Update context with latest token (for status display only, not for reuse)
      flowAuthContext.capturedRecaptchaToken = token;
      flowAuthContext.recaptchaTokenTimestamp = Date.now();

      console.log('[VAIA] ✅ Successfully generated new reCAPTCHA token');
      console.log(`[VAIA] 🛡️ Token preview: ${token.substring(0, 50)}...`);

      return token;
    } catch (error) {
      console.error('[VAIA] ❌ Failed to generate reCAPTCHA token:', error);
      console.error('[VAIA] 💡 Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  } else {
    console.warn('[VAIA] ⚠️ grecaptcha.enterprise.execute not available after waiting');
    throw new Error('grecaptcha.enterprise not available');
  }
}

// Update Flow auth context from page
function updateFlowAuthContext(): void {
  flowAuthContext.sessionId = extractSessionId();
  flowAuthContext.projectId = extractProjectId();
  // ✅ Authentication works via cookies (credentials: 'include')
  // Auth token is optional - only needed if Flow requires it
  flowAuthContext.isAuthenticated = !!(flowAuthContext.sessionId && flowAuthContext.projectId);
}

// Get current Flow auth status
function getFlowAuthStatus(): any {
  updateFlowAuthContext();

  const hasRecaptchaToken = !!flowAuthContext.capturedRecaptchaToken;
  const recaptchaTokenAge = hasRecaptchaToken
    ? Date.now() - flowAuthContext.recaptchaTokenTimestamp
    : 0;

  return {
    authToken: flowAuthContext.authToken ? '***' + flowAuthContext.authToken.slice(-8) : null,
    sessionId: flowAuthContext.sessionId,
    projectId: flowAuthContext.projectId,
    isAuthenticated: flowAuthContext.isAuthenticated,
    hasRecaptchaToken,
    recaptchaTokenAge: Math.floor(recaptchaTokenAge / 1000), // in seconds (for display only)
    recaptchaTokenValid: hasRecaptchaToken, // Always true if we have any token (for UI status)
    flowActionName: flowAuthContext.flowActionName, // Action name captured from Flow
    singleUseTokens: true, // Tokens are single-use, generated fresh for each request
  };
}

// Call Flow API with proper authentication
// NOTE: Payload must already contain reCAPTCHA token in clientContext
async function callFlowAPI<T>(endpoint: string, payload: any): Promise<T> {
  updateFlowAuthContext();

  const url = `${FLOW_API_BASE}${endpoint}`;
  console.log(`[VAIA] 📤 Calling ${endpoint}`, payload);

  // ✅ Match Flow's exact headers - minimal to avoid CORS preflight
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available (optional - cookies handle auth via credentials: 'include')
  if (flowAuthContext.authToken) {
    headers['Authorization'] = `Bearer ${flowAuthContext.authToken}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    credentials: 'include', // ✅ Include cookies for authentication
    mode: 'cors',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flow API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log(`[VAIA] 📥 Response from ${endpoint}`, data);

  return data;
}

// Image Generation API
async function generateImages(request: any): Promise<any> {
  const { prompts, aspectRatio = 'IMAGE_ASPECT_RATIO_SQUARE', referenceImageIds = [] } = request;

  // Update context
  updateFlowAuthContext();
  // Get reCAPTCHA token (will use Flow's captured action name or fallback)
  const recaptchaToken = await getReCaptchaToken();

  // Build root-level clientContext
  const clientContext = {
    recaptchaToken,
    sessionId: flowAuthContext.sessionId,
  };

  // Build requests array with proper Flow API structure
  const requests = prompts.map((prompt: string) => ({
    clientContext: {
      recaptchaToken,
      sessionId: flowAuthContext.sessionId,
      projectId: flowAuthContext.projectId,
      tool: 'PINHOLE',
    },
    seed: Math.floor(Math.random() * 1000000), // Random seed 0-1000000
    imageModelName: 'GEM_PIX_2', // Imagen 2 model
    imageAspectRatio: aspectRatio, // Must use IMAGE_ASPECT_RATIO_ prefix
    prompt,
    imageInputs: referenceImageIds.length > 0
      ? referenceImageIds.map((mediaId: string) => ({
          name: mediaId,
          imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE',
        }))
      : [],
  }));

  const payload = {
    clientContext,
    requests,
  };

  return callFlowAPI(`/v1/projects/${flowAuthContext.projectId}/flowMedia:batchGenerateImages`, payload);
}

// Video Generation API (Text-to-Video)
async function generateVideoFromText(request: any): Promise<any> {
  const { prompt, model = 'VEO_3_1' } = request;

  updateFlowAuthContext();
  // Get reCAPTCHA token (will use Flow's captured action name or fallback)
  const recaptchaToken = await getReCaptchaToken();

  const payload = {
    clientContext: {
      recaptchaToken,
      sessionId: flowAuthContext.sessionId,
      projectId: flowAuthContext.projectId,
      tool: 'PINHOLE',
    },
    requests: [{
      clientContext: {
        recaptchaToken,
        sessionId: flowAuthContext.sessionId,
        projectId: flowAuthContext.projectId,
      },
      prompt,
      model,
    }],
  };

  return callFlowAPI('/v1/video:batchAsyncGenerateVideoText', payload);
}

// Video Generation API (Image-to-Video)
async function generateVideoFromImage(request: any): Promise<any> {
  const { prompt, startImage, endImage, model = 'VEO_3_1' } = request;

  updateFlowAuthContext();
  // Get reCAPTCHA token (will use Flow's captured action name or fallback)
  const recaptchaToken = await getReCaptchaToken();

  const payload = {
    clientContext: {
      recaptchaToken,
      sessionId: flowAuthContext.sessionId,
      projectId: flowAuthContext.projectId,
      tool: 'PINHOLE',
    },
    requests: [{
      clientContext: {
        recaptchaToken,
        sessionId: flowAuthContext.sessionId,
        projectId: flowAuthContext.projectId,
      },
      prompt,
      startImage: { imageData: startImage },
      endImage: endImage ? { imageData: endImage } : undefined,
      model,
    }],
  };

  return callFlowAPI('/v1/video:batchAsyncGenerateVideoStartAndEndImage', payload);
}

// Image Upload API
async function uploadImage(request: any): Promise<any> {
  const { imageData, mimeType, aspectRatio = 'IMAGE_ASPECT_RATIO_SQUARE' } = request;

  updateFlowAuthContext();

  const payload = {
    imageInput: {
      rawImageBytes: imageData.replace(/^data:image\/[a-z]+;base64,/, ''), // Remove data URL prefix if present
      mimeType,
      isUserUploaded: true,
      aspectRatio,
    },
    clientContext: {
      sessionId: flowAuthContext.sessionId,
    },
  };

  return callFlowAPI('/v1:uploadUserImage', payload);
}

// Media History API - Fetch user's uploaded/generated media
async function fetchMediaHistory(
  pageSize: number = 18,
  cursor: string | null = null
): Promise<any> {
  console.log('[VAIA] 📚 Fetching media history...', { pageSize, cursor });

  // Build tRPC input according to Flow's format
  const input = {
    json: {
      type: 'ASSET_MANAGER',
      pageSize,
      responseScope: 'RESPONSE_SCOPE_UNSPECIFIED',
      cursor
    },
    meta: {
      values: {
        cursor: ['undefined']  // Flow expects this format
      }
    }
  };

  // Encode input for URL (tRPC requirement)
  const encodedInput = encodeURIComponent(JSON.stringify(input));
  const url = `https://labs.google/fx/api/trpc/media.fetchUserHistoryDirectly?input=${encodedInput}`;

  console.log('[VAIA] 📤 Calling tRPC media history endpoint');

  try {
    // Call tRPC endpoint with session cookies
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'content-type': 'application/json'
      },
      credentials: 'include'  // ✅ Include session cookies for authentication
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAIA] ❌ Media history API error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[VAIA] 📥 Received media history response');

    // Extract workflows from deeply nested tRPC response structure
    const result = data?.result?.data?.json?.result;

    if (!result || !Array.isArray(result.userWorkflows)) {
      console.error('[VAIA] ❌ Invalid response structure:', data);
      throw new Error('Invalid response structure from media history API');
    }

    console.log(`[VAIA] ✅ Found ${result.userWorkflows.length} media items`);

    return {
      userWorkflows: result.userWorkflows,
      status: data.result?.data?.json?.status || 200,
      statusText: data.result?.data?.json?.statusText || 'OK'
    };
  } catch (error) {
    console.error('[VAIA] ❌ Failed to fetch media history:', error);
    throw error;
  }
}

/**
 * Fetch detailed media information by media ID
 * @param mediaId - Media generation ID (e.g., "CAMaJD...")
 * @param tool - Client context tool (default: 'PINHOLE')
 */
async function fetchMediaDetails(
  mediaId: string,
  tool: string = 'PINHOLE'
): Promise<any> {
  console.log('[VAIA] 🔍 Fetching media details...', { mediaId, tool });

  // Build URL with Google API key
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    'clientContext.tool': tool
  });

  const url = `${FLOW_API_BASE}/v1/media/${encodeURIComponent(mediaId)}?${params.toString()}`;
  console.log('[VAIA] 📤 Calling media details API');

  // Build headers with Authorization token
  const headers: Record<string, string> = {
    'accept': '*/*'
  };

  // Add Authorization header if we have a token
  if (flowAuthContext.authToken) {
    headers['Authorization'] = `Bearer ${flowAuthContext.authToken}`;
    console.log('[VAIA] 🔑 Using Authorization token');
  } else {
    console.warn('[VAIA] ⚠️ No auth token available for media details request');
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VAIA] ❌ Media details API error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[VAIA] 📥 Received media details response');
    console.log('[VAIA] ✅ Media details fetched successfully');

    return data;
  } catch (error) {
    console.error('[VAIA] ❌ Failed to fetch media details:', error);
    throw error;
  }
}

// Main video generation router
async function generateVideo(request: any): Promise<any> {
  const { type } = request;

  switch (type) {
    case 'text-to-video':
      return generateVideoFromText(request);
    case 'image-to-video':
      return generateVideoFromImage(request);
    default:
      throw new Error(`Unsupported video generation type: ${type}`);
  }
}

// Intercept grecaptcha.enterprise.execute to learn Flow's action name
function interceptGrecaptcha() {
  const checkGrecaptcha = () => {
    const grecaptcha = (window as any).grecaptcha;
    if (grecaptcha?.enterprise?.execute) {
      const originalExecute = grecaptcha.enterprise.execute;

      grecaptcha.enterprise.execute = async function(siteKey: string, options?: any) {
        console.log('[VAIA] 🎯 Flow calling grecaptcha.enterprise.execute()');
        console.log('[VAIA] 🔑 Site key:', siteKey);
        console.log('[VAIA] ⚙️ Options:', options);

        // Capture action name from Flow's call
        if (options?.action && !flowAuthContext.flowActionName) {
          flowAuthContext.flowActionName = options.action;
          console.log('[VAIA] ✅ Captured Flow action name:', options.action);
        }

        // Call original execute
        const token = await originalExecute.call(this, siteKey, options);

        // Capture the generated token
        if (token && token.length > 50) {
          flowAuthContext.capturedRecaptchaToken = token;
          flowAuthContext.recaptchaTokenTimestamp = Date.now();
          console.log('[VAIA] 🛡️ reCAPTCHA token captured from Flow');
        }

        return token;
      };

      console.log('[VAIA] ✅ grecaptcha.enterprise.execute intercepted');
      return true;
    }
    return false;
  };

  // Try immediately
  if (!checkGrecaptcha()) {
    // Retry every 500ms for up to 10 seconds
    const interval = setInterval(() => {
      if (checkGrecaptcha()) {
        clearInterval(interval);
      }
    }, 500);

    setTimeout(() => clearInterval(interval), 10000);
  }
}

// Initialize Flow context on page load
function initializeContext() {
  flowAuthContext.sessionId = extractSessionId();
  flowAuthContext.projectId = extractProjectId();
  flowAuthContext.initialized = true;

  console.log('[VAIA] 📋 Context initialized:', {
    sessionId: flowAuthContext.sessionId,
    projectId: flowAuthContext.projectId,
    url: window.location.href,
  });
}

// Wait for Flow page to be fully ready before initializing
function waitForFlowReady(): Promise<void> {
  return new Promise((resolve) => {
    // Check if we're on a Flow page with projectId in URL
    const checkReady = () => {
      const hasProjectId = window.location.pathname.includes('/project/');
      const domReady = document.readyState === 'complete' || document.readyState === 'interactive';

      if (hasProjectId && domReady) {
        console.log('[VAIA] ✅ Flow page ready');
        resolve();
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkReady()) return;

    // Wait for page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (checkReady()) return;

        // Additional wait for SPA navigation
        setTimeout(() => {
          checkReady();
          resolve(); // Resolve anyway after timeout
        }, 1000);
      }, { once: true });
    } else {
      // DOM already ready, wait a bit for SPA
      setTimeout(() => {
        checkReady();
        resolve();
      }, 500);
    }
  });
}

// Initialize extension
async function initializeExtension() {
  console.log('[VAIA] 🚀 Injected script initializing...');

  // Wait for Flow page to be ready
  await waitForFlowReady();

  // ✅ PRIORITY 1: Try to extract token from __NEXT_DATA__ (immediate, no waiting)
  const { token, expires, user } = extractTokenFromNextData();
  if (token) {
    flowAuthContext.authToken = token;
    flowAuthContext.tokenExpires = expires;
    flowAuthContext.tokenSource = 'nextdata';
    flowAuthContext.user = user;
    flowAuthContext.isAuthenticated = true;
    console.log('[VAIA] 🎯 Using token from __NEXT_DATA__ (source: nextdata)');
  } else {
    console.log('[VAIA] ⏳ No token in __NEXT_DATA__, will capture from fetch requests');
  }

  // ✅ PRIORITY 2: Set up fetch interceptor (backup + captures token refreshes)
  interceptFetch();

  // Intercept grecaptcha to see what Flow uses
  interceptGrecaptcha();

  // Initialize context (sessionId, projectId)
  initializeContext();

  // Re-check context AND __NEXT_DATA__ when URL changes (SPA navigation)
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[VAIA] 🔄 URL changed, re-initializing...');

      // Try to get fresh token from __NEXT_DATA__ on navigation
      const { token, expires, user } = extractTokenFromNextData();
      if (token) {
        flowAuthContext.authToken = token;
        flowAuthContext.tokenExpires = expires;
        flowAuthContext.tokenSource = 'nextdata';
        flowAuthContext.user = user;
        flowAuthContext.isAuthenticated = true;
        console.log('[VAIA] 🔄 Token refreshed from __NEXT_DATA__ after navigation');
      }

      initializeContext();
    }
  }, 1000);

  console.log('[VAIA] ✨ Ready to receive commands');
  console.log('[VAIA] 🔑 Token source:', flowAuthContext.tokenSource || 'none yet');
}

// Start initialization
initializeExtension();

// Create the bridge object exposed to web pages (legacy support)
const extensionBridge: ChromeExtensionBridge = {
  call: (namespace: string, method: string, ...args: unknown[]): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();

      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Extension API call timeout'));
      }, 5000);

      pendingRequests.set(requestId, { resolve, reject });

      window.postMessage(
        {
          type: 'extension_api_call',
          namespace,
          method,
          args,
          requestId,
        },
        '*'
      );
    });
  },

  onResponse: (callback: (message: any) => void) => {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === 'extension_api_response') {
        callback(event.data);
      }
    });
  },

  // Flow API methods exposed to extension
  getFlowAuthStatus: (): Promise<any> => {
    return Promise.resolve(getFlowAuthStatus());
  },

  generateImages: (request: any): Promise<any> => {
    return generateImages(request);
  },

  generateVideo: (request: any): Promise<any> => {
    return generateVideo(request);
  },

  uploadImage: (request: any): Promise<any> => {
    return uploadImage(request);
  },
};

// Listen for responses from the content script
window.addEventListener(
  'message',
  (event: MessageEvent) => {
    if (event.source !== window) return;

    if (event.data.type === 'extension_api_response') {
      const { requestId, result, error } = event.data;
      const pending = pendingRequests.get(requestId);

      if (pending) {
        if (error) {
          pending.reject(error);
        } else {
          pending.resolve(result);
        }
        pendingRequests.delete(requestId);
      }
    }
  },
  false
);

// Expose the bridge to the web page
(window as any).__chromeExtensionBridge = extensionBridge;

// Listen for Flow API commands from content script (via custom DOM events)
window.addEventListener('flowExtensionCommand', async (event: Event) => {
  const customEvent = event as CustomEvent;
  const { command, data, requestId } = customEvent.detail;

  try {
    let result;
    let authContext;

    switch (command) {
      case 'testConnection':
        // ✅ Try to refresh token from __NEXT_DATA__ on manual refresh
        console.log('[VAIA] 🔄 Refresh requested, checking __NEXT_DATA__ for fresh token...');
        const { token: freshToken, expires: freshExpires, user: freshUser } = extractTokenFromNextData();

        if (freshToken) {
          // Update token if we got a fresh one
          if (freshToken !== flowAuthContext.authToken) {
            flowAuthContext.authToken = freshToken;
            flowAuthContext.tokenExpires = freshExpires;
            flowAuthContext.tokenSource = 'nextdata';
            flowAuthContext.user = freshUser;
            flowAuthContext.isAuthenticated = true;
            console.log('[VAIA] ✅ Token refreshed from __NEXT_DATA__ (manual refresh)');
          } else {
            console.log('[VAIA] ℹ️ Token unchanged (same as current)');
          }
        } else {
          console.log('[VAIA] ⚠️ No token found in __NEXT_DATA__, keeping current token');
        }

        // Update context (sessionId, projectId)
        updateFlowAuthContext();

        result = {
          connected: true,
          url: window.location.href,
          initialized: flowAuthContext.initialized,
          hasAuth: !!flowAuthContext.authToken,
          tokenSource: flowAuthContext.tokenSource,
          tokenExpires: flowAuthContext.tokenExpires,
          user: flowAuthContext.user,
          hasRecaptcha: !!flowAuthContext.capturedRecaptchaToken,
          recaptchaAge: flowAuthContext.recaptchaTokenTimestamp
            ? Math.floor((Date.now() - flowAuthContext.recaptchaTokenTimestamp) / 1000)
            : null,
          sessionId: flowAuthContext.sessionId,
          projectId: flowAuthContext.projectId,
          flowActionName: flowAuthContext.flowActionName,
        };
        authContext = getFlowAuthStatus();
        break;

      case 'get_auth_status':
        result = getFlowAuthStatus();
        authContext = result;
        break;

      case 'generate_image':
        result = await generateImages(data);
        authContext = getFlowAuthStatus();
        break;

      case 'generate_video':
        result = await generateVideo(data);
        authContext = getFlowAuthStatus();
        break;

      case 'upload_image':
        result = await uploadImage(data);
        authContext = getFlowAuthStatus();
        break;

      case 'fetch_media_history':
        const { pageSize = 18, cursor = null } = (data as any) || {};
        result = await fetchMediaHistory(pageSize, cursor);
        authContext = getFlowAuthStatus();
        break;

      case 'fetch_media_details':
        const { mediaId, tool = 'PINHOLE' } = (data as any) || {};
        if (!mediaId) {
          throw new Error('mediaId is required for fetch_media_details');
        }
        result = await fetchMediaDetails(mediaId, tool);
        authContext = getFlowAuthStatus();
        break;

      default:
        throw new Error(`Unknown Flow command: ${command}`);
    }

    // Send success response
    const responseEvent = new CustomEvent('flowExtensionResponse', {
      detail: {
        requestId,
        success: true,
        result,
        authContext,
      },
    });
    window.dispatchEvent(responseEvent);
  } catch (error) {
    // Send error response
    const responseEvent = new CustomEvent('flowExtensionResponse', {
      detail: {
        requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        authContext: getFlowAuthStatus(),
      },
    });
    window.dispatchEvent(responseEvent);
  }
});

console.log('[VAIA] 🚀 Injected script initialized in Flow page context');
