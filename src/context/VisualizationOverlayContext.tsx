import React, { useMemo, useState, useCallback } from 'react';
import { VisualizationOverlayContext } from './VisualizationOverlayContextStore';

const STORAGE_KEY = 'visualization-overlay-settings';

const loadInitialNationalTerritoriesOverlayEnabled = (): boolean => {
  return true;
};

const loadInitialCursorTrailIndicatorEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return true;
    }
    const parsed = JSON.parse(raw) as { cursorTrailIndicatorEnabled?: boolean };
    return parsed.cursorTrailIndicatorEnabled !== false;
  } catch {
    return true;
  }
};

export const VisualizationOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nationalTerritoriesOverlayEnabled, setNationalTerritoriesOverlayEnabledState] = useState<boolean>(() => loadInitialNationalTerritoriesOverlayEnabled());
  const [cursorTrailIndicatorEnabled, setCursorTrailIndicatorEnabledState] = useState<boolean>(() => loadInitialCursorTrailIndicatorEnabled());

  const persist = useCallback((cursorTrailEnabled: boolean) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nationalTerritoriesOverlayEnabled: true,
          cursorTrailIndicatorEnabled: cursorTrailEnabled
        })
      );
    } catch {
      // ignore storage failures
    }
  }, []);

  const setNationalTerritoriesOverlayEnabled = useCallback((enabled: boolean) => {
    void enabled;
    setNationalTerritoriesOverlayEnabledState(true);
    persist(cursorTrailIndicatorEnabled);
  }, [cursorTrailIndicatorEnabled, persist]);

  const toggleNationalTerritoriesOverlay = useCallback(() => {
    setNationalTerritoriesOverlayEnabledState(true);
    persist(cursorTrailIndicatorEnabled);
  }, [cursorTrailIndicatorEnabled, persist]);

  const setCursorTrailIndicatorEnabled = useCallback((enabled: boolean) => {
    setCursorTrailIndicatorEnabledState(enabled);
    persist(enabled);
  }, [persist]);

  const toggleCursorTrailIndicator = useCallback(() => {
    setCursorTrailIndicatorEnabledState((previous) => {
      const next = !previous;
      persist(next);
      return next;
    });
  }, [persist]);

  const contextValue = useMemo(
    () => ({
      nationalTerritoriesOverlayEnabled,
      setNationalTerritoriesOverlayEnabled,
      toggleNationalTerritoriesOverlay,
      cursorTrailIndicatorEnabled,
      setCursorTrailIndicatorEnabled,
      toggleCursorTrailIndicator
    }),
    [
      nationalTerritoriesOverlayEnabled,
      setNationalTerritoriesOverlayEnabled,
      toggleNationalTerritoriesOverlay,
      cursorTrailIndicatorEnabled,
      setCursorTrailIndicatorEnabled,
      toggleCursorTrailIndicator
    ]
  );

  return (
    <VisualizationOverlayContext.Provider value={contextValue}>
      {children}
    </VisualizationOverlayContext.Provider>
  );
};

