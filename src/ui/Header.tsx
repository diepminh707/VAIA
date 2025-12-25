import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';

interface ConnectionStatus {
  connected: boolean;
  tokenExpires?: string | null;
  user?: {
    name?: string;
    email?: string;
    image?: string;
  } | null;
  projectId?: string;
}

interface HeaderProps {
  status: ConnectionStatus | null;
  onReconnect: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ status, onReconnect, isLoading }) => {
  return (
    <header className="flex items-center justify-between border-b border-border-dark bg-surface-dark px-6 py-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="size-8 flex items-center justify-center bg-primary/20 rounded-lg text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="text-white text-lg font-bold font-display leading-tight tracking-[-0.015em]">
          VAIA
        </h2>
      </div>

      {/* Connection Status & Actions */}
      <div className="flex items-center gap-3">
        {/* Connected Status Badge */}
        <div className="flex items-center gap-2">
          {status ? (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-surface-input rounded border border-border-input/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-text-subtle">Connected</span>
            </div>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Disconnected
            </Badge>
          )}

          {/* Reconnect Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReconnect}
            disabled={isLoading}
            className="h-8 w-8 text-text-subtle hover:text-white hover:bg-white/10"
            title="Reconnect"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* User Info (optional tooltip or display) */}
        {status?.user?.email && (
          <div className="text-xs text-text-subtle hidden md:block">
            {status.user.email}
          </div>
        )}
      </div>
    </header>
  );
};
