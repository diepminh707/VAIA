import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/tabs';

interface TabLayoutProps {
  children: React.ReactNode;
  defaultTab?: string;
}

export const TabLayout: React.FC<TabLayoutProps> = ({ children, defaultTab = 'image' }) => {
  return (
    <Tabs defaultValue={defaultTab} className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="bg-surface-dark px-5 pt-5 pb-3">
        <TabsList className="bg-surface-input border border-border-input p-1 rounded-lg gap-0.5 w-full grid grid-cols-4">
          <TabsTrigger
            value="image"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-text-subtle hover:text-white text-sm font-medium transition-all rounded-md py-1.5"
          >
            Image
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-text-subtle hover:text-white text-sm font-medium transition-all rounded-md py-1.5"
          >
            Video
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-text-subtle hover:text-white text-sm font-medium transition-all rounded-md py-1.5"
          >
            Library
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm text-text-subtle hover:text-white text-sm font-medium transition-all rounded-md py-1.5"
          >
            Activity
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto bg-background-dark">
        {children}
      </div>
    </Tabs>
  );
};
