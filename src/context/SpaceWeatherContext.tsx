/* eslint-disable react-refresh/only-export-components */
// src/context/SpaceWeatherContext.tsx
// AI-NOTE: Context for sharing space weather data and settings across components
// Bridges the gap between settings, data fetching, and Globe visualization
// Enhanced with enterprise capabilities and advanced data processing

import React, { createContext, ReactNode, useState, useCallback, useEffect, useRef } from 'react';
import { useEcoNaturalSettings } from '../hooks/useEcoNaturalSettings';
import { useSpaceWeatherData } from '../hooks/useSpaceWeatherData';
import { useEnterpriseSpaceWeatherData } from '../hooks/useEnterpriseSpaceWeatherData';
import { useVisualizationMode } from './VisualizationModeContext';
import { DataTransformService } from '../services/data-management/DataTransformService';
import { DataQualityService, DataQualityMetrics } from '../services/data-management/DataQualityService';
import type { SpaceWeatherAlert } from '../types';
import { createAdapterOrchestrator } from '../services/space-weather/AdapterOrchestrator';
import { createNoaaInterMagAdapter } from '../services/space-weather/adapters/NoaaInterMagAdapter';
import { createNoaaUSCanadaAdapter } from '../services/space-weather/adapters/NoaaUSCanadaAdapter';
import { spaceWeatherDiagnostics, SpaceWeatherDiagnosticsState } from '../services/space-weather/SpaceWeatherDiagnostics';
import { visualizationResourceMonitor } from '../services/visualization/VisualizationResourceMonitor';
import { pollerRegistry, type PollerHandle } from '../services/pollerRegistry';
import { combineScopes, makeModeScope, makeRouteScope } from '../services/pollerScopes';
// Tertiary mode data hooks (Phase 1 stubs)
import { useGeomagneticData } from '../hooks/useGeomagneticData';
import { useAuroralOvalData } from '../hooks/useAuroralOvalData';
import { useSolarWindData } from '../hooks/useSolarWindData';
import { useMagnetopauseData } from '../hooks/useMagnetopauseData';
import { useMagneticFieldData } from '../hooks/useMagneticFieldData';
import {
  SPACE_WEATHER_MODE_KEY,
  type DataProvider,
  type SpaceWeatherContextType,
  type VisualizationVector
} from './spaceWeather/spaceWeatherContext.types';
import { useSpaceWeatherVisualization } from './spaceWeather/useSpaceWeatherVisualization';

// Global flag typing for enhanced sampling (Phase 0)
declare global {
  interface Window {
    STARCOM_SPACEWEATHER_ENHANCED_SAMPLING?: boolean;
  }
}

export const SpaceWeatherContext = createContext<SpaceWeatherContextType | undefined>(undefined);

