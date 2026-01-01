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

// Configure side panel to be tab-specific
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => {
  console.error('[VAIA] Failed to set panel behavior:', error);
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
    console.log('[VAIA] Background Worker received message:', message, 'from sender:', sender);

    // Handle Flow API calls from side panel
    if (message.type === 'flow_api_call') {
      const flowMessage = message as FlowAPIMessage;
      const requestId = flowMessage.requestId || generateRequestId();

      // Find Flow tab - prioritize sender tab and active tab only
      // Use tab IDs for reliable identification, not URLs
      const findFlowTab = async () => {
        // Strategy 1: Use sender's tab ID (most reliable - tab-specific side panel)
        if (sender.tab?.id) {
          try {
            // Get fresh tab data by ID to ensure it's still valid
            const senderTab = await chrome.tabs.get(sender.tab.id);
            if (senderTab.url?.includes('labs.google.com/fx') || senderTab.url?.includes('labs.google/fx')) {
              console.log(`[VAIA] ✅ Using sender tab ID: ${senderTab.id} (${senderTab.url})`);
              return senderTab;
            } else {
              console.log(`[VAIA] ⚠️ Sender tab ID: ${senderTab.id} is not a Flow page`);
            }
          } catch (e) {
            console.log('[VAIA] ⚠️ Sender tab no longer exists');
          }
        }

        // Strategy 2: Use active tab in current window (user's focus)
        try {
          const [activeTab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });

          if (activeTab?.id && (activeTab.url?.includes('labs.google.com/fx') || activeTab.url?.includes('labs.google/fx'))) {
            console.log(`[VAIA] ✅ Using active tab ID: ${activeTab.id} (${activeTab.url})`);
            return activeTab;
          } else if (activeTab) {
            console.log(`[VAIA] ⚠️ Active tab ID: ${activeTab.id} is not a Flow page`);
          }
        } catch (e) {
          console.log('[VAIA] ⚠️ Failed to get active tab:', e);
        }

        // No valid Flow tab found - fail explicitly instead of guessing
        console.warn('[VAIA] ❌ No valid Flow tab found in current context');
        return null;
      };

      findFlowTab().then(flowTab => {
        if (!flowTab || !flowTab.id) {
          const errorResponse: FlowAPIResponse = {
            type: 'flow_api_response',
            payload: {
              requestId,
              success: false,
              error: 'No Flow tab found in current context. Please open the extension side panel from a Flow project page (https://labs.google.com/fx/tools/flow/).',
            },
          };
          sendResponse(errorResponse);
          return;
        }

        console.log(`[VAIA] 📤 Sending message to tab ID: ${flowTab.id}`);


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
