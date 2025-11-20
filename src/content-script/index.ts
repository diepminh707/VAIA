import { APICallMessage, ResponseMessage, GoogleGenAIBridgeMessage, GoogleGenAIResponseMessage } from '../shared/types';

interface PendingResponse {
  resolve: (value: unknown) => void;
  reject: (error: string) => void;
  timeout: NodeJS.Timeout;
}

const pendingResponses = new Map<string, PendingResponse>();

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Listen for messages from the injected script
window.addEventListener(
  'message',
  (event: MessageEvent) => {
    if (event.source !== window) return;

    const message = event.data;

    if (message.type === 'extension_api_call') {
      const requestId = generateRequestId();

      const apiMessage: APICallMessage = {
        type: 'api_call',
        payload: {
          apiNamespace: message.namespace,
          apiMethod: message.method,
          args: message.args || [],
        },
        requestId,
      };

      chrome.runtime.sendMessage(apiMessage, (response: ResponseMessage) => {
        const resultMessage = {
          type: 'extension_api_response',
          requestId,
          result: (response.payload as any)?.result,
          error: (response.payload as any)?.error,
        };

        window.postMessage(resultMessage, '*');

        const pending = pendingResponses.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingResponses.delete(requestId);
        }
      });
    }

    if (message.type === 'googlegenai_execute') {
      const requestId = generateRequestId();

      const genaiMessage: GoogleGenAIBridgeMessage = {
        type: 'googlegenai_execute',
        payload: {
          apiKey: message.apiKey,
          command: message.command,
        },
        requestId,
      };

      chrome.runtime.sendMessage(genaiMessage, (response: GoogleGenAIResponseMessage) => {
        const resultMessage = {
          type: 'googlegenai_response',
          requestId,
          result: (response.payload as any)?.result,
          error: (response.payload as any)?.error,
        };

        window.postMessage(resultMessage, '*');

        const pending = pendingResponses.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pendingResponses.delete(requestId);
        }
      });
    }
  },
  false
);

// Inject a script that can access window.chrome APIs
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected-script.js');
script.onload = () => {
  script.remove();
};
(document.head || document.documentElement).appendChild(script);

console.log('[Content Script] Initialized');
