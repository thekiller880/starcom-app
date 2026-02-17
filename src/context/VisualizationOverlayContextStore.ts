import { createContext } from 'react';

export interface VisualizationOverlayContextType {
  nationalTerritoriesOverlayEnabled: boolean;
  setNationalTerritoriesOverlayEnabled: (enabled: boolean) => void;
  toggleNationalTerritoriesOverlay: () => void;
  cursorTrailIndicatorEnabled: boolean;
  setCursorTrailIndicatorEnabled: (enabled: boolean) => void;
  toggleCursorTrailIndicator: () => void;
}

export const VisualizationOverlayContext = createContext<VisualizationOverlayContextType | undefined>(undefined);
