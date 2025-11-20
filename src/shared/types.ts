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
