import React, { useState, useEffect } from 'react';
import { Header } from '@/ui/Header';
import { TabLayout } from '@/ui/TabLayout';
import { ImageGenerationForm } from '@/ui/ImageGenerationForm';
import { VideoGenerationForm } from '@/ui/VideoGenerationForm';
import { MediaLibrary } from '@/ui/MediaLibrary';
import { ActivityLog } from '@/ui/ActivityLog';
import { TabsContent } from '@/components/tabs';
import { Alert, AlertDescription } from '@/components/alert';
import { X } from 'lucide-react';
import {
  testConnection,
  generateImages,
  generateVideo,
  refreshFlowTab,
  type ConnectionStatus,
} from '@/services/flowApi';
import type { Activity } from '@/services/activityLogger';
import { composePrompt, getSystemPromptById } from '@/lib/promptUtils';
import { MediaProvider } from '@/contexts/MediaContext';

const SidePanel: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image generation state
  const [imagePrompts, setImagePrompts] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('IMAGE_ASPECT_RATIO_SQUARE');
  const [outputsPerPrompt, setOutputsPerPrompt] = useState<number>(1);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [subjectImageIds, setSubjectImageIds] = useState<string[]>([]);
  const [modelImageId, setModelImageId] = useState<string[]>([]);
  const [styleImageId, setStyleImageId] = useState<string[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

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

    // Validate required images based on selected prompt
    if (selectedPromptId) {
      const missingImages: string[] = [];

      // All system prompts require subject/product images
      if (subjectImageIds.length === 0) {
        missingImages.push('Subject Images (Product)');
      }

      // Check model image requirement
      if ((selectedPromptId === 'product-model' || selectedPromptId === 'product-style-model') && modelImageId.length === 0) {
        missingImages.push('Model Image');
      }

      // Check style image requirement
      if ((selectedPromptId === 'product-style' || selectedPromptId === 'product-style-model') && styleImageId.length === 0) {
        missingImages.push('Style Image');
      }

      if (missingImages.length > 0) {
        const errorMsg = `Missing required images: ${missingImages.join(', ')}`;
        setError(errorMsg);
        addActivity(`❌ ${errorMsg}`, 'error');
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // Compose final prompt (system template + user text if template selected)
      let finalPrompt: string;
      if (selectedPromptId) {
        finalPrompt = composePrompt(selectedPromptId, imagePrompts);
        const promptTemplate = getSystemPromptById(selectedPromptId);
        addActivity(`📋 Using system prompt: ${promptTemplate?.name}`, 'info');
      } else {
        finalPrompt = imagePrompts;
      }

      // Duplicate the prompt based on outputsPerPrompt selection
      const prompts = Array(outputsPerPrompt).fill(finalPrompt);

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

      const outputMsg = outputsPerPrompt > 1
        ? ` (${outputsPerPrompt} outputs per prompt)`
        : '';
      addActivity(`🎨 Generating ${prompts.length} image(s)${outputMsg}${refMsg}...`, 'info');

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

        // Refresh Flow tab to show updated content
        try {
          await refreshFlowTab();
          addActivity('🔄 Flow tab refreshed', 'info');
        } catch (refreshError) {
          console.warn('[VAIA] Failed to refresh Flow tab:', refreshError);
          // Don't fail the whole operation if refresh fails
        }
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
    <MediaProvider>
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
          <TabsContent value="image" forceMount className="flex-1 m-0 h-full data-[state=inactive]:hidden">
            <ImageGenerationForm
              imagePrompts={imagePrompts}
              setImagePrompts={setImagePrompts}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              outputsPerPrompt={outputsPerPrompt}
              setOutputsPerPrompt={setOutputsPerPrompt}
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
              selectedPromptId={selectedPromptId}
              onPromptChange={setSelectedPromptId}
            />
          </TabsContent>

          <TabsContent value="video" forceMount className="flex-1 m-0 h-full data-[state=inactive]:hidden">
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

          <TabsContent value="library" forceMount className="flex-1 m-0 h-full data-[state=inactive]:hidden">
            <MediaLibrary />
          </TabsContent>

          <TabsContent value="activity" forceMount className="flex-1 m-0 h-full data-[state=inactive]:hidden">
            <ActivityLog
              activities={activities}
              onClear={() => setActivities([])}
            />
          </TabsContent>
        </TabLayout>
      </div>
    </MediaProvider>
  );
};

export default SidePanel;
