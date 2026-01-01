import type { FlowAPIMessage, FlowAPIResponse } from '../shared/types';

/**
 * Flow API Service
 * Handles all communication with the Flow API through Chrome extension messaging
 */

export interface ConnectionStatus {
  connected: boolean;
  url?: string;
  initialized?: boolean;
  hasAuth?: boolean;
  tokenSource?: 'nextdata' | 'fetch' | null;
  tokenExpires?: string | null;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  } | null;
  hasRecaptcha?: boolean;
  sessionId?: string;
  projectId?: string;
}

export interface ImageGenerationParams {
  prompts: string[];
  aspectRatio: string;
  referenceImageIds?: string[];
  systemPromptId?: string; // Optional system prompt template ID
}

export interface VideoGenerationParams {
  type: 'text-to-video' | 'image-to-video';
  prompt: string;
  model: string;
}

export interface ImageUploadParams {
  imageData: string;
  mimeType: string;
  aspectRatio?: string;
}

export interface ImageUploadResponse {
  mediaGenerationId: {
    mediaGenerationId: string;
  };
  width: number;
  height: number;
}

export interface MediaHistoryParams {
  pageSize?: number;
  cursor?: string | null;
}

export interface MediaWorkflow {
  name: string;
  media: {
    name: string;
    userUploadedImage: {
      aspectRatio: string;
    };
    mediaGenerationId: {
      mediaType: 'IMAGE';
      workflowId: string;
      workflowStepId: string;
      mediaKey: string;
    };
  };
  createTime: string;
}

export interface MediaHistoryResult {
  userWorkflows: MediaWorkflow[];
  status: number;
  statusText: string;
}

export interface MediaDetailParams {
  mediaId: string;
  tool?: string;
}

export interface MediaDetailResponse {
  image?: string;
  mediaGenerationId: string;
  fifeUrl?: string;
  aspectRatio?: string;
  userUploadedImage?: {
    fifeUrl: string;
  };
}

/**
 * Core API call function
 * Sends a message to the background worker and waits for response
 */
export const callFlowAPI = async (command: string, data: any = null): Promise<any> => {
  return new Promise((resolve, reject) => {
    const message: FlowAPIMessage = {
      type: 'flow_api_call',
      payload: { command: command as any, data },
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    chrome.runtime.sendMessage(message, (response: FlowAPIResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response.payload.success) {
        resolve(response.payload.result);
      } else {
        reject(new Error(response.payload.error || 'Unknown error'));
      }
    });
  });
};

/**
 * Test connection to Flow and get current status
 */
export const testConnection = async (): Promise<ConnectionStatus> => {
  return await callFlowAPI('testConnection');
};

/**
 * Generate images from prompts
 */
export const generateImages = async (params: ImageGenerationParams): Promise<any> => {
  return await callFlowAPI('generate_image', {
    prompts: params.prompts,
    aspectRatio: params.aspectRatio,
    referenceImageIds: params.referenceImageIds || [],
  });
};

/**
 * Generate video from prompt
 */
export const generateVideo = async (params: VideoGenerationParams): Promise<any> => {
  return await callFlowAPI('generate_video', {
    type: params.type,
    prompt: params.prompt,
    model: params.model,
  });
};

/**
 * Upload image and get media ID for use in generation
 * @returns The mediaGenerationId string to use in imageInputs
 */
export const uploadImage = async (params: ImageUploadParams): Promise<string> => {
  const response: ImageUploadResponse = await callFlowAPI('upload_image', {
    imageData: params.imageData,
    mimeType: params.mimeType,
    aspectRatio: params.aspectRatio || 'IMAGE_ASPECT_RATIO_SQUARE',
  });

  // Extract the nested mediaGenerationId
  return response.mediaGenerationId.mediaGenerationId;
};

/**
 * Fetch user's media history (uploaded/generated images)
 */
export const fetchMediaHistory = async (params?: MediaHistoryParams): Promise<MediaHistoryResult> => {
  return await callFlowAPI('fetch_media_history', {
    pageSize: params?.pageSize || 18,
    cursor: params?.cursor || null,
  });
};

/**
 * Fetch detailed media information by media ID
 * Returns fileUrl, base64 image, and other media metadata
 */
export const fetchMediaDetails = async (params: MediaDetailParams): Promise<MediaDetailResponse> => {
  return await callFlowAPI('fetch_media_details', {
    mediaId: params.mediaId,
    tool: params.tool || 'PINHOLE',
  });
};

/**
 * Refresh the Flow tab to show updated content
 * Useful after image/video generation to see results in Flow UI
 */
export const refreshFlowTab = async (): Promise<void> => {
  return await callFlowAPI('refresh_flow_tab');
};

/**
 * Flow API Service class for managing connections and requests
 */
export class FlowApiService {
  private static instance: FlowApiService;
  private connectionStatus: ConnectionStatus | null = null;

  private constructor() {}

  static getInstance(): FlowApiService {
    if (!FlowApiService.instance) {
      FlowApiService.instance = new FlowApiService();
    }
    return FlowApiService.instance;
  }

  async checkConnection(): Promise<ConnectionStatus> {
    try {
      const status = await testConnection();
      this.connectionStatus = status;
      return status;
    } catch (error) {
      this.connectionStatus = null;
      throw error;
    }
  }

  getConnectionStatus(): ConnectionStatus | null {
    return this.connectionStatus;
  }

  async generateImages(params: ImageGenerationParams): Promise<any> {
    return await generateImages(params);
  }

  async generateVideo(params: VideoGenerationParams): Promise<any> {
    return await generateVideo(params);
  }

  async uploadImage(params: ImageUploadParams): Promise<string> {
    return await uploadImage(params);
  }

  async fetchMediaHistory(params?: MediaHistoryParams): Promise<MediaHistoryResult> {
    return await fetchMediaHistory(params);
  }

  async fetchMediaDetails(params: MediaDetailParams): Promise<MediaDetailResponse> {
    return await fetchMediaDetails(params);
  }

  async refreshFlowTab(): Promise<void> {
    return await refreshFlowTab();
  }
}

// Export singleton instance
export const flowApiService = FlowApiService.getInstance();
