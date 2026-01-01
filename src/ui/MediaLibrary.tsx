import React, { useEffect } from 'react';
import { RefreshCw, ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useMediaContext } from '@/hooks/useMediaContext';
import { cn } from '@/lib/utils';

export const MediaLibrary: React.FC = () => {
  const {
    mediaLibrary,
    isLoadingLibrary,
    libraryError,
    uploadedImages,
    fetchMedia,
    refreshLibrary,
    getFileUrl,
  } = useMediaContext();

  // Load media library on mount
  useEffect(() => {
    fetchMedia(18);
  }, []);

  const handleRefresh = async () => {
    await refreshLibrary();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold font-display leading-tight text-white">
              Media Library
            </h1>
            <p className="text-text-subtle text-sm">
              Browse your uploaded and generated images
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoadingLibrary}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoadingLibrary && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Upload Status Section */}
        {uploadedImages.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-white text-sm font-bold uppercase tracking-wider">
              Recent Uploads
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {uploadedImages.map((image, idx) => (
                <div key={idx} className="relative group">
                  <div className="aspect-square rounded-xl border border-border-dark overflow-hidden bg-surface-input">
                    <img
                      src={image.preview}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Upload Status Badge */}
                  <div className="absolute top-2 right-2">
                    {image.uploadStatus === 'uploading' && (
                      <div className="bg-blue-500/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin text-white" />
                        <span className="text-xs text-white font-medium">Uploading...</span>
                      </div>
                    )}
                    {image.uploadStatus === 'uploaded' && (
                      <div className="bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-white" />
                        <span className="text-xs text-white font-medium">Uploaded</span>
                      </div>
                    )}
                    {image.uploadStatus === 'failed' && (
                      <div className="bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-white" />
                        <span className="text-xs text-white font-medium">Failed</span>
                      </div>
                    )}
                    {image.uploadStatus === 'pending' && (
                      <div className="bg-gray-500/90 backdrop-blur-sm px-2 py-1 rounded-md">
                        <span className="text-xs text-white font-medium">Pending</span>
                      </div>
                    )}
                  </div>
                  {/* Media ID */}
                  {image.mediaId && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-mono truncate">
                        {image.mediaId}
                      </p>
                    </div>
                  )}
                  {/* Error Message */}
                  {image.error && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 backdrop-blur-sm px-2 py-1">
                      <p className="text-xs text-white font-medium truncate">{image.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {libraryError && (
          <Card className="p-4 border-red-500/50 bg-red-500/10">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Failed to load media library</h3>
                <p className="text-text-subtle text-sm">{libraryError}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingLibrary && mediaLibrary.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-text-subtle text-sm">Loading media library...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoadingLibrary && mediaLibrary.length === 0 && !libraryError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-16 w-16 rounded-full bg-surface-input flex items-center justify-center">
              <ImageIcon className="h-8 w-8 text-text-subtle" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-semibold mb-1">No media found</h3>
              <p className="text-text-subtle text-sm">Upload or generate images to see them here</p>
            </div>
          </div>
        )}

        {/* Media Grid */}
        {mediaLibrary.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-white text-sm font-bold uppercase tracking-wider">
              Your Media ({mediaLibrary.length})
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {mediaLibrary.map((workflow, idx) => {
                // Use workflow.media.name as mediaId (format: "CAM...")
                const mediaId = workflow.media.name;
                const fileUrl = getFileUrl(mediaId);

                return (
                  <div key={idx} className="relative group">
                    <div className="aspect-square rounded-xl border border-border-dark overflow-hidden bg-surface-input">
                      {fileUrl ? (
                        <img
                          src={fileUrl}
                          alt={workflow.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-input to-surface-dark">
                          <Loader2 className="h-6 w-6 text-text-subtle animate-spin" />
                        </div>
                      )}
                    </div>
                    {/* Workflow Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white font-medium truncate">{workflow.name}</p>
                      <p className="text-[10px] text-text-subtle">
                        {new Date(workflow.createTime).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Media Details */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
                        <p className="text-[10px] text-white font-medium">
                          {workflow.media.userUploadedImage.aspectRatio.replace('IMAGE_ASPECT_RATIO_', '')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};