import React from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';

interface VideoGenerationFormProps {
  videoPrompt: string;
  setVideoPrompt: (value: string) => void;
  videoType: 'text-to-video' | 'image-to-video';
  setVideoType: (value: 'text-to-video' | 'image-to-video') => void;
  videoModel: string;
  setVideoModel: (value: string) => void;
  isLoading: boolean;
  onGenerate: () => void;
  status: any;
}

export const VideoGenerationForm: React.FC<VideoGenerationFormProps> = ({
  videoPrompt,
  setVideoPrompt,
  videoType,
  setVideoType,
  videoModel,
  setVideoModel,
  isLoading,
  onGenerate,
  status,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display leading-tight text-white">
            Video Generation
          </h1>
          <p className="text-text-subtle text-sm">
            Bring your visions to life
          </p>
        </div>

        {/* Video Type Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            Video Type
          </label>
          <Select value={videoType} onValueChange={(value: any) => setVideoType(value)}>
            <SelectTrigger className="w-full bg-surface-input border-border-input text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text-to-video">Text to Video</SelectItem>
              <SelectItem value="image-to-video">Image to Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Video Model Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            Model
          </label>
          <Select value={videoModel} onValueChange={setVideoModel}>
            <SelectTrigger className="w-full bg-surface-input border-border-input text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VEO_3_1">Veo 3.1 (High Quality)</SelectItem>
              <SelectItem value="VEO_3_1_FAST">Veo 3.1 Fast</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
          <label className="text-white text-sm font-bold uppercase tracking-wider">
            Prompt
          </label>
          <Textarea
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Enter video prompt&#10;Example: A drone flying over a serene lake at sunrise"
            className="resize-none rounded-xl text-white focus:ring-1 focus:ring-primary border-border-input bg-surface-input focus:border-primary min-h-[100px] placeholder:text-text-subtle font-mono"
            rows={3}
          />
        </div>
      </div>

      {/* Fixed Bottom Generate Button */}
      <div className="sticky bottom-0 p-5 bg-surface-dark/95 backdrop-blur-sm border-t border-border-dark">
        <Button
          onClick={onGenerate}
          disabled={isLoading || !status}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-base shadow-[0_0_20px_-5px_#a855f7] hover:shadow-[0_0_25px_-5px_#a855f7] transition-all gap-2 group"
        >
          <Video className="h-5 w-5 group-hover:animate-pulse" />
          <span>{isLoading ? 'Starting...' : !status ? 'Not Connected' : 'Generate Video'}</span>
        </Button>
      </div>
    </div>
  );
};
