import React, { useState, useRef } from 'react';
import { Plus, X, Loader2, Upload, UserPlus, ImagePlus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/services/flowApi';
import { activityLogger } from '@/services/activityLogger';

interface UploadedImage {
  id: string;
  preview: string;
}

interface ReferenceImageUploadProps {
  label: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  imageIds: string[];
  onImagesChange: (imageIds: string[]) => void;
  aspectRatio?: string;
  disabled?: boolean;
  maxImages?: number; // 1 for single, >1 for multiple
  type?: 'subject' | 'model' | 'style'; // Type of reference image
  description?: string; // Description text below label
  tooltip?: string; // Tooltip hint text
  required?: boolean; // If true, always enabled and no toggle switch
}

export const ReferenceImageUpload: React.FC<ReferenceImageUploadProps> = ({
  label,
  enabled,
  onToggle,
  imageIds,
  onImagesChange,
  aspectRatio = 'IMAGE_ASPECT_RATIO_SQUARE',
  disabled = false,
  maxImages = 4,
  type = 'subject',
  description,
  tooltip,
  required = false,
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSingleMode = maxImages === 1;
  const canAddMore = uploadedImages.length < maxImages;

  // Get icon and text based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'model':
        return {
          icon: UserPlus,
          uploadText: 'Thêm ảnh người mẫu',
          uploadSubtext: 'AI sẽ tạo ảnh dựa trên khuôn mặt người mẫu',
          defaultTooltip: 'Tải lên ảnh người mẫu để AI tạo hình ảnh dựa trên khuôn mặt hoặc dáng người.',
        };
      case 'style':
        return {
          icon: ImagePlus,
          uploadText: 'Chọn hình ảnh',
          uploadSubtext: 'Sử dụng ảnh mẫu để tạo (Image-to-Image)',
          defaultTooltip: 'Sử dụng hình ảnh này làm cơ sở về bố cục hoặc màu sắc để AI sáng tạo thêm.',
        };
      default: // subject
        return {
          icon: Plus,
          uploadText: 'Thêm ảnh',
          uploadSubtext: 'Tải lên tối đa 4 ảnh để AI học đặc điểm tốt hơn',
          defaultTooltip: 'Tải lên hình ảnh sản phẩm hoặc chủ thể chính bạn muốn giữ nguyên đặc điểm.',
        };
    }
  };

  const typeConfig = getTypeConfig();
  const tooltipText = tooltip || typeConfig.defaultTooltip;

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      activityLogger.error('Please upload an image file');
      return;
    }

    // In single mode, replace existing image
    if (isSingleMode && uploadedImages.length >= 1) {
      handleRemoveImage(uploadedImages[0].id);
    }

    try {
      setIsUploading(true);
      activityLogger.info(`Uploading ${file.name}...`);

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
            const updated = isSingleMode ? [newImage] : [...prev, newImage];
            onImagesChange(updated.map((img) => img.id));
            return updated;
          });

          activityLogger.success(`Uploaded ${file.name}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          activityLogger.error(`Upload failed: ${errorMsg}`);
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        activityLogger.error('Failed to read file');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      activityLogger.error('Upload error');
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

  // Handle remove image
  const handleRemoveImage = (imageId: string) => {
    setUploadedImages((prev) => {
      const updated = prev.filter((img) => img.id !== imageId);
      onImagesChange(updated.map((img) => img.id));
      return updated;
    });
    activityLogger.info('Image removed');
  };

  // Handle toggle change
  const handleToggleChange = (checked: boolean) => {
    onToggle(checked);
    if (!checked) {
      setUploadedImages([]);
      onImagesChange([]);
    }
  };

  // If required, component is always enabled
  const isActive = required || enabled;

  return (
    <div className="flex flex-col gap-2">
      {/* Header with Label, Tooltip and Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {tooltipText && (
            <div className="group/tooltip relative z-20">
              <Info className="h-4 w-4 text-text-subtle cursor-help hover:text-white transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-surface-dark border border-border-input rounded-lg shadow-xl text-xs text-white w-48 text-center opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
                {tooltipText}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-border-input"></div>
              </div>
            </div>
          )}
        </div>
        {/* Only show toggle if not required */}
        {!required && (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggleChange(e.target.checked)}
              className="sr-only peer"
              disabled={disabled}
            />
            <div className="w-11 h-6 bg-surface-input peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        )}
      </div>

      {/* Image Slots */}
      {isActive && (
        <>
          {/* Single Mode - Horizontal Card Style (Model/Style) */}
          {isSingleMode ? (
            <div className="flex flex-col gap-3">
              {uploadedImages.length > 0 ? (
                <div className="relative aspect-square rounded-xl border border-border-dark overflow-hidden group">
                  <img
                    src={uploadedImages[0].preview}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleRemoveImage(uploadedImages[0].id)}
                      disabled={disabled}
                      className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    disabled={disabled || isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-colors w-full border-dashed",
                    isUploading
                      ? "border-primary bg-primary/10"
                      : "border-border-input bg-surface-input group-hover:border-primary/50",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}>
                    <div className={cn(
                      "h-16 w-16 shrink-0 rounded-lg border flex items-center justify-center transition-colors",
                      "bg-surface-dark border-border-dark text-text-subtle group-hover:text-primary"
                    )}>
                      {isUploading ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <typeConfig.icon className="h-7 w-7" />
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-1">
                      <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                        {isUploading ? 'Uploading...' : typeConfig.uploadText}
                      </span>
                      <span className="text-xs text-text-subtle">
                        {typeConfig.uploadSubtext}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Multiple Mode - Horizontal Grid of 4 Slots (Subject) */
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-3">
                {/* Uploaded Images */}
                {uploadedImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative group aspect-square rounded-xl border border-border-input bg-surface-input overflow-hidden"
                  >
                    <img
                      src={image.preview}
                      alt="Subject reference"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        disabled={disabled}
                        className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upload Slot */}
                {canAddMore && (
                  <div className="relative group aspect-square">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      disabled={disabled || isUploading}
                      multiple={false}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={cn(
                      "w-full h-full rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-1",
                      isUploading
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border-input bg-surface-input group-hover:border-primary/50 group-hover:bg-surface-input/80 text-text-subtle group-hover:text-primary",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}>
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-6 w-6" />
                          <span className="text-[10px] font-medium">Thêm ảnh</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {description && (
                <p className="text-xs text-text-subtle">{description}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
