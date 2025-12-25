/**
 * Content Script - Runs in isolated context
 * Acts as a bridge between the page and the extension
 */

import { FlowAPIMessage, FlowAPIResponse } from '../shared/types';

// ✅ Double injection guard - prevent running multiple times
// This is important when extension is reloaded or programmatically injected
if ((window as any).__VAIA_CONTENT_SCRIPT_INJECTED__) {
  console.log('[VAIA] Content script already injected, skipping initialization');
  // Exit early - don't throw, just stop execution
} else {
  (window as any).__VAIA_CONTENT_SCRIPT_INJECTED__ = true;
  console.log('[VAIA] Content script loaded');

// Inject the injected script into the page context
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected-script.js');
  script.onload = function () {
    console.log('[VAIA] Injected script inserted');
    // Remove script tag after injection
    script.remove();
  };
  script.onerror = function () {
    console.error('[VAIA] Failed to load injected script');
  };
  (document.head || document.documentElement).appendChild(script);
}

// Wait for DOM to be ready before injecting (important for document_end timing)
function waitForDOMReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
    } else {
      // DOM already ready
      resolve();
    }
  });
}

// Initialize content script
async function initialize() {
  await waitForDOMReady();

  // Additional safety: wait a bit for Flow's scripts to load
  // Flow loads grecaptcha and other dynamic content
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('[VAIA] DOM ready, injecting script...');
  injectScript();
}

// Start initialization
initialize();

// Message queue for pending responses
const pendingMessages = new Map<
  string,
  { resolve: (value: any) => void; reject: (error: any) => void }
>();

// Listen for responses from injected script
window.addEventListener('flowExtensionResponse', (event: any) => {
  const { id, requestId, result, error, success, authContext } = event.detail;
  const messageId = id || requestId;
  console.log('[VAIA] Received response:', { id: messageId, success });

  const pending = pendingMessages.get(messageId);
  if (pending) {
    if (success) {
      pending.resolve({ result, authContext });
    } else {
      pending.reject(new Error(error));
    }
    pendingMessages.delete(messageId);
  }
});

// Send command to injected script and wait for response
async function sendCommand(command: string, data?: any, requestId?: string): Promise<any> {
  const id = requestId || crypto.randomUUID();

  return new Promise((resolve, reject) => {
    // Store callbacks
    pendingMessages.set(id, { resolve, reject });

    // Send command
    window.dispatchEvent(
      new CustomEvent('flowExtensionCommand', {
        detail: { id, requestId: id, command, data },
      })
    );

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error('Command timeout'));
      }
    }, 30000);
  });
}

// Listen for messages from extension (side panel/background)
chrome.runtime.onMessage.addListener((message: FlowAPIMessage, sender, sendResponse) => {
  console.log('[VAIA] Received message from extension:', message);

  if (message.type === 'flow_api_call') {
    const { command, data } = message.payload;
    const requestId = message.requestId || crypto.randomUUID();

    // Forward to injected script
    sendCommand(command, data, requestId)
      .then(({ result, authContext }) => {
        console.log('[VAIA] Command success:', result);
        const response: FlowAPIResponse = {
          type: 'flow_api_response',
          payload: {
            requestId,
            success: true,
            result,
            authContext,
          },
        };
        sendResponse(response);
      })
      .catch((error) => {
        console.error('[VAIA] Command error:', error);
        const response: FlowAPIResponse = {
          type: 'flow_api_response',
          payload: {
            requestId,
            success: false,
            error: error.message,
          },
        };
        sendResponse(response);
      });

    // Return true to indicate async response
    return true;
  }

  return false;
});

// Test connection on load
setTimeout(() => {
  sendCommand('testConnection')
    .then(({ result }) => {
      console.log('[VAIA] Connection test successful:', result);
    })
    .catch((error) => {
      console.error('[VAIA] Connection test failed:', error);
    });
}, 1000);

console.log('[VAIA] Content script ready');

} // End of double injection guard
