import { 
  APICallMessage, 
  ResponseMessage, 
  TabDataMessage,
  GoogleGenAIMessage,
  GoogleGenAIResponseMessage,
  GenerateImageRequest,
  GenerateImageResponse
} from '../shared/types';
import { GoogleGenAI } from '@google/genai';

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

const validateGenerateImageRequest = (request: GenerateImageRequest): void => {
  if (!request.apiKey || typeof request.apiKey !== 'string') {
    throw new Error('API key is required and must be a string');
  }
  if (!request.prompt || typeof request.prompt !== 'string') {
    throw new Error('Prompt is required and must be a string');
  }
  if (!Array.isArray(request.images)) {
    throw new Error('Images must be an array');
  }
  if (!request.aspectRatio || typeof request.aspectRatio !== 'string') {
    throw new Error('Aspect ratio is required and must be a string');
  }
};

const generateImageWithGoogleAI = async (
  request: GenerateImageRequest
): Promise<GenerateImageResponse> => {
  try {
    validateGenerateImageRequest(request);

    const ai = new GoogleGenAI({ apiKey: request.apiKey });

    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    parts.push({ text: request.prompt });

    for (const imageData of request.images) {
      if (!imageData) continue;

      let base64Data = imageData;
      let mimeType = 'image/jpeg';

      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts },
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: request.aspectRatio,
        },
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('No candidates returned from the API');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('No content parts in the response');
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          success: true,
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/jpeg',
        };
      }
    }

    throw new Error('No image data found in the response');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
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

    if (message.type === 'googlegenai_generate_image') {
      const googleGenAIMessage = message as GoogleGenAIMessage;
      const request = googleGenAIMessage.payload;

      generateImageWithGoogleAI(request)
        .then((result) => {
          const response: GoogleGenAIResponseMessage = {
            type: 'googlegenai_response',
            payload: {
              ...result,
              requestId: googleGenAIMessage.requestId || generateRequestId(),
            },
          };
          sendResponse(response);
        })
        .catch((error) => {
          const response: GoogleGenAIResponseMessage = {
            type: 'googlegenai_response',
            payload: {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              requestId: googleGenAIMessage.requestId || generateRequestId(),
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
