interface ChromeExtensionBridge {
  call: (namespace: string, method: string, ...args: unknown[]) => Promise<unknown>;
  execute: (apiKey: string, command: any) => Promise<unknown>;
  onResponse: (callback: (message: any) => void) => void;
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

// Create the bridge object exposed to web pages
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

  execute: (apiKey: string, command: any): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();

      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('GoogleGenAI execution timeout'));
      }, 30000); // Longer timeout for AI operations

      pendingRequests.set(requestId, { resolve, reject });

      window.postMessage(
        {
          type: 'googlegenai_execute',
          apiKey,
          command,
          requestId,
        },
        '*'
      );
    });
  },

  onResponse: (callback: (message: any) => void) => {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data.type === 'extension_api_response' || event.data.type === 'googlegenai_response') {
        callback(event.data);
      }
    });
  },
};

// Listen for responses from the content script
window.addEventListener(
  'message',
  (event: MessageEvent) => {
    if (event.source !== window) return;

    if (event.data.type === 'extension_api_response' || event.data.type === 'googlegenai_response') {
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

console.log('[Injected Script] Chrome Extension Bridge is available at window.__chromeExtensionBridge');
