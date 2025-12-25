import React, { useState, useEffect } from 'react';
import type { FlowAPIMessage, FlowAPIResponse } from '../shared/types';
import { Header } from '@/ui/Header';
import { TabLayout } from '@/ui/TabLayout';
import { ImageGenerationForm } from '@/ui/ImageGenerationForm';
import { VideoGenerationForm } from '@/ui/VideoGenerationForm';
import { ActivityLog } from '@/ui/ActivityLog';
import { TabsContent } from '@/components/tabs';
import { Alert, AlertDescription } from '@/components/alert';
import { X } from 'lucide-react';

interface ConnectionStatus {
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

interface Activity {
  timestamp: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const SidePanel: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Image generation state
  const [imagePrompts, setImagePrompts] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('IMAGE_ASPECT_RATIO_SQUARE');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

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

  const callFlowAPI = async (command: string, data: any = null): Promise<any> => {
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

  const checkConnection = async () => {
    try {
      const oldTokenSource = status?.tokenSource;
      const result = await callFlowAPI('testConnection');
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

    const prompts = imagePrompts.split('\n').filter(p => p.trim()).slice(0, 4);

    try {
      setIsLoading(true);
      setError(null);
      addActivity(`🎨 Generating ${prompts.length} image(s)...`, 'info');

      const result = await callFlowAPI('generate_image', {
        prompts,
        aspectRatio,
        referenceImageIds: [],
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

      const result = await callFlowAPI('generate_video', {
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
