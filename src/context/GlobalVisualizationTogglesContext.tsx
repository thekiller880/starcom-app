import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

interface GlobalVisualizationTogglesContextType {
  nationalTerritoriesEnabled: boolean;
  setNationalTerritoriesEnabled: (enabled: boolean) => void;
  toggleNationalTerritoriesEnabled: () => void;
}

const STORAGE_KEY = 'global-visualization-toggles';

const loadInitialNationalTerritoriesEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw) as Partial<{ nationalTerritoriesEnabled: boolean }>;
    return parsed.nationalTerritoriesEnabled === true;
  } catch {
    return false;
  }
};

const persistNationalTerritoriesEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nationalTerritoriesEnabled: enabled }));
  } catch {
    // Best-effort persistence only
  }
};

const GlobalVisualizationTogglesContext = createContext<GlobalVisualizationTogglesContextType | undefined>(undefined);

export const GlobalVisualizationTogglesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nationalTerritoriesEnabled, setNationalTerritoriesEnabledState] = useState<boolean>(
    () => loadInitialNationalTerritoriesEnabled()
  );

  const setNationalTerritoriesEnabled = useCallback((enabled: boolean) => {
    setNationalTerritoriesEnabledState(enabled);
    persistNationalTerritoriesEnabled(enabled);
  }, []);

  const toggleNationalTerritoriesEnabled = useCallback(() => {
    setNationalTerritoriesEnabledState((previous) => {
      const next = !previous;
      persistNationalTerritoriesEnabled(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    nationalTerritoriesEnabled,
    setNationalTerritoriesEnabled,
    toggleNationalTerritoriesEnabled
  }), [nationalTerritoriesEnabled, setNationalTerritoriesEnabled, toggleNationalTerritoriesEnabled]);

  return (
    <GlobalVisualizationTogglesContext.Provider value={value}>
      {children}
    </GlobalVisualizationTogglesContext.Provider>
  );
};

export const useGlobalVisualizationToggles = (): GlobalVisualizationTogglesContextType => {
  const context = useContext(GlobalVisualizationTogglesContext);
  if (!context) {
    throw new Error('useGlobalVisualizationToggles must be used within a GlobalVisualizationTogglesProvider');
  }
  return context;
};
