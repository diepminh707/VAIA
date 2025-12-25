import React from 'react';
import { cn } from '@/lib/utils';

interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const aspectRatios = [
  { value: 'IMAGE_ASPECT_RATIO_SQUARE', label: '1:1', icon: 'w-6 h-6' },
  { value: 'IMAGE_ASPECT_RATIO_LANDSCAPE', label: '16:9', icon: 'w-8 h-5' },
  { value: 'IMAGE_ASPECT_RATIO_PORTRAIT', label: '9:16', icon: 'w-4 h-7' },
  { value: 'IMAGE_ASPECT_RATIO_4_3', label: '4:3', icon: 'w-6 h-5' },
];

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-white text-sm font-bold uppercase tracking-wider">
        Aspect Ratio
      </label>
      <div className="grid grid-cols-4 gap-2">
        {aspectRatios.map((ratio) => (
          <button
            key={ratio.value}
            type="button"
            onClick={() => onChange(ratio.value)}
            className={cn(
              "group flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
              value === ratio.value
                ? "border-primary bg-primary/10 hover:bg-primary/20"
                : "border-border-input bg-surface-input hover:border-primary/50 hover:bg-surface-input/80"
            )}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <div
                className={cn(
                  "border-2 rounded-sm",
                  value === ratio.value
                    ? "border-primary bg-primary/20"
                    : "border-text-subtle group-hover:border-white",
                  ratio.icon
                )}
              ></div>
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                value === ratio.value
                  ? "text-white"
                  : "text-text-subtle group-hover:text-white"
              )}
            >
              {ratio.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
