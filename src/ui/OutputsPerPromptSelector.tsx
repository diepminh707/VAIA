import React from 'react';
import { Copy } from 'lucide-react';

interface OutputsPerPromptSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export const OutputsPerPromptSelector: React.FC<OutputsPerPromptSelectorProps> = ({
  value,
  onChange,
}) => {
  const options = [1, 2, 3, 4];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-white text-sm font-bold uppercase tracking-wider flex items-center gap-2">
        <Copy className="h-4 w-4" />
        Outputs Per Prompt
      </label>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              px-4 py-2.5 rounded-lg font-semibold text-sm transition-all
              ${
                value === option
                  ? 'bg-primary text-white shadow-[0_0_15px_-3px_#8c2bee]'
                  : 'bg-surface-input text-text-subtle hover:bg-surface-input/80 hover:text-white border border-border-input'
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Generate {value} image{value > 1 ? 's' : ''} per prompt
        {value > 1 && ` (total: ${value} images)`}
      </p>
    </div>
  );
};