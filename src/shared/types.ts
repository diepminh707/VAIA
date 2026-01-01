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

export interface FlowMediaHistoryRequest {
  pageSize?: number;        // Number of items per page (default: 18)
  cursor?: string | null;   // Pagination cursor (null for first page)
}

export interface MediaGenerationId {
  mediaType: 'IMAGE';
  workflowId: string;       // UUID - unique workflow identifier
  workflowStepId: string;   // Step identifier (usually 'CAE')
  mediaKey: string;         // UUID - unique media asset key
}

export interface MediaObject {
  name: string;             // Base64-encoded workflow name
  userUploadedImage: {
    aspectRatio: string;    // IMAGE_ASPECT_RATIO_*
  };
  mediaGenerationId: MediaGenerationId;
}

export interface MediaWorkflow {
  name: string;             // Base64-encoded identifier
  media: MediaObject;
  createTime: string;       // ISO 8601 timestamp
}

export interface FlowMediaHistoryResult {
  userWorkflows: MediaWorkflow[];
  status: number;           // HTTP status (200 = success)
  statusText: string;       // 'OK'
}

export interface FlowMediaDetailRequest {
  mediaId: string;          // Media generation ID (format: "CAMa...")
  tool?: string;            // Client context tool (default: 'PINHOLE')
}

export interface FlowMediaDetailResponse {
  image?: string;           // Base64-encoded JPEG image
  mediaGenerationId: string; // Full media generation identifier
  fifeUrl?: string;         // Google Fife CDN URL with signed access
  aspectRatio?: string;     // IMAGE_ASPECT_RATIO_*
  userUploadedImage?: {
    fileUrl: string;        // Direct file URL for display
  };
}

export interface FlowAPIMessage extends ExtensionMessage {
  type: 'flow_api_call';
  payload: {
    command: 'generate_image' | 'generate_video' | 'upload_image' | 'get_auth_status' | 'fetch_media_history' | 'fetch_media_details';
    data: FlowImageGenerateRequest | FlowVideoGenerateRequest | FlowImageUploadRequest | FlowMediaHistoryRequest | FlowMediaDetailRequest | null;
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
