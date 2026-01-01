import { useContext } from 'react';
import { MediaContext, MediaContextState } from '@/contexts/MediaContext';

/**
 * Custom hook to access MediaContext
 * Must be used within MediaProvider
 */
export const useMediaContext = (): MediaContextState => {
  const context = useContext(MediaContext);

  if (!context) {
    throw new Error('useMediaContext must be used within MediaProvider');
  }

  return context;
};
