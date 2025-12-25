import React, { useState, useEffect } from 'react';
import type { FlowAPIMessage, FlowAPIResponse } from '../shared/types';

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

  const getSeverityColor = (severity: Activity['severity']) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 text-green-800';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800';
      case 'error':
        return 'bg-red-50 text-red-800';
      default:
        return 'bg-gray-50 text-gray-800';
    }
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
      // ✅ Don't clear operation errors - only clear on new operations

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
      // This prevents connection errors from overwriting operation errors
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

    const prompts = imagePrompts.split('\n').filter(p => p.trim()).slice(0, 4); // Max 4 prompts

    try {
      setIsLoading(true);
      setError(null);
      addActivity(`🎨 Generating ${prompts.length} image(s)...`, 'info');

      const result = await callFlowAPI('generate_image', {
        prompts,
        aspectRatio,
        referenceImageIds: [],
      });

      // Extract image URIs from Flow API response
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
    const interval = setInterval(checkConnection, 10000); // Every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-screen p-4 bg-gray-50">
      <h1 className="text-xl font-bold text-gray-900 mb-4">VAIA - Flow API Control</h1>

      {/* Status Bar */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
        <div className="flex items-center justify-between">
          {status ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Connected to Flow</span>
              {status.projectId && (
                <span className="text-xs text-gray-500 ml-2">
                  Project: {status.projectId.substring(0, 8)}...
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                {error || 'Not connected'}
              </span>
            </div>
          )}
          <button
            onClick={checkConnection}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {/* Token Info */}
        {status?.hasAuth && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-500">
            {status.tokenSource && (
              <span className="flex items-center gap-1">
                🔑 Source: <span className="font-mono text-gray-700">{status.tokenSource}</span>
              </span>
            )}
            {status.user?.email && (
              <span className="flex items-center gap-1">
                👤 {status.user.email}
              </span>
            )}
            {status.tokenExpires && (
              <span className="flex items-center gap-1">
                ⏰ Expires: {new Date(status.tokenExpires).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 flex items-start justify-between gap-2">
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 font-bold"
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Image Generation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Image Generation</h2>

        <textarea
          value={imagePrompts}
          onChange={(e) => setImagePrompts(e.target.value)}
          placeholder="Enter prompts (one per line, max 4)&#10;Example:&#10;A sunset over mountains&#10;A futuristic city"
          className="w-full p-2 border border-gray-300 rounded text-sm mb-3 font-mono"
          rows={4}
        />

        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-sm mb-3"
        >
          <option value="IMAGE_ASPECT_RATIO_SQUARE">Square (1:1) - 1024x1024</option>
          <option value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape (16:9) - 1536x864</option>
          <option value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait (9:16) - 864x1536</option>
          <option value="IMAGE_ASPECT_RATIO_ULTRA_WIDE">Ultra Wide (21:9) - 1920x823</option>
          <option value="IMAGE_ASPECT_RATIO_4_3">4:3 - 1024x768</option>
          <option value="IMAGE_ASPECT_RATIO_3_2">3:2 - 1536x1024</option>
        </select>

        <button
          onClick={handleGenerateImages}
          disabled={isLoading || !status}
          className="w-full py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Generating...' : !status ? 'Not Connected' : 'Generate Images'}
        </button>

        {generatedImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {generatedImages.map((imgUrl, idx) => (
              <div key={idx} className="relative">
                <img
                  src={imgUrl}
                  alt={`Generated ${idx + 1}`}
                  className="w-full rounded border border-gray-200"
                  onError={(e) => {
                    addActivity(`❌ Failed to load image ${idx + 1}`, 'error');
                    console.error('Image load error:', imgUrl);
                  }}
                />
                <a
                  href={imgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-white bg-opacity-80 px-2 py-1 rounded text-xs hover:bg-opacity-100"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Generation */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Video Generation</h2>

        <select
          value={videoType}
          onChange={(e) => setVideoType(e.target.value as any)}
          className="w-full p-2 border border-gray-300 rounded text-sm mb-3"
        >
          <option value="text-to-video">Text to Video</option>
          <option value="image-to-video">Image to Video</option>
        </select>

        <select
          value={videoModel}
          onChange={(e) => setVideoModel(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded text-sm mb-3"
        >
          <option value="VEO_3_1">Veo 3.1 (High Quality)</option>
          <option value="VEO_3_1_FAST">Veo 3.1 Fast</option>
        </select>

        <textarea
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          placeholder="Enter video prompt&#10;Example: A drone flying over a serene lake at sunrise"
          className="w-full p-2 border border-gray-300 rounded text-sm mb-3 font-mono"
          rows={3}
        />

        <button
          onClick={handleGenerateVideo}
          disabled={isLoading || !status}
          className="w-full py-2 bg-purple-600 text-white rounded font-medium text-sm hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting...' : !status ? 'Not Connected' : 'Generate Video'}
        </button>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Activity Log</h2>
          {activities.length > 0 && (
            <button
              onClick={() => setActivities([])}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No activities yet</div>
          ) : (
            activities.map((activity, index) => (
              <div
                key={index}
                className={`p-2 border-b border-gray-100 ${getSeverityColor(activity.severity)}`}
              >
                <div className="text-xs font-mono text-gray-500">{activity.timestamp}</div>
                <div className="text-xs mt-1">{activity.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
