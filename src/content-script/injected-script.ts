interface ChromeExtensionBridge {
  call: (namespace: string, method: string, ...args: unknown[]) => Promise<unknown>;
  execute: (googleGenAI: any, command: any) => Promise<unknown>;
  onResponse: (callback: (message: any) => void) => void;
}

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Serialize GoogleGenAI instance for transmission to extension
const serializeGoogleGenAI = (googleGenAI: any): string => {
  try {
    // Extract the API key from the GoogleGenAI instance
    // Note: This is a simplified approach - in practice, you might need to
    // extract more configuration data depending on your use case
    const apiKey = googleGenAI.apiKey || extractApiKeyFromInstance(googleGenAI);
    
    if (!apiKey) {
      throw new Error('Unable to extract API key from GoogleGenAI instance');
    }
    
    return JSON.stringify({
      apiKey,
      // Add any other configuration needed for reconstruction
      timestamp: Date.now()
    });
  } catch (error) {
    throw new Error(`Failed to serialize GoogleGenAI instance: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Helper function to extract API key from various instance formats
const extractApiKeyFromInstance = (instance: any): string | null => {
  // Try different approaches to extract the API key
  if (instance.apiKey) return instance.apiKey;
  if (instance._apiKey) return instance._apiKey;
  if (instance.constructor && instance.constructor.apiKey) return instance.constructor.apiKey;
  
  // If the instance has a prototype chain, try to find the key there
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    if (proto.apiKey) return proto.apiKey;
    if (proto._apiKey) return proto._apiKey;
    proto = Object.getPrototypeOf(proto);
  }
  
  return null;
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

  execute: (googleGenAI: any, command: any): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();

      const timeout = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('GoogleGenAI execution timeout'));
      }, 30000); // Longer timeout for AI operations

      pendingRequests.set(requestId, { resolve, reject });

      // Serialize the GoogleGenAI instance
      const serializedInstance = serializeGoogleGenAI(googleGenAI);

      window.postMessage(
        {
          type: 'googlegenai_execute',
          serializedInstance,
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
