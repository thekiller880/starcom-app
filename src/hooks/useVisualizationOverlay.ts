import { useContext } from 'react';
import { VisualizationOverlayContext } from '../context/VisualizationOverlayContextStore';

export const useVisualizationOverlay = () => {
  const context = useContext(VisualizationOverlayContext);
  if (!context) {
    throw new Error('useVisualizationOverlay must be used within a VisualizationOverlayProvider');
  }
  return context;
};
