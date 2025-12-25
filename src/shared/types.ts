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

// Google Flow API Integration Types

export interface FlowAuthContext {
  authToken: string | null;  // OAuth bearer token captured from Flow
  sessionId: string | null;  // Session ID from URL/localStorage
  projectId: string | null;  // Project UUID from URL
  isAuthenticated: boolean;
}

export interface FlowImageGenerateRequest {
  prompts: string[];  // Max 4 prompts per batch
  aspectRatio?: 'IMAGE_ASPECT_RATIO_SQUARE' | 'IMAGE_ASPECT_RATIO_LANDSCAPE' | 'IMAGE_ASPECT_RATIO_PORTRAIT' | 'IMAGE_ASPECT_RATIO_ULTRA_WIDE' | 'IMAGE_ASPECT_RATIO_4_3' | 'IMAGE_ASPECT_RATIO_3_2';
  referenceImageIds?: string[];  // Media IDs from upload API
}

export interface FlowVideoGenerateRequest {
  type: 'text-to-video' | 'image-to-video' | 'extend-video' | 'reshoot-video';
  prompt?: string;
  model?: 'VEO_3_1' | 'VEO_3_1_FAST';
  startImage?: string;  // Base64 for image-to-video
  endImage?: string;
  videoUrl?: string;  // For extend/reshoot operations
  extendDirection?: 'forward' | 'backward';
  motionControls?: {
    pan?: number;
    tilt?: number;
    roll?: number;
    zoom?: number;
  };
}

export interface FlowImageUploadRequest {
  imageData: string;  // Base64 encoded image (with or without data URL prefix)
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  aspectRatio?: string;  // Aspect ratio for uploaded image
}

export interface FlowAPIMessage extends ExtensionMessage {
  type: 'flow_api_call';
  payload: {
    command: 'generate_image' | 'generate_video' | 'upload_image' | 'get_auth_status';
    data: FlowImageGenerateRequest | FlowVideoGenerateRequest | FlowImageUploadRequest | null;
  };
}

export interface FlowAPIResponse extends ExtensionMessage {
  type: 'flow_api_response';
  payload: {
    requestId: string;
    success: boolean;
    result?: unknown;
    error?: string;
    authContext?: FlowAuthContext;
  };
}
