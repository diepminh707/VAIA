import { APICallMessage, ResponseMessage, TabDataMessage, FlowAPIMessage, FlowAPIResponse } from '../shared/types';

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

console.log('[VAIA] Background service worker started');

// Track Flow tab ID
let flowTabId: number | null = null;

// Monitor tab updates to detect Flow page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (tab.url.includes('labs.google.com/fx') || tab.url.includes('labs.google/fx')) {
      console.log('[VAIA] Flow page detected:', tab.url);
      flowTabId = tabId;
    }
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === flowTabId) {
    console.log('[VAIA] Flow tab closed');
    flowTabId = null;
  }
});

// Handle extension install/update - inject into already-open Flow tabs
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[VAIA] Extension event:', details.reason);

  if (details.reason === 'install' || details.reason === 'update') {
    try {
      // Find all open Flow tabs
      const tabs = await chrome.tabs.query({});
      const flowTabs = tabs.filter(tab =>
        tab.url?.includes('labs.google.com/fx') ||
        tab.url?.includes('labs.google/fx')
      );

      console.log('[VAIA] Found', flowTabs.length, 'open Flow tab(s)');

      // Inject content script into each Flow tab
      for (const tab of flowTabs) {
        if (!tab.id) continue;

        try {
          // Inject content script programmatically
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-script.js']
          });
          console.log('[VAIA] ✅ Injected content script into tab', tab.id, tab.url);
        } catch (error: any) {
          console.error('[VAIA] ❌ Failed to inject into tab', tab.id, ':', error.message);
        }
      }

      if (flowTabs.length === 0) {
        console.log('[VAIA] ℹ️ No open Flow tabs found. Extension will inject when Flow page is opened.');
      }
    } catch (error) {
      console.error('[VAIA] Error during install injection:', error);
    }
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log('[VAIA] Background Worker received message:', message);

    // Handle Flow API calls from side panel
    if (message.type === 'flow_api_call') {
      const flowMessage = message as FlowAPIMessage;
      const requestId = flowMessage.requestId || generateRequestId();

      // Find Flow tab - prioritize tracked flowTabId, then search all tabs
      const findFlowTab = async () => {
        // Strategy 1: Use tracked Flow tab ID
        if (flowTabId !== null) {
          try {
            const tab = await chrome.tabs.get(flowTabId);
            if (tab && (tab.url?.includes('labs.google.com/fx') || tab.url?.includes('labs.google/fx'))) {
              console.log('[VAIA] Using tracked Flow tab:', tab.url);
              return tab;
            }
          } catch (e) {
            console.log('[VAIA] Tracked Flow tab no longer valid');
            flowTabId = null;
          }
        }

        // Strategy 2: Query all tabs to find Flow page
        const tabs = await chrome.tabs.query({});
        const flowTab = tabs.find(tab =>
          tab.url?.includes('labs.google.com/fx') || tab.url?.includes('labs.google/fx')
        );

        if (flowTab) {
          console.log('[VAIA] Found Flow tab via query:', flowTab.url);
          flowTabId = flowTab.id || null;
          return flowTab;
        }

        return null;
      };

      findFlowTab().then(flowTab => {
        if (!flowTab || !flowTab.id) {
          const errorResponse: FlowAPIResponse = {
            type: 'flow_api_response',
            payload: {
              requestId,
              success: false,
              error: 'Flow tab not found. Please open https://labs.google.com/fx/tools/flow/ first.',
            },
          };
          sendResponse(errorResponse);
          return;
        }

        // Forward to content script which will communicate with injected script
        chrome.tabs.sendMessage(flowTab.id, flowMessage, (response: FlowAPIResponse) => {
          if (chrome.runtime.lastError) {
            const errorResponse: FlowAPIResponse = {
              type: 'flow_api_response',
              payload: {
                requestId,
                success: false,
                error: `Failed to connect to Flow page: ${chrome.runtime.lastError.message}. Make sure you're on the Flow page.`,
              },
            };
            sendResponse(errorResponse);
          } else {
            sendResponse(response);
          }
        });
      }).catch(error => {
        const errorResponse: FlowAPIResponse = {
          type: 'flow_api_response',
          payload: {
            requestId,
            success: false,
            error: `Error finding Flow tab: ${error.message}`,
          },
        };
        sendResponse(errorResponse);
      });

      return true; // Keep channel open for async response
    }

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

console.log('[VAIA] Background service worker ready');
