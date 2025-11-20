export interface ExtensionMessage {
  type: string;
  payload?: unknown;
  requestId?: string;
  tabId?: number;
}

export interface APICallMessage extends ExtensionMessage {
  type: 'api_call';
  payload: {
    apiNamespace: string;
    apiMethod: string;
    args: unknown[];
  };
}

export interface ResponseMessage extends ExtensionMessage {
  type: 'api_response';
  payload: {
    requestId: string;
    result?: unknown;
    error?: string;
  };
}

export interface StatusMessage extends ExtensionMessage {
  type: 'extension_status';
  payload: {
    active: boolean;
    message: string;
  };
}

export interface TabDataMessage extends ExtensionMessage {
  type: 'tab_data';
  payload: {
    tabId?: number;
    url?: string;
    title?: string;
  };
}

export interface GenerateImageRequest {
  apiKey: string;
  images: string[]; // Base64 encoded images or URLs
  prompt: string;
  aspectRatio: string; // e.g., "16:9", "1:1", "9:16"
}

export interface GenerateImageResponse {
  success: boolean;
  imageData?: string; // Base64 encoded generated image
  mimeType?: string;
  error?: string;
}

export interface GoogleGenAIMessage extends ExtensionMessage {
  type: 'googlegenai_generate_image';
  payload: GenerateImageRequest;
}

export interface GoogleGenAIResponseMessage extends ExtensionMessage {
  type: 'googlegenai_response';
  payload: GenerateImageResponse & {
    requestId: string;
  };
}
