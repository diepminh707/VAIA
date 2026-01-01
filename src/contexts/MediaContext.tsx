import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { fetchMediaHistory, fetchMediaDetails, uploadImage, MediaHistoryResult, ImageUploadResponse } from '@/services/flowApi';
import type { MediaWorkflow } from '@/shared/types';

export interface UploadedImage {
  file: File;
  preview: string;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  mediaData?: ImageUploadResponse; // API response data when upload succeeds
  mediaId?: string; // Media generation ID for use in image generation
  error?: string; // Error message if upload fails
  aspectRatio?: string; // Aspect ratio of the uploaded image
}

export interface MediaContextState {
  // Media library from Flow API
  mediaLibrary: MediaWorkflow[];
  isLoadingLibrary: boolean;
  libraryError: string | null;

  // File URL cache for media items
  fileUrlCache: Map<string, string>;

  // Uploaded images (local state)
  uploadedImages: UploadedImage[];

  // Actions
  fetchMedia: (pageSize?: number, cursor?: string | null) => Promise<void>;
  uploadImageFile: (file: File, aspectRatio?: string) => Promise<string>;
  removeUploadedImage: (index: number) => void;
  clearUploads: () => void;
  refreshLibrary: () => Promise<void>;
  getFileUrl: (mediaId: string) => string | undefined;
}

const defaultContextValue: MediaContextState = {
  mediaLibrary: [],
  isLoadingLibrary: false,
  libraryError: null,
  fileUrlCache: new Map(),
  uploadedImages: [],
  fetchMedia: async () => {},
  uploadImageFile: async () => '',
  removeUploadedImage: () => {},
  clearUploads: () => {},
  refreshLibrary: async () => {},
  getFileUrl: () => undefined,
};

export const MediaContext = createContext<MediaContextState>(defaultContextValue);

interface MediaProviderProps {
  children: ReactNode;
}

export const MediaProvider: React.FC<MediaProviderProps> = ({ children }) => {
  const [mediaLibrary, setMediaLibrary] = useState<MediaWorkflow[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [fileUrlCache, setFileUrlCache] = useState<Map<string, string>>(new Map());
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  /**
   * Fetch media history from Flow API
   * Only fetches the media list, fileUrls are loaded separately by useEffect
   */
  const fetchMedia = useCallback(async (pageSize: number = 18, cursor: string | null = null) => {
    setIsLoadingLibrary(true);
    setLibraryError(null);

    try {
      const result: MediaHistoryResult = await fetchMediaHistory({ pageSize, cursor });
      setMediaLibrary(result.userWorkflows);
      console.log(`[MediaContext] ✅ Loaded ${result.userWorkflows.length} media items`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch media history';
      setLibraryError(errorMessage);
      console.error('[MediaContext] Error fetching media:', error);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  /**
   * Upload image file and track upload state
   * Returns the media generation ID on success
   */
  const uploadImageFile = useCallback(async (file: File, aspectRatio?: string): Promise<string> => {
    // Create preview URL
    const preview = URL.createObjectURL(file);

    // Add to uploaded images with pending status
    const newImage: UploadedImage = {
      file,
      preview,
      uploadStatus: 'pending',
      aspectRatio,
    };

    setUploadedImages((prev) => [...prev, newImage]);
    const imageIndex = uploadedImages.length; // Index where this image will be

    try {
      // Update status to uploading
      setUploadedImages((prev) =>
        prev.map((img, idx) =>
          idx === imageIndex ? { ...img, uploadStatus: 'uploading' as const } : img
        )
      );

      // Convert file to base64
      const base64Data = await fileToBase64(file);

      // Upload image
      const mediaId = await uploadImage({
        imageData: base64Data,
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        aspectRatio,
      });

      // Update with success status and media data
      setUploadedImages((prev) =>
        prev.map((img, idx) =>
          idx === imageIndex
            ? {
                ...img,
                uploadStatus: 'uploaded' as const,
                mediaId,
                mediaData: {
                  mediaGenerationId: { mediaGenerationId: mediaId },
                  width: 0, // Would need to read from file or API response
                  height: 0,
                },
              }
            : img
        )
      );

      return mediaId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      // Update with failed status and error
      setUploadedImages((prev) =>
        prev.map((img, idx) =>
          idx === imageIndex
            ? {
                ...img,
                uploadStatus: 'failed' as const,
                error: errorMessage,
              }
            : img
        )
      );

      console.error('[MediaContext] Error uploading image:', error);
      throw error;
    }
  }, [uploadedImages.length]);

  /**
   * Watch mediaLibrary changes and fetch missing fileUrls in background
   * Only checks current cache state - no need to track fetching state
   */
  useEffect(() => {
    if (mediaLibrary.length === 0) {
      return; // No media to process
    }

    console.log(`[MediaContext] 🔍 Checking ${mediaLibrary.length} media items for missing fileUrls...`);

    // Check current cache state and collect missing mediaIds
    const currentCache = fileUrlCache;
    const mediaIdsToFetch = mediaLibrary
      .map(workflow => workflow.media.name)
      .filter(mediaId => !currentCache.has(mediaId));

    if (mediaIdsToFetch.length === 0) {
      console.log(`[MediaContext] ✅ All fileUrls are already cached`);
      return;
    }

    console.log(`[MediaContext] 📥 Fetching ${mediaIdsToFetch.length} missing fileUrls...`);

    // Batch fetch all missing fileUrls in background
    mediaIdsToFetch.forEach((mediaId) => {
      fetchMediaDetails({ mediaId })
        .then((details) => {
          console.log(details);
          const fileUrl = details.userUploadedImage?.fifeUrl;

          if (fileUrl) {
            setFileUrlCache((prev) => {
              // Double-check to avoid overwriting if already set
              if (prev.has(mediaId)) {
                return prev; // Skip update
              }
              const newCache = new Map(prev);
              newCache.set(mediaId, fileUrl);
              return newCache;
            });
            console.log(`[MediaContext] ✅ Cached fileUrl for ${mediaId.substring(0, 20)}...`);
          } else {
            console.warn(`[MediaContext] ⚠️ No fileUrl in response for ${mediaId.substring(0, 20)}...`);
          }
        })
        .catch((error) => {
          console.error(`[MediaContext] ❌ Failed to fetch details for ${mediaId.substring(0, 20)}:`, error);
        });
    });
  }, [mediaLibrary, fileUrlCache]); // Re-run when mediaLibrary or cache changes

  /**
   * Remove an uploaded image by index
   */
  const removeUploadedImage = useCallback((index: number) => {
    setUploadedImages((prev) => {
      const image = prev[index];
      if (image?.preview) {
        URL.revokeObjectURL(image.preview); // Clean up preview URL
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

  /**
   * Clear all uploaded images
   */
  const clearUploads = useCallback(() => {
    uploadedImages.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setUploadedImages([]);
  }, [uploadedImages]);

  /**
   * Refresh media library (alias for fetchMedia with default params)
   */
  const refreshLibrary = useCallback(async () => {
    await fetchMedia();
  }, [fetchMedia]);

  /**
   * Get file URL from cache by media ID
   */
  const getFileUrl = useCallback((mediaId: string): string | undefined => {
    return fileUrlCache.get(mediaId);
  }, [fileUrlCache]);

  const value: MediaContextState = {
    mediaLibrary,
    isLoadingLibrary,
    libraryError,
    fileUrlCache,
    uploadedImages,
    fetchMedia,
    uploadImageFile,
    removeUploadedImage,
    clearUploads,
    refreshLibrary,
    getFileUrl,
  };

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

/**
 * Helper: Convert File to base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix if present
      const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
