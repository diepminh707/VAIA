import React, { useState, useEffect } from 'react';
import { TabDataMessage } from '../shared/types';

interface TabInfo {
  tabId?: number;
  url?: string;
  title?: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabInfo | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getActiveTab = () => {
      chrome.runtime.sendMessage({ type: 'get_active_tab' }, (response: TabDataMessage) => {
        if (response && response.payload) {
          setActiveTab({
            tabId: response.payload.tabId,
            url: response.payload.url,
            title: response.payload.title,
          });
          addLog(`Switched to tab: ${response.payload.title}`, 'info');
        }
        setLoading(false);
      });
    };

    getActiveTab();

    // Listen for tab changes
    const handleTabActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        setActiveTab({
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
        });
        addLog(`Switched to tab: ${tab.title}`, 'info');
      });
    };

    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => [...prevLogs, { timestamp, message, type }]);
  };

  const getLogColor = (type: string): string => {
    switch (type) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const getLogBgColor = (type: string): string => {
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      default:
        return 'bg-blue-50';
    }
  };

  return (
    <div className="w-full h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Extension Panel</h1>
        <p className="text-sm text-gray-600 mt-1">Monitor and control Chrome APIs</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Active Tab Section */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Tab</h2>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          ) : activeTab ? (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="text-xs">
                <span className="font-medium text-gray-700">Tab ID: </span>
                <span className="text-gray-600">{activeTab.tabId}</span>
              </div>
              <div className="text-xs break-words">
                <span className="font-medium text-gray-700">URL: </span>
                <span className="text-gray-600">{activeTab.url || 'N/A'}</span>
              </div>
              <div className="text-xs">
                <span className="font-medium text-gray-700">Title: </span>
                <span className="text-gray-600 truncate">{activeTab.title || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active tab found</p>
          )}
        </div>

        {/* Logs Section */}
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Activity Log</h2>
          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">No activity yet</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded ${getLogBgColor(log.type)} border border-opacity-20`}
                >
                  <div className="flex gap-2">
                    <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={`${getLogColor(log.type)} flex-1`}>{log.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Extension Active</span>
          </div>
          <span className="text-xs text-gray-500">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
