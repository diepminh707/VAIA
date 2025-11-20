import { APICallMessage, ResponseMessage, TabDataMessage, GoogleGenAIBridgeMessage, GoogleGenAIResponseMessage, GoogleGenAICommand } from '../shared/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: string) => void;
  timeout: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();

const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// GoogleGenAI Command Handler - executes with serialized instance from web app
const handleGoogleGenAICommand = async (command: GoogleGenAICommand, serializedInstance: string): Promise<unknown> => {
  try {
    // Reconstruct GoogleGenAI instance from serialized data
    const genAI = reconstructGoogleGenAI(serializedInstance);
    
    switch (command.type) {
      case 'generateImage':
        return await generateImage(genAI, command.payload);
      case 'generateContent':
        return await generateContent(genAI, command.payload);
      case 'generateText':
        return await generateText(genAI, command.payload);
      default:
        throw new Error(`Unknown command type: ${(command as any).type}`);
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// Reconstruct GoogleGenAI instance from serialized data
const reconstructGoogleGenAI = (serializedInstance: string): GoogleGenerativeAI => {
  try {
    // Parse the serialized instance data
    const instanceData = JSON.parse(serializedInstance);
    
    // Reconstruct the GoogleGenerativeAI instance
    // Note: We only need the API key from the web app
    return new GoogleGenerativeAI(instanceData.apiKey);
  } catch (error) {
    throw new Error('Failed to reconstruct GoogleGenAI instance from web app data');
  }
};

const generateImage = async (genAI: GoogleGenerativeAI, payload: GoogleGenAICommand['payload']): Promise<unknown> => {
  const { images = [], prompt, aspectRatio = '16:9', model = 'gemini-2.0-flash-exp-image-generation' } = payload;
  
  const modelInstance = genAI.getGenerativeModel({ model });
  
  const parts: any[] = [{ text: prompt }];
  
  if (images.length > 0) {
    for (const imageData of images) {
      parts.push({
        inlineData: {
          data: imageData,
          mimeType: 'image/png'
        }
      });
    }
  }
  
  const response = await modelInstance.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      candidateCount: 1,
    },
  });
  
  const result = response.response;
  const candidates = result.candidates || [];
  
  const generatedImages: string[] = [];
  const generatedText: string[] = [];
  
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        generatedImages.push(part.inlineData.data);
      } else if (part.text) {
        generatedText.push(part.text);
      }
    }
  }
  
  return {
    images: generatedImages,
    text: generatedText.join('\n'),
    success: true
  };
};

const generateContent = async (genAI: GoogleGenerativeAI, payload: GoogleGenAICommand['payload']): Promise<unknown> => {
  const { images = [], prompt, model = 'gemini-1.5-flash', temperature = 0.7, maxTokens = 1024 } = payload;
  
  const modelInstance = genAI.getGenerativeModel({ model });
  
  const parts: any[] = [{ text: prompt }];
  
  if (images.length > 0) {
    for (const imageData of images) {
      parts.push({
        inlineData: {
          data: imageData,
          mimeType: 'image/png'
        }
      });
    }
  }
  
  const response = await modelInstance.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      candidateCount: 1,
    },
  });
  
  return {
    text: response.response.text(),
    success: true
  };
};

const generateText = async (genAI: GoogleGenerativeAI, payload: GoogleGenAICommand['payload']): Promise<unknown> => {
  const { prompt, model = 'gemini-1.5-flash', temperature = 0.7, maxTokens = 1024 } = payload;
  
  const modelInstance = genAI.getGenerativeModel({ model });
  
  const response = await modelInstance.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      candidateCount: 1,
    },
  });
  
  return {
    text: response.response.text(),
    success: true
  };
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

    if (message.type === 'googlegenai_execute') {
      const genaiMessage = message as GoogleGenAIBridgeMessage;
      const { serializedInstance, command } = genaiMessage.payload;
      const requestId = genaiMessage.requestId || generateRequestId();

      handleGoogleGenAICommand(command, serializedInstance)
        .then((result) => {
          const response: GoogleGenAIResponseMessage = {
            type: 'googlegenai_response',
            payload: {
              requestId,
              result,
            },
          };
          sendResponse(response);
        })
        .catch((error) => {
          const response: GoogleGenAIResponseMessage = {
            type: 'googlegenai_response',
            payload: {
              requestId,
              error: error instanceof Error ? error.message : String(error),
            },
          };
          sendResponse(response);
        });

      return true;
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
