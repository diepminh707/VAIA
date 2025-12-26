import React, { useState, useEffect } from 'react';
import { Header } from '@/ui/Header';
import { TabLayout } from '@/ui/TabLayout';
import { ImageGenerationForm } from '@/ui/ImageGenerationForm';
import { VideoGenerationForm } from '@/ui/VideoGenerationForm';
import { ActivityLog } from '@/ui/ActivityLog';
import { TabsContent } from '@/components/tabs';
import { Alert, AlertDescription } from '@/components/alert';
import { X } from 'lucide-react';
import {
  testConnection,
  generateImages,
  generateVideo,
  type ConnectionStatus,
} from '@/services/flowApi';
import type { Activity } from '@/services/activityLogger';

const SidePanel: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image generation state
  const [imagePrompts, setImagePrompts] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('IMAGE_ASPECT_RATIO_SQUARE');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [subjectImageIds, setSubjectImageIds] = useState<string[]>([]);
  const [modelImageId, setModelImageId] = useState<string[]>([]);
  const [styleImageId, setStyleImageId] = useState<string[]>([]);

  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState<string>('');
  const [videoType, setVideoType] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [videoModel, setVideoModel] = useState<string>('VEO_3_1');

  // Activity log
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = (message: string, severity: Activity['severity'] = 'info') => {
    const activity: Activity = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      severity,
    };
    setActivities((prev) => [activity, ...prev].slice(0, 50)); // Keep last 50 activities
  };

  const checkConnection = async () => {
    try {
      const oldTokenSource = status?.tokenSource;
      const result = await testConnection();
      setStatus(result);

      // Log token refresh if source changed or new token acquired
      if (result.tokenSource && result.tokenSource !== oldTokenSource) {
        addActivity(`🔑 Token refreshed from ${result.tokenSource}`, 'success');
      }

      // Only log on initial connection, not on periodic checks
      if (!status && result.connected) {
        addActivity(`✅ Connected to Flow (Project: ${result.projectId?.substring(0, 8)}...)`, 'success');
        if (result.user?.email) {
          addActivity(`👤 Logged in as ${result.user.email}`, 'info');
        }
      }
    } catch (err: any) {
      // Only set error if we don't already have an operation error
      if (!error || !isLoading) {
        setError(err.message);
      }
      setStatus(null);

      // Only log on disconnect, not on periodic checks
      if (status) {
        addActivity(`❌ Disconnected: ${err.message}`, 'error');
      }
    }
  };

  const handleGenerateImages = async () => {
    if (!imagePrompts.trim()) {
      setError('Please enter at least one prompt');
      addActivity('❌ Please enter at least one prompt', 'error');
      return;
    }

    const prompts = [imagePrompts];
    try {
      setIsLoading(true);
      setError(null);

      // Merge all reference image IDs
      const referenceImageIds = [
        ...subjectImageIds,
        ...modelImageId,
        ...styleImageId,
      ];

      // Build reference message with breakdown
      const refParts: string[] = [];
      if (subjectImageIds.length > 0) refParts.push(`${subjectImageIds.length} subject`);
      if (modelImageId.length > 0) refParts.push(`${modelImageId.length} model`);
      if (styleImageId.length > 0) refParts.push(`${styleImageId.length} style`);
      const refMsg = refParts.length > 0
        ? ` with ${refParts.join(', ')} image(s)`
        : '';

      addActivity(`🎨 Generating ${prompts.length} image(s)${refMsg}...`, 'info');

      const result = await generateImages({
        prompts,
        aspectRatio,
        referenceImageIds,
      });

      if (result.media && result.media.length > 0) {
        const imageUrls = result.media.map((m: any) => m.uri);
        setGeneratedImages(imageUrls);
        addActivity(`✅ Generated ${imageUrls.length} image(s) successfully`, 'success');
        console.log('[VAIA] Generated image URLs:', imageUrls);
      } else {
        addActivity('⚠️ No images in response', 'warning');
        console.log('[VAIA] Full response:', result);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg);
      addActivity(`❌ Image generation failed: ${errorMsg}`, 'error');
      console.error('[VAIA] Image generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      setError('Please enter a video prompt');
      addActivity('❌ Please enter a video prompt', 'error');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      addActivity(`🎬 Starting video generation (${videoType})...`, 'info');

      const result = await generateVideo({
        type: videoType,
        prompt: videoPrompt,
        model: videoModel,
      });

      addActivity(`✅ Video generation started successfully`, 'success');
      console.log('[VAIA] Video generation result:', result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg);
      addActivity(`❌ Video generation failed: ${errorMsg}`, 'error');
      console.error('[VAIA] Video generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check connection on mount and periodically
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen dark bg-background-dark overflow-hidden">
      {/* Header */}
      <Header
        status={status}
        onReconnect={checkConnection}
        isLoading={isLoading}
      />

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-4">
          <Alert variant="destructive" className="relative">
            <AlertDescription className="pr-8">{error}</AlertDescription>
            <button
              onClick={() => setError(null)}
              className="absolute top-3 right-3 text-destructive-foreground/70 hover:text-destructive-foreground"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      {/* Tab Layout with Content */}
      <TabLayout defaultTab="image">
        <TabsContent value="image" className="flex-1 m-0 h-full">
          <ImageGenerationForm
            imagePrompts={imagePrompts}
            setImagePrompts={setImagePrompts}
            aspectRatio={aspectRatio}
            setAspectRatio={setAspectRatio}
            generatedImages={generatedImages}
            isLoading={isLoading}
            onGenerate={handleGenerateImages}
            status={status}
            subjectImageIds={subjectImageIds}
            modelImageId={modelImageId}
            styleImageId={styleImageId}
            onSubjectImagesChange={setSubjectImageIds}
            onModelImageChange={setModelImageId}
            onStyleImageChange={setStyleImageId}
          />
        </TabsContent>

        <TabsContent value="video" className="flex-1 m-0 h-full">
          <VideoGenerationForm
            videoPrompt={videoPrompt}
            setVideoPrompt={setVideoPrompt}
            videoType={videoType}
            setVideoType={setVideoType}
            videoModel={videoModel}
            setVideoModel={setVideoModel}
            isLoading={isLoading}
            onGenerate={handleGenerateVideo}
            status={status}
          />
        </TabsContent>

        <TabsContent value="activity" className="flex-1 m-0 h-full">
          <ActivityLog
            activities={activities}
            onClear={() => setActivities([])}
          />
        </TabsContent>
      </TabLayout>
    </div>
  );
};

export default SidePanel;
