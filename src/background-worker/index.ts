import { APICallMessage, ResponseMessage, TabDataMessage } from '../shared/types';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: string) => void;
  timeout: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const executeChromAPI = async (
  namespace: string,
  method: string,
  args: unknown[]
): Promise<unknown> => {
  try {
    const namespaceObj = (chrome as any)[namespace];
    if (!namespaceObj) {
      throw new Error(`Chrome API namespace "${namespace}" not found`);
    }

    const methodFn = namespaceObj[method];
    if (typeof methodFn !== 'function') {
      throw new Error(`Method "${method}" not found in chrome.${namespace}`);
    }

    return await new Promise((resolve, reject) => {
      methodFn.apply(namespaceObj, [
        ...args,
        (result: unknown) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        },
      ]);
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log('[Background Worker] Received message:', message);

    if (message.type === 'api_call') {
      const apiMessage = message as APICallMessage;
      const { apiNamespace, apiMethod, args } = apiMessage.payload as {
        apiNamespace: string;
        apiMethod: string;
        args: unknown[];
      };

      executeChromAPI(apiNamespace, apiMethod, args)
        .then((result) => {
          const response: ResponseMessage = {
            type: 'api_response',
            payload: {
              requestId: apiMessage.requestId || generateRequestId(),
              result,
            },
          };
          sendResponse(response);
        })
        .catch((error) => {
          const response: ResponseMessage = {
            type: 'api_response',
            payload: {
              requestId: apiMessage.requestId || generateRequestId(),
              error: error instanceof Error ? error.message : String(error),
            },
          };
          sendResponse(response);
        });

      return true;
    }

    if (message.type === 'get_active_tab') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          const response: TabDataMessage = {
            type: 'tab_data',
            payload: {
              tabId: tab.id,
              url: tab.url,
              title: tab.title,
            },
          };
          sendResponse(response);
        }
      });
      return true;
    }

    return false;
  }
);

type ExtensionMessage = import('../shared/types').ExtensionMessage;
