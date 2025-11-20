import React, { useState } from 'react';

const Popup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      setIsOpen(true);
    }
  };

  return (
    <div className="w-64 p-4 bg-white">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Extension Control</h1>

      <button
        onClick={toggleSidePanel}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        {isOpen ? 'Side Panel Open' : 'Open Side Panel'}
      </button>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-gray-700">
          The extension is ready to bridge Chrome APIs for web pages. Check the side panel for
          activity logs.
        </p>
      </div>
    </div>
  );
};

export default Popup;
