import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface GlobeLoadingContextType {
  hasGlobeLoadedBefore: boolean;
  markGlobeAsLoaded: () => void;
  isGlobeInitialized: boolean;
  setGlobeInitialized: (initialized: boolean) => void;
}

const GlobeLoadingContext = createContext<GlobeLoadingContextType | undefined>(undefined);

interface GlobeLoadingProviderProps {
  children: ReactNode;
}

export const GlobeLoadingProvider: React.FC<GlobeLoadingProviderProps> = ({ children }) => {
  const [hasGlobeLoadedBefore, setHasGlobeLoadedBefore] = useState(false);
  const [isGlobeInitialized, setIsGlobeInitialized] = useState(false);

  const markGlobeAsLoaded = useCallback(() => {
    setHasGlobeLoadedBefore(true);
  }, []);

  const setGlobeInitialized = useCallback((initialized: boolean) => {
    setIsGlobeInitialized(initialized);
  }, []);

  const contextValue = useMemo(() => ({
    hasGlobeLoadedBefore,
    markGlobeAsLoaded,
    isGlobeInitialized,
    setGlobeInitialized
  }), [hasGlobeLoadedBefore, markGlobeAsLoaded, isGlobeInitialized, setGlobeInitialized]);

  return (
    <GlobeLoadingContext.Provider value={contextValue}>
      {children}
    </GlobeLoadingContext.Provider>
  );
};

export const useGlobeLoading = () => {
  const context = useContext(GlobeLoadingContext);
  if (!context) {
    throw new Error('useGlobeLoading must be used within a GlobeLoadingProvider');
  }
  return context;
};
