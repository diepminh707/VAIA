/**
 * Utility functions for system prompt management and composition
 */

import { SYSTEM_PROMPTS, SystemPrompt, ImageType } from '@/shared/systemPrompts';

/**
 * Determines which image types have been uploaded based on uploaded IDs
 */
export function getUploadedImageTypes(
  subjectImageIds: string[],
  modelImageIds: string[],
  styleImageIds: string[]
): ImageType[] {
  const types: ImageType[] = [];

  if (subjectImageIds.length > 0) {
    types.push('product');
  }
  if (modelImageIds.length > 0) {
    types.push('model');
  }
  if (styleImageIds.length > 0) {
    types.push('style');
  }

  return types;
}

/**
 * Filters system prompts based on uploaded image types
 * Only returns prompts where ALL required images have been uploaded
 */
export function getAvailablePrompts(uploadedTypes: ImageType[]): SystemPrompt[] {
  return SYSTEM_PROMPTS.filter((prompt) => {
    // Check if all required images for this prompt have been uploaded
    return prompt.requiredImages.every((required) => uploadedTypes.includes(required));
  });
}

/**
 * Composes final prompt by replacing placeholder with user's custom text
 */
export function composePrompt(systemPromptId: string, userText: string): string {
  const prompt = SYSTEM_PROMPTS.find((p) => p.id === systemPromptId);

  if (!prompt) {
    // If no system prompt selected, return user text as-is
    return userText;
  }

  // Replace the placeholder with user's custom text
  const placeholder = '[USER_CUSTOM_PROMPT]';
  return prompt.template.replace(placeholder, userText || 'Create a professional promotional poster.');
}

/**
 * Gets a system prompt by ID
 */
export function getSystemPromptById(id: string): SystemPrompt | undefined {
  return SYSTEM_PROMPTS.find((p) => p.id === id);
}

/**
 * Validates if selected prompt matches uploaded images
 * Returns error message if validation fails, undefined if valid
 */
export function validatePromptSelection(
  systemPromptId: string | null,
  uploadedTypes: ImageType[]
): string | undefined {
  if (!systemPromptId) {
    return undefined; // No validation needed for custom prompts
  }

  const prompt = getSystemPromptById(systemPromptId);
  if (!prompt) {
    return 'Invalid system prompt selected';
  }

  const missingImages = prompt.requiredImages.filter((required) => !uploadedTypes.includes(required));

  if (missingImages.length > 0) {
    const missingNames = missingImages.map((type) => {
      switch (type) {
        case 'product':
          return 'Subject Images';
        case 'model':
          return 'Model Image';
        case 'style':
          return 'Style Image';
        default:
          return type;
      }
    });
    return `Missing required images: ${missingNames.join(', ')}`;
  }

  return undefined;
}