export const SpaceWeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { visualizationMode } = useVisualizationMode();
  const [currentProvider, setCurrentProvider] = useState<DataProvider>('legacy');
  const [providerStatus, setProviderStatus] = useState({
    legacy: { available: true, lastTested: new Date() },
    enterprise: { available: true, lastTested: new Date() },
    enhanced: { available: true, lastTested: new Date() }
  });
  
  // Enhanced feature flags
  const [enableDataCorrelation, setEnableDataCorrelation] = useState(false);
  const [enableQualityAssessment, setEnableQualityAssessment] = useState(false);
  
  // Enhanced data state
  const [qualityMetrics, setQualityMetrics] = useState<DataQualityMetrics | undefined>();
  const [enhancedAlerts, setEnhancedAlerts] = useState<SpaceWeatherAlert[]>([]);
  // Pipeline state (Phase 1 wiring)
  const [pipelineVectors, setPipelineVectors] = useState<VisualizationVector[] | null>(null);
  const [pipelineMeta, setPipelineMeta] = useState<null | { adapterCount: number; fetchMs: number; failures: number; totalVectors: number; lastFetch: number }>(null);
  const [lastPipelineError, setLastPipelineError] = useState<string | null>(null);
  const pipelinePollerHandleRef = useRef<PollerHandle | null>(null);
  const orchestratorRef = useRef<ReturnType<typeof createAdapterOrchestrator> | null>(null);
  const [diagnosticsState, setDiagnosticsState] = useState<SpaceWeatherDiagnosticsState>(() => spaceWeatherDiagnostics.getState());

  // Subscribe to diagnostics store so context stays in sync with backend instrumentation
  useEffect(() => {
    const unsubscribe = spaceWeatherDiagnostics.subscribe(setDiagnosticsState);
    return () => unsubscribe();
  }, []);

  const { 
    config, 
    updateSpaceWeather, 
    isElectricFieldsEnabled,
    vectorSettings,
    dataSettings 
  } = useEcoNaturalSettings();

  // Tertiary mode activation flags
  const geomagneticActive = config.spaceWeather.showGeomagneticIndex === true;
  const auroralOvalActive = config.spaceWeather.showAuroralOval === true;
  const solarWindActive = config.spaceWeather.showSolarWind === true;
  const magnetopauseActive = config.spaceWeather.showMagnetopause === true;
  const magneticFieldActive = config.spaceWeather.showMagneticField === true;

  // Mode data hooks (mock/stub data)
  const geomagnetic = useGeomagneticData(geomagneticActive);
  const auroralOval = useAuroralOvalData(auroralOvalActive);
  const solarWind = useSolarWindData(solarWindActive);
  const magnetopause = useMagnetopauseData(magnetopauseActive);
  const magneticField = useMagneticFieldData(magneticFieldActive);
  
  // Data providers
  const legacyData = useSpaceWeatherData({
    autoRefresh: currentProvider === 'legacy' ? dataSettings.autoRefresh : false,
    refreshInterval: dataSettings.refreshIntervalMs,
    enableAlerts: config.spaceWeather.showAlerts
  });

  const enterpriseData = useEnterpriseSpaceWeatherData({
    autoRefresh: ['enterprise', 'enhanced'].includes(currentProvider) ? dataSettings.autoRefresh : false,
    refreshInterval: dataSettings.refreshIntervalMs,
    enableAlerts: config.spaceWeather.showAlerts
  });

  // Get active data based on current provider
  const baseData = ['enhanced', 'enterprise'].includes(currentProvider) ? enterpriseData : legacyData;

  // Service instances for enhanced mode
  const [_transformService] = useState(() => DataTransformService.getInstance());
  const [qualityService] = useState(() => DataQualityService.getInstance());

  // Provider switching logic
  const switchProvider = useCallback((provider: DataProvider) => {
    console.log(`🔄 SpaceWeather: Switching from ${currentProvider} to ${provider} provider`);
    setCurrentProvider(provider);
    
    setProviderStatus(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        lastTested: new Date()
      }
    }));
  }, [currentProvider]);

  // Enhanced data processing for enhanced mode
  const processEnhancedData = useCallback(async () => {
    if (currentProvider !== 'enhanced' || (!enableDataCorrelation && !enableQualityAssessment)) {
      return;
    }

    if (!baseData.interMagData && !baseData.usCanadaData) {
      return;
    }

    try {
      // Quality assessment
      if (enableQualityAssessment) {
        const qualityPromises: Promise<DataQualityMetrics>[] = [];
        
        if (baseData.interMagData) {
          qualityPromises.push(qualityService.assessDataQuality(baseData.interMagData));
        }
        if (baseData.usCanadaData) {
          qualityPromises.push(qualityService.assessDataQuality(baseData.usCanadaData));
        }

        if (qualityPromises.length > 0) {
          const qualityResults = await Promise.all(qualityPromises);
          
          // Combine quality metrics (average scores)
          const combinedMetrics: DataQualityMetrics = {
            overall: qualityResults.reduce((sum, q) => sum + q.overall, 0) / qualityResults.length,
            completeness: qualityResults.reduce((sum, q) => sum + q.completeness, 0) / qualityResults.length,
            accuracy: qualityResults.reduce((sum, q) => sum + q.accuracy, 0) / qualityResults.length,
            timeliness: qualityResults.reduce((sum, q) => sum + q.timeliness, 0) / qualityResults.length,
            consistency: qualityResults.reduce((sum, q) => sum + q.consistency, 0) / qualityResults.length,
            coverage: qualityResults.reduce((sum, q) => sum + q.coverage, 0) / qualityResults.length,
            issues: qualityResults.flatMap(q => q.issues),
            recommendations: [...new Set(qualityResults.flatMap(q => q.recommendations))]
          };

          setQualityMetrics(combinedMetrics);

          // Generate quality-based alerts
          const qualityAlerts: SpaceWeatherAlert[] = [];
          for (const dataset of [baseData.interMagData, baseData.usCanadaData]) {
            if (dataset) {
              const alerts = await qualityService.validateForAlerts(dataset);
              qualityAlerts.push(...alerts);
            }
          }
          setEnhancedAlerts(qualityAlerts);

          console.log(`📊 SpaceWeather: Quality assessment complete (overall: ${(combinedMetrics.overall * 100).toFixed(1)}%)`);
        }
      }

    } catch (error) {
      console.error('❌ SpaceWeather: Enhanced processing failed:', error);
    }
  }, [baseData.interMagData, baseData.usCanadaData, currentProvider, enableDataCorrelation, enableQualityAssessment, qualityService]);

  // Monitor provider health and run enhanced processing
  useEffect(() => {
    if (baseData.error) {
      const errorMessage = `${currentProvider} provider error: ${baseData.error}`;
      console.warn('🚨 SpaceWeather:', errorMessage);
      
      setProviderStatus(prev => ({
        ...prev,
        [currentProvider]: {
          ...prev[currentProvider],
          available: false,
          error: errorMessage,
          lastTested: new Date()
        }
      }));

      // Auto-failover logic (enhanced -> enterprise -> legacy)
      if (currentProvider === 'enhanced' && providerStatus.enterprise.available) {
        console.log('🔄 SpaceWeather: Auto-switching to enterprise provider');
        switchProvider('enterprise');
      } else if (currentProvider === 'enterprise' && providerStatus.legacy.available) {
        console.log('🔄 SpaceWeather: Auto-switching to legacy provider');
        switchProvider('legacy');
      }
      
    } else if (baseData.lastUpdated) {
      // Provider is working
      setProviderStatus(prev => ({
        ...prev,
        [currentProvider]: {
          ...prev[currentProvider],
          available: true,
          error: undefined,
          lastTested: new Date()
        }
      }));

      // Run enhanced processing when data updates
      if (currentProvider === 'enhanced') {
        processEnhancedData();
      }
    }
  }, [baseData.error, baseData.lastUpdated, currentProvider, providerStatus, switchProvider, processEnhancedData]);

  // Check if we should show space weather visualization based on mode
  const activeLayer = config.spaceWeather.activeLayer;
  const shouldShowSpaceWeatherVisualization = (
    visualizationMode.mode === 'EcoNatural' &&
    visualizationMode.subMode === 'SpaceWeather' &&
    isElectricFieldsEnabled
  );
  const { visualizationVectors, telemetry, telemetryHistory, resetVisualizationCache } = useSpaceWeatherVisualization({
    settings: config.spaceWeather,
    vectorSettings,
    interMagData: baseData.interMagData,
    usCanadaData: baseData.usCanadaData,
    pipelineVectors,
    pipelineMeta,
    lastPipelineError,
    currentProvider,
    isElectricFieldsEnabled,
    shouldShowSpaceWeatherVisualization,
    diagnosticsState,
    geomagneticActive,
    auroralOvalActive,
    solarWindActive,
    magnetopauseActive,
    magneticFieldActive,
    geomagnetic,
    auroralOval,
    solarWind,
    magnetopause,
    magneticField
  });

  // Pipeline async fetch effect
  useEffect(() => {
    const stopPipelinePoller = () => {
      if (pipelinePollerHandleRef.current) {
        pipelinePollerHandleRef.current.stop();
        pipelinePollerHandleRef.current = null;
      }
    };

    const disposeOrchestrator = () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.clear();
        orchestratorRef.current = null;
      }
    };

    const resetPipelineState = () => {
      setPipelineVectors(null);
      setPipelineMeta(null);
      setLastPipelineError(null);
      resetVisualizationCache();
      visualizationResourceMonitor.clearMode(SPACE_WEATHER_MODE_KEY);
    };

    const tearDownPipeline = () => {
      stopPipelinePoller();
      disposeOrchestrator();
      resetPipelineState();
    };

    if (!(config.spaceWeather.pipelineEnabled && config.spaceWeather.enabledDatasets.pipeline && shouldShowSpaceWeatherVisualization)) {
      tearDownPipeline();
      return () => tearDownPipeline();
    }
    // Lazy init orchestrator
    if (!orchestratorRef.current) {
      try {
        orchestratorRef.current = createAdapterOrchestrator()
          .register(createNoaaInterMagAdapter())
          .register(createNoaaUSCanadaAdapter());
      } catch (e) {
        console.warn('Pipeline orchestrator creation failed', e);
        return;
      }
    }
    const fetchPipeline = async (signal: AbortSignal) => {
      if (!orchestratorRef.current || signal.aborted) return;
      try {
        const start = performance.now();
        const result = await orchestratorRef.current.fetchAll();
        if (signal.aborted) return;
        const fetchMs = performance.now() - start;
        setPipelineMeta({
          adapterCount: result.metrics.adapterCount,
          fetchMs,
          failures: result.metrics.failures,
          totalVectors: result.metrics.totalVectors,
          lastFetch: Date.now()
        });
        setLastPipelineError(null);
        // Adapt vectors minimally (VisualizationVector partial); further normalization occurs in memo
        setPipelineVectors(result.vectors.map(v => ({
          latitude: v.latitude,
          longitude: v.longitude,
          magnitude: v.magnitude,
          direction: v.direction,
          quality: v.quality,
          intensity: 1,
          opacity: 1,
          color: '#fff',
          size: 1
        })));
      } catch (e) {
        if (signal.aborted) return;
        const message = e instanceof Error ? e.message : 'Unknown pipeline error';
        console.warn('Pipeline fetch failed', message);
        setLastPipelineError(message);
        setPipelineMeta(prev => ({
          adapterCount: prev?.adapterCount ?? 0,
          fetchMs: prev?.fetchMs ?? 0,
          failures: (prev?.failures ?? 0) + 1,
          totalVectors: prev?.totalVectors ?? 0,
          lastFetch: Date.now()
        }));
      }
    };
    const intervalMs = Math.max(15_000, dataSettings.refreshIntervalMs || 60_000); // floor 15s
    const scopeTags = combineScopes(
      makeModeScope(visualizationMode.mode),
      makeRouteScope('cybercommand'),
      'spaceWeather'
    );

    pipelinePollerHandleRef.current = pollerRegistry.register('space-weather-pipeline', fetchPipeline, {
      intervalMs,
      minIntervalMs: 15_000,
      jitterMs: 1_000,
      immediate: true,
      scope: scopeTags
    });
    return () => {
      tearDownPipeline();
    };
  }, [config.spaceWeather.pipelineEnabled, config.spaceWeather.enabledDatasets, shouldShowSpaceWeatherVisualization, dataSettings.refreshIntervalMs, visualizationMode.mode]);

  const contextValue: SpaceWeatherContextType = {
    // Settings
    settings: config.spaceWeather,
    updateSettings: updateSpaceWeather,
    isElectricFieldsEnabled,
    
    // Data
    interMagData: baseData.interMagData,
    usCanadaData: baseData.usCanadaData,
    alerts: baseData.alerts,
    isLoading: baseData.isLoading,
    error: baseData.error,
    lastUpdated: baseData.lastUpdated,
    refresh: baseData.refresh,
    
    // Provider management (enhanced capabilities)
    currentProvider,
    switchProvider,
    providerStatus,
    
    // Enhanced data insights
    qualityMetrics,
    enhancedAlerts,
    
    // Enhanced feature controls
    enableDataCorrelation,
    setEnableDataCorrelation,
    enableQualityAssessment,
    setEnableQualityAssessment,
    
    // Computed
  shouldShowOverlay: shouldShowSpaceWeatherVisualization,
  visualizationVectors,
    telemetry,
    telemetryHistory,
    diagnostics: diagnosticsState
  };

  return (
    <SpaceWeatherContext.Provider value={contextValue}>
      {children}
    </SpaceWeatherContext.Provider>
  );
};

export default SpaceWeatherProvider;
export type { SpaceWeatherContextType } from './spaceWeather/spaceWeatherContext.types';

export const useSpaceWeatherContext = () => {
  const ctx = React.useContext(SpaceWeatherContext);
  if (!ctx) throw new Error('useSpaceWeatherContext must be used within a SpaceWeatherProvider');
  return ctx;
};
