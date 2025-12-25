import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/button';
import { ScrollArea } from '@/components/scroll-area';
import { Badge } from '@/components/badge';
import { cn } from '@/lib/utils';

interface Activity {
  timestamp: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

interface ActivityLogProps {
  activities: Activity[];
  onClear: () => void;
}

const getSeverityBadge = (severity: Activity['severity']) => {
  switch (severity) {
    case 'success':
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Success</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Warning</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
};

const getSeverityColor = (severity: Activity['severity']) => {
  switch (severity) {
    case 'success':
      return 'bg-green-500/10 border-green-500/20';
    case 'warning':
      return 'bg-yellow-500/10 border-yellow-500/20';
    case 'error':
      return 'bg-red-500/10 border-red-500/20';
    default:
      return 'bg-muted/50 border-border-dark';
  }
};

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities, onClear }) => {
  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 bg-surface-dark border-b border-border-dark flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display leading-tight text-white">
            Activity Log
          </h1>
          <p className="text-text-subtle text-sm mt-1">
            Track your generation history
          </p>
        </div>
        {activities.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            className="gap-2 border-border-input text-text-subtle hover:text-white hover:border-primary/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Activities */}
      <ScrollArea className="flex-1 p-5">
        {activities.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-surface-input flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-text-subtle text-sm">No activities yet</p>
              <p className="text-text-subtle text-xs">
                Your generation history will appear here
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activities.map((activity, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  getSeverityColor(activity.severity)
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-xs font-mono text-text-subtle">
                    {activity.timestamp}
                  </span>
                  {getSeverityBadge(activity.severity)}
                </div>
                <p className="text-sm text-white leading-relaxed">{activity.message}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
