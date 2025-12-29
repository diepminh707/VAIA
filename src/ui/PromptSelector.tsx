/**
 * PromptSelector Component
 *
 * Allows users to select from system prompt templates.
 * Selecting a template will show/hide appropriate image uploaders.
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { SYSTEM_PROMPTS } from '@/shared/systemPrompts';

interface PromptSelectorProps {
  selectedPromptId: string | null;
  onPromptChange: (promptId: string | null) => void;
}

export const PromptSelector: React.FC<PromptSelectorProps> = ({
  selectedPromptId,
  onPromptChange,
}) => {
  const availablePrompts = SYSTEM_PROMPTS;

  // Handle selection change
  const handleValueChange = (value: string) => {
    if (value === 'none') {
      onPromptChange(null);
    } else {
      onPromptChange(value);
    }
  };

  // Get selected prompt title for display (only title, no description)
  const getSelectedPromptDisplay = () => {
    if (!selectedPromptId) {
      return <span className="text-white">None (Custom)</span>;
    }

    const selected = availablePrompts.find(p => p.id === selectedPromptId);
    if (!selected) return null;

    return <span className="text-white">{selected.name}</span>;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        System Prompt Template
      </label>
      <Select
        value={selectedPromptId || 'none'}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {getSelectedPromptDisplay()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-surface-dark border-border-dark">
          <SelectGroup>
            <SelectLabel className="text-text-subtle">Available Templates</SelectLabel>
            <SelectItem
              value="none"
              className="cursor-pointer text-white hover:bg-surface-input focus:bg-surface-input focus:text-white data-[highlighted]:bg-surface-input data-[highlighted]:text-white py-3"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-medium">None (Custom)</span>
                <span className="text-xs text-muted-foreground">
                  Use your own custom prompt with any images
                </span>
              </div>
            </SelectItem>
            {availablePrompts.map((prompt) => (
              <SelectItem
                key={prompt.id}
                value={prompt.id}
                className="cursor-pointer text-white hover:bg-surface-input focus:bg-surface-input focus:text-white data-[highlighted]:bg-surface-input data-[highlighted]:text-white py-3"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{prompt.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {prompt.description}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {selectedPromptId && (
        <p className="text-xs text-muted-foreground">
          📌 Image uploaders shown based on selected template
        </p>
      )}
    </div>
  );
};
