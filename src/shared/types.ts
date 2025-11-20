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

// GoogleGenAI Extension Bridge Types
export interface GoogleGenAIBridgeMessage extends ExtensionMessage {
  type: 'googlegenai_execute';
  payload: {
    serializedInstance: string;
    command: GoogleGenAICommand;
  };
}

export interface GoogleGenAICommand {
  type: 'generateImage' | 'generateContent' | 'generateText';
  payload: {
    images?: string[];
    prompt: string;
    aspectRatio?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface GoogleGenAIResponseMessage extends ExtensionMessage {
  type: 'googlegenai_response';
  payload: {
    requestId: string;
    result?: unknown;
    error?: string;
  };
}
