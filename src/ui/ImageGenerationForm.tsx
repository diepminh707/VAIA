import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Card } from '@/components/card';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ReferenceImageUpload } from './ReferenceImageUpload';
import { PromptSelector } from './PromptSelector';
import { OutputsPerPromptSelector } from './OutputsPerPromptSelector';

interface ImageGenerationFormProps {
  imagePrompts: string;
  setImagePrompts: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  outputsPerPrompt: number;
  setOutputsPerPrompt: (value: number) => void;
  generatedImages: string[];
  isLoading: boolean;
  onGenerate: () => void;
  status: any;
  subjectImageIds?: string[];
  modelImageId?: string[];
  styleImageId?: string[];
  onSubjectImagesChange?: (ids: string[]) => void;
  onModelImageChange?: (ids: string[]) => void;
  onStyleImageChange?: (ids: string[]) => void;
  selectedPromptId?: string | null;
  onPromptChange?: (promptId: string | null) => void;
}

export const ImageGenerationForm: React.FC<ImageGenerationFormProps> = ({
  imagePrompts,
  setImagePrompts,
  aspectRatio,
  setAspectRatio,
  outputsPerPrompt,
  setOutputsPerPrompt,
  generatedImages,
  isLoading,
  onGenerate,
  status,
  subjectImageIds = [],
  modelImageId = [],
  styleImageId = [],
  onSubjectImagesChange,
  onModelImageChange,
  onStyleImageChange,
  selectedPromptId = null,
  onPromptChange,
}) => {
  const [useSubjectImages, setUseSubjectImages] = useState(false);
  const [useModelImage, setUseModelImage] = useState(false);
  const [useStyleImage, setUseStyleImage] = useState(false);

  // Determine which image uploaders should be visible based on selected prompt
  const shouldShowSubjectUpload = true; // Always show subject/product
  const shouldShowModelUpload = selectedPromptId === 'product-model' || selectedPromptId === 'product-style-model';
  const shouldShowStyleUpload = selectedPromptId === 'product-style' || selectedPromptId === 'product-style-model';

  // Determine if images are required (not optional)
  // For None (Custom): subject is optional, no model/style
  // For System Prompts: all shown images are required
  const isSubjectRequired = !!selectedPromptId; // Required for all system prompts, optional for None (Custom)
  const isModelRequired = selectedPromptId === 'product-model' || selectedPromptId === 'product-style-model';
  const isStyleRequired = selectedPromptId === 'product-style' || selectedPromptId === 'product-style-model';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display leading-tight text-white">
            Image Generation
          </h1>
          <p className="text-text-subtle text-sm">
            Transform your ideas into reality
          </p>
        </div>

        {/* System Prompt Selector */}
        {onPromptChange && (
          <PromptSelector
            selectedPromptId={selectedPromptId}
            onPromptChange={onPromptChange}
          />
        )}

        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            {selectedPromptId ? 'Your Custom Request' : 'Prompt'}
          </label>
          <Textarea
            value={imagePrompts}
            onChange={(e) => setImagePrompts(e.target.value)}
            placeholder={
              selectedPromptId
                ? "Enter your custom request here...\nExample: Create a vibrant promotional poster with warm lighting"
                : "Enter prompts (one per line, max 4)\nExample:\nA sunset over mountains\nA futuristic city"
            }
            className="resize-none rounded-xl text-white focus:ring-1 focus:ring-primary border-border-input bg-surface-input focus:border-primary min-h-[140px] placeholder:text-text-subtle font-mono"
            rows={4}
          />
          {selectedPromptId && (
            <p className="text-xs text-muted-foreground">
              This text will be used as your custom request within the selected system prompt template
            </p>
          )}
        </div>

        {/* Aspect Ratio Selector */}
        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />

        {/* Outputs Per Prompt Selector */}
        <OutputsPerPromptSelector value={outputsPerPrompt} onChange={setOutputsPerPrompt} />

        {/* Subject Images Section - Always visible (Product images required for all templates) */}
        {onSubjectImagesChange && shouldShowSubjectUpload && (
          <ReferenceImageUpload
            label="Subject Images (Product)"
            enabled={useSubjectImages}
            onToggle={setUseSubjectImages}
            imageIds={subjectImageIds}
            onImagesChange={onSubjectImagesChange}
            aspectRatio={aspectRatio}
            disabled={isLoading}
            maxImages={4}
            type="subject"
            description="Tải lên tối đa 4 ảnh sản phẩm để AI học đặc điểm tốt hơn"
            required={isSubjectRequired}
          />
        )}

        {/* Model Image Section - Visible for Product+Model and Product+Style+Model */}
        {onModelImageChange && shouldShowModelUpload && (
          <ReferenceImageUpload
            label="Model Image"
            enabled={useModelImage}
            onToggle={setUseModelImage}
            imageIds={modelImageId}
            onImagesChange={onModelImageChange}
            aspectRatio={aspectRatio}
            disabled={isLoading}
            maxImages={1}
            type="model"
            description={selectedPromptId ? "Ảnh người mẫu (giữ nguyên identity)" : undefined}
            required={isModelRequired}
          />
        )}

        {/* Style Image Section - Visible for Product+Style and Product+Style+Model */}
        {onStyleImageChange && shouldShowStyleUpload && (
          <ReferenceImageUpload
            label="Style Image"
            enabled={useStyleImage}
            onToggle={setUseStyleImage}
            imageIds={styleImageId}
            onImagesChange={onStyleImageChange}
            aspectRatio={aspectRatio}
            disabled={isLoading}
            maxImages={1}
            type="style"
            description={selectedPromptId ? "Ảnh tham khảo layout và phong cách" : undefined}
            required={isStyleRequired}
          />
        )}

        {/* Generated Images */}
        {generatedImages.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="text-white text-sm font-bold uppercase tracking-wider">
              Generated Images
            </label>
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((imgUrl, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={imgUrl}
                    alt={`Generated ${idx + 1}`}
                    className="w-full rounded-lg border border-border-dark"
                  />
                  <a
                    href={imgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 px-3 py-1.5 rounded-lg text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Open
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Generate Button */}
      <div className="sticky bottom-0 p-5 bg-surface-dark/95 backdrop-blur-sm border-t border-border-dark">
        <Button
          onClick={onGenerate}
          disabled={isLoading || !status}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-base shadow-[0_0_20px_-5px_#8c2bee] hover:shadow-[0_0_25px_-5px_#8c2bee] transition-all gap-2 group"
        >
          <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
          <span>{isLoading ? 'Generating...' : !status ? 'Not Connected' : 'Generate Images'}</span>
        </Button>
      </div>
    </div>
  );
};
