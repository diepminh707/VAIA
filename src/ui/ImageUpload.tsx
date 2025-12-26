import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/button';
import { uploadImage } from '@/services/flowApi';
import { activityLogger } from '@/services/activityLogger';

interface UploadedImage {
  id: string;
  preview: string;
}

interface ImageUploadProps {
  onImagesChange: (imageIds: string[]) => void;
  aspectRatio?: string;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesChange,
  aspectRatio = 'IMAGE_ASPECT_RATIO_SQUARE',
  disabled = false,
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      activityLogger.error('❌ Please upload an image file');
      return;
    }

    try {
      setIsUploading(true);
      activityLogger.info(`📤 Uploading ${file.name}...`);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target?.result as string;

          // Upload to Flow API
          const mediaId = await uploadImage({
            imageData: base64Data,
            mimeType: file.type,
            aspectRatio,
          });

          // Add to uploaded images
          const newImage: UploadedImage = {
            id: mediaId,
            preview: base64Data,
          };

          setUploadedImages((prev) => {
            const updated = [...prev, newImage];
            onImagesChange(updated.map((img) => img.id));
            return updated;
          });

          activityLogger.success(`✅ Uploaded ${file.name}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          activityLogger.error(`❌ Upload failed: ${errorMsg}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        activityLogger.error('❌ Failed to read file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      activityLogger.error('❌ Upload error');
      setIsUploading(false);
    }
  };

  // Handle file picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileUpload(file);
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [disabled, aspectRatio]);

  // Handle remove image
  const handleRemoveImage = (imageId: string) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((img) => img.id !== imageId);
      onImagesChange(updated.map((img) => img.id));
      return updated;
    });
    activityLogger.info('🗑️ Image removed');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all
          ${isDragging
            ? 'border-primary bg-primary/10'
            : 'border-border-input bg-surface-input hover:border-border-dark'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          disabled={disabled || isUploading}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-text-subtle">Uploading...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-primary/10 rounded-full">
                {isDragging ? (
                  <ImageIcon className="h-6 w-6 text-primary" />
                ) : (
                  <Upload className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  Click to upload, drag & drop, or paste (Ctrl+V)
                </p>
                <p className="text-xs text-text-subtle mt-1">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Images Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <img
                src={image.preview}
                alt="Uploaded"
                className="w-full h-32 object-cover rounded-lg border border-border-dark"
              />
              <button
                onClick={() => handleRemoveImage(image.id)}
                disabled={disabled}
                className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm hover:bg-red-500/90 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Remove image"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
