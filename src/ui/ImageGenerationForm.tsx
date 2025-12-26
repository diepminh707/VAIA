import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Card } from '@/components/card';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ImageUpload } from './ImageUpload';

interface ImageGenerationFormProps {
  imagePrompts: string;
  setImagePrompts: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
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
}

export const ImageGenerationForm: React.FC<ImageGenerationFormProps> = ({
  imagePrompts,
  setImagePrompts,
  aspectRatio,
  setAspectRatio,
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
}) => {
  const [useSubjectImages, setUseSubjectImages] = useState(false);
  const [useModelImage, setUseModelImage] = useState(false);
  const [useStyleImage, setUseStyleImage] = useState(false);

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

        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            Prompt
          </label>
          <Textarea
            value={imagePrompts}
            onChange={(e) => setImagePrompts(e.target.value)}
            placeholder="Enter prompts (one per line, max 4)&#10;Example:&#10;A sunset over mountains&#10;A futuristic city"
            className="resize-none rounded-xl text-white focus:ring-1 focus:ring-primary border-border-input bg-surface-input focus:border-primary min-h-[140px] placeholder:text-text-subtle font-mono"
            rows={4}
          />
        </div>

        {/* Aspect Ratio Selector */}
        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />

        {/* Subject Images Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-white text-sm font-bold uppercase tracking-wider">
              Subject Images
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useSubjectImages}
                onChange={(e) => {
                  setUseSubjectImages(e.target.checked);
                  if (!e.target.checked && onSubjectImagesChange) {
                    onSubjectImagesChange([]);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-input peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          {useSubjectImages && onSubjectImagesChange && (
            <ImageUpload
              onImagesChange={onSubjectImagesChange}
              aspectRatio={aspectRatio}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Model Image Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-white text-sm font-bold uppercase tracking-wider">
              Model Image
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useModelImage}
                onChange={(e) => {
                  setUseModelImage(e.target.checked);
                  if (!e.target.checked && onModelImageChange) {
                    onModelImageChange([]);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-input peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          {useModelImage && onModelImageChange && (
            <ImageUpload
              onImagesChange={onModelImageChange}
              aspectRatio={aspectRatio}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Style Image Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-white text-sm font-bold uppercase tracking-wider">
              Style Image
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useStyleImage}
                onChange={(e) => {
                  setUseStyleImage(e.target.checked);
                  if (!e.target.checked && onStyleImageChange) {
                    onStyleImageChange([]);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-input peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          {useStyleImage && onStyleImageChange && (
            <ImageUpload
              onImagesChange={onStyleImageChange}
              aspectRatio={aspectRatio}
              disabled={isLoading}
            />
          )}
        </div>

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
