import React, { useEffect, useMemo, useRef } from 'react';
import type { ElectricFieldVector, ProcessedElectricFieldData } from '../../types';
import { normalizeElectricFieldVectors, type NormalizationConfig } from '../../utils/electricFieldNormalization';
import { visualizationResourceMonitor } from '../../services/visualization/VisualizationResourceMonitor';
import {
  getSpaceWeatherTelemetryHistory,
  recordSpaceWeatherTelemetrySnapshot,
  type SpaceWeatherTelemetrySnapshot
} from '../../utils/spaceWeatherTelemetryTracker';
import {
  DIAGNOSTIC_ENTRY_BYTES_ESTIMATE,
  PIPELINE_VECTOR_BYTES_ESTIMATE,
  SPACE_WEATHER_MODE_KEY,
  VECTOR_BYTES_ESTIMATE,
  type DataProvider,
  type SpaceWeatherSettings,
  type SpaceWeatherTelemetry,
  type VisualizationVector
} from './spaceWeatherContext.types';
import type { SpaceWeatherDiagnosticsState } from '../../services/space-weather/SpaceWeatherDiagnostics';
import { EMPTY_TELEMETRY } from './spaceWeatherTelemetryDefaults';

type TertiaryDatum<T> = {
  data: T | null;
  lastUpdated: Date | null;
};
interface UseSpaceWeatherVisualizationParams {
  settings: SpaceWeatherSettings;
  vectorSettings: {
    intensity: number;
    opacity: number;
  };
  interMagData: ProcessedElectricFieldData | null;
  usCanadaData: ProcessedElectricFieldData | null;
  pipelineVectors: VisualizationVector[] | null;
  pipelineMeta: null | { adapterCount: number; fetchMs: number; failures: number; totalVectors: number; lastFetch: number };
  lastPipelineError: string | null;
  currentProvider: DataProvider;
  isElectricFieldsEnabled: boolean;
  shouldShowSpaceWeatherVisualization: boolean;
  diagnosticsState: SpaceWeatherDiagnosticsState;
  geomagneticActive: boolean;
  auroralOvalActive: boolean;
  solarWindActive: boolean;
  magnetopauseActive: boolean;
  magneticFieldActive: boolean;
  geomagnetic: TertiaryDatum<{ kp?: number | null; quality?: 'live' | 'fallback' | 'stale' }>;
  auroralOval: TertiaryDatum<{ resolution?: string | null; quality?: 'live' | 'fallback' | 'stale' }>;
  solarWind: TertiaryDatum<{ speed?: number | null; density?: number | null; bz?: number | null; quality?: 'live' | 'fallback' | 'stale' }>;
  magnetopause: TertiaryDatum<{ standoffRe?: number | null; quality?: 'live' | 'fallback' | 'stale' }>;
  magneticField: TertiaryDatum<{ sampleCount?: number | null; quality?: 'live' | 'fallback' | 'stale' }>;
}
interface UseSpaceWeatherVisualizationResult {
  visualizationVectors: VisualizationVector[];
  telemetry: SpaceWeatherTelemetry;
  telemetryHistory: SpaceWeatherTelemetrySnapshot[];
  resetVisualizationCache: () => void;
}
type VectorDataset = 'intermag' | 'uscanada' | 'pipeline';
interface RawVectorLike {
  latitude: number;
  longitude: number;
  magnitude: number;
  direction: number;
  quality: number;
  ex: number;
  ey: number;
  stationDistance?: number;
  dataset?: VectorDataset;
}

export const useSpaceWeatherVisualization = ({
  settings,
  vectorSettings,
  interMagData,
  usCanadaData,
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
}: UseSpaceWeatherVisualizationParams): UseSpaceWeatherVisualizationResult => {
  const perfRef = useRef({ samplingMs: 0, normalizationMs: 0, totalMs: 0, degraded: false, degradationStages: [] as number[] });
  const vectorCacheRef = useRef<{ key?: string; vectors: VisualizationVector[] }>({ key: undefined, vectors: [] });

  const resetVisualizationCache = React.useCallback(() => {
    vectorCacheRef.current = { key: undefined, vectors: [] };
  }, []);
  const visualizationVectors = useMemo(() => {
    if (!shouldShowSpaceWeatherVisualization) {
      return [];
    }

    const cacheKey = [
      interMagData?.timestamp || 'none',
      usCanadaData?.timestamp || 'none',
      settings.enhancedSampling ? 1 : 0,
      settings.samplingMode || 'legacy-topN',
      settings.gridBinSize,
      settings.legacyCap,
      settings.magnitudeFloor,
      settings.normalization.method,
      settings.normalization.outlierFactor,
      settings.normalization.smoothingFactor,
      settings.pipelineEnabled ? 1 : 0,
      settings.enabledDatasets.intermag ? 1 : 0,
      settings.enabledDatasets.usCanada ? 1 : 0,
      settings.enabledDatasets.pipeline ? 1 : 0
    ].join('|');

    const cache = vectorCacheRef.current;
    if (cache.key === cacheKey) return cache.vectors;

    const totalStart = performance.now();
    let samplingMs = 0;
    let normalizationMs = 0;
    let degraded = false;
    const degradationStages: number[] = [];

    const pipelineDatasetEnabled = settings.enabledDatasets.pipeline;
    const pipelineActive = settings.pipelineEnabled && pipelineDatasetEnabled && pipelineVectors && pipelineVectors.length > 0;

    const toRaw = (v: ElectricFieldVector, dataset: VectorDataset): RawVectorLike => ({
      latitude: v.latitude,
      longitude: v.longitude,
      magnitude: v.magnitude,
      direction: v.direction,
      quality: v.quality,
      ex: v.ex ?? 0,
      ey: v.ey ?? 0,
      stationDistance: (v as unknown as { stationDistance?: number }).stationDistance ?? 0,
      dataset
    });

    const rawInterMagVectors = interMagData?.vectors ?? [];
    const rawUSCanadaVectors = usCanadaData?.vectors ?? [];
    const activeInterMagVectors = settings.enabledDatasets.intermag ? rawInterMagVectors : [];
    const activeUSCanadaVectors = settings.enabledDatasets.usCanada ? rawUSCanadaVectors : [];

    const sourceVectors: RawVectorLike[] = pipelineActive
      ? pipelineVectors.map(v => ({ latitude: v.latitude, longitude: v.longitude, magnitude: v.magnitude, direction: v.direction, quality: v.quality, ex: 0, ey: 0, stationDistance: 0, dataset: 'pipeline' }))
      : [
          ...(activeInterMagVectors as ElectricFieldVector[]).map(vec => toRaw(vec, 'intermag')),
          ...(activeUSCanadaVectors as ElectricFieldVector[]).map(vec => toRaw(vec, 'uscanada'))
        ];

    if (!sourceVectors.length) return [];

    const magnitudeFloor = Math.max(0, settings.magnitudeFloor ?? 0);
    const filteredVectors = magnitudeFloor > 0
      ? sourceVectors.filter(v => Math.abs(v.magnitude) >= magnitudeFloor)
      : sourceVectors;

    if (!filteredVectors.length) return [];

    const legacySamplingCap = Math.max(50, settings.legacyCap ?? 500);
    const enhancedSamplingEnabled = settings.enhancedSampling === true || window.STARCOM_SPACEWEATHER_ENHANCED_SAMPLING === true;
    const samplingModeSetting: 'legacy-topN' | 'grid-binning' = settings.samplingMode || (enhancedSamplingEnabled ? 'grid-binning' : 'legacy-topN');
    const useGridSampling = samplingModeSetting === 'grid-binning';
    const gridBinSize = Math.max(1, settings.gridBinSize ?? 5);

    let sampledVectors: RawVectorLike[] = [];
    const samplingStart = performance.now();

    const gridSampleVectors = (vectors: RawVectorLike[]) => {
      const bins = new Map<string, RawVectorLike>();
      for (const vector of vectors) {
        if (vector.quality < 1) continue;
        const latBin = Math.floor((vector.latitude + 90) / gridBinSize);
        const lonBin = Math.floor((vector.longitude + 180) / gridBinSize);
        const key = `${latBin}:${lonBin}`;
        const existing = bins.get(key);
        if (!existing) {
          bins.set(key, vector);
          continue;
        }
        const scoreNew = vector.magnitude * (vector.quality || 1);
        const scoreOld = existing.magnitude * (existing.quality || 1);
        if (scoreNew > scoreOld) bins.set(key, vector);
      }
      return Array.from(bins.values());
    };

    if (useGridSampling) {
      if (pipelineActive) {
        sampledVectors = gridSampleVectors(filteredVectors);
      } else {
        const interMagSampled = gridSampleVectors(filteredVectors.filter(v => v.dataset === 'intermag'));
        const usCanadaSampled = gridSampleVectors(filteredVectors.filter(v => v.dataset === 'uscanada'));
        sampledVectors = [...interMagSampled, ...usCanadaSampled];
      }
    } else if (filteredVectors.length > legacySamplingCap) {
      const sortedVectors = filteredVectors
        .filter(v => v.quality >= 1)
        .sort((a, b) => (b.magnitude * b.quality) - (a.magnitude * a.quality));
      sampledVectors = sortedVectors.slice(0, legacySamplingCap);
    } else {
      sampledVectors = filteredVectors.filter(v => v.quality >= 1);
    }

    samplingMs = performance.now() - samplingStart;

    let normalizationConfig: NormalizationConfig = {
      method: settings.normalization.method,
      outlierFactor: settings.normalization.outlierFactor,
      smoothingFactor: settings.normalization.smoothingFactor,
      percentileRange: settings.normalization.percentileRange,
      clampMax: settings.normalization.clampMax || undefined
    };

    const combinedRaw = filteredVectors.length;
    const adaptiveStart = performance.now();
    const normalizedVectorsPrePass = normalizeElectricFieldVectors(sampledVectors as unknown as ElectricFieldVector[], normalizationConfig);
    normalizationMs = performance.now() - adaptiveStart;

    if (combinedRaw > 2500) { degraded = true; degradationStages.push(1); }
    if (normalizationMs > 30) { degraded = true; degradationStages.push(2); }

    if (degraded && (normalizationConfig.method === 'adaptive' || normalizationConfig.smoothingFactor)) {
      normalizationConfig = { ...normalizationConfig, method: 'percentile', smoothingFactor: 0 };
      degradationStages.push(3);
    }

    const normalizedVectors = (degraded && (normalizationConfig.method !== settings.normalization.method || normalizationConfig.smoothingFactor === 0))
      ? normalizeElectricFieldVectors(sampledVectors as unknown as ElectricFieldVector[], normalizationConfig)
      : normalizedVectorsPrePass;

    const finalVectors = normalizedVectors
      .filter(vector => vector.originalMagnitude >= 20 / 1000)
      .map(vector => {
        const scaledIntensity = vector.normalizedMagnitude * vectorSettings.intensity;

        let color: string;
        if (vector.isOutlier) {
          color = `rgba(255, 0, 0, ${Math.min(vectorSettings.opacity * 0.7, 0.8)})`;
        } else if (vector.percentileRank >= 90) {
          color = `rgba(255, 165, 0, ${vectorSettings.opacity})`;
        } else if (vector.percentileRank >= 70) {
          color = `rgba(255, 255, 0, ${vectorSettings.opacity})`;
        } else if (vector.percentileRank >= 50) {
          color = `rgba(128, 255, 0, ${vectorSettings.opacity})`;
        } else {
          color = `rgba(128, 0, 255, ${vectorSettings.opacity})`;
        }

        const datasetTag = (vector as typeof vector & { dataset?: VectorDataset }).dataset;
        const datasetHue = pipelineActive
          ? 'white'
          : datasetTag === 'intermag'
            ? 'cyan'
            : datasetTag === 'uscanada'
              ? 'orange'
              : 'magenta';

        const finalColor = vector.percentileRank >= 50
          ? color
          : (datasetHue === 'cyan' ? `rgba(0,200,255,${vectorSettings.opacity})` : `rgba(255,140,0,${vectorSettings.opacity})`);

        return {
          latitude: vector.latitude,
          longitude: vector.longitude,
          magnitude: vector.originalMagnitude,
          direction: vector.direction,
          quality: vector.quality,
          intensity: scaledIntensity,
          opacity: vectorSettings.opacity,
          color: finalColor,
          size: Math.min(Math.max(scaledIntensity * settings.vectorScale, 0.1), 2.0)
        } satisfies VisualizationVector;
      });

    const totalMs = performance.now() - totalStart;
    perfRef.current = { samplingMs, normalizationMs, totalMs, degraded, degradationStages };

    cache.key = cacheKey;
    cache.vectors = finalVectors;
    return finalVectors;
  }, [
    interMagData,
    usCanadaData,
    vectorSettings,
    settings.vectorScale,
    settings.normalization,
    settings.pipelineEnabled,
    settings.enhancedSampling,
    settings.enabledDatasets,
    settings.gridBinSize,
    settings.legacyCap,
    settings.magnitudeFloor,
    settings.samplingMode,
    shouldShowSpaceWeatherVisualization,
    pipelineVectors
  ]);

  const telemetry = useMemo<SpaceWeatherTelemetry>(() => {
    const datasetPrefs = settings.enabledDatasets;
    const rawInterMagTotal = interMagData?.vectors.length || 0;
    const rawUSCanadaTotal = usCanadaData?.vectors.length || 0;
    const pipelineCountTotal = pipelineVectors?.length || 0;
    const rawInterMag = datasetPrefs.intermag ? rawInterMagTotal : 0;
    const rawUSCanada = datasetPrefs.usCanada ? rawUSCanadaTotal : 0;
    const rawPipeline = datasetPrefs.pipeline ? pipelineCountTotal : 0;
    const enhancedSamplingFlag = settings.enhancedSampling === true || window.STARCOM_SPACEWEATHER_ENHANCED_SAMPLING === true;
    const samplingModeSetting: 'legacy-topN' | 'grid-binning' = settings.samplingMode || (enhancedSamplingFlag ? 'grid-binning' : 'legacy-topN');
    const combinedRaw = rawInterMag + rawUSCanada + rawPipeline;

    let gatingReason: SpaceWeatherTelemetry['gatingReason'] = null;
    if (!shouldShowSpaceWeatherVisualization) {
      if (!isElectricFieldsEnabled) gatingReason = 'disabled';
      else if (combinedRaw === 0) gatingReason = 'noData';
    } else if (settings.activeLayer !== 'electricFields') {
      gatingReason = 'inactiveLayer';
    }

    return {
      rawInterMag,
      rawUSCanada,
      rawPipeline,
      combinedRaw,
      sampled: visualizationVectors.length,
      rendered: visualizationVectors.length,
      samplingStrategy: samplingModeSetting,
      unit: 'mV/km',
      gatingReason,
      timings: { samplingMs: perfRef.current.samplingMs, normalizationMs: perfRef.current.normalizationMs, totalMs: perfRef.current.totalMs },
      degraded: perfRef.current.degraded,
      degradationStages: perfRef.current.degradationStages,
      pipeline: pipelineMeta ? {
        adapterCount: pipelineMeta.adapterCount,
        failures: pipelineMeta.failures,
        fetchMs: pipelineMeta.fetchMs,
        totalVectors: pipelineMeta.totalVectors,
        lastFetch: pipelineMeta.lastFetch,
        lastError: lastPipelineError
      } : null,
      pipelineActive: !!(settings.pipelineEnabled && datasetPrefs.pipeline && pipelineMeta),
      modes: {
        geomagnetic: { active: geomagneticActive, kp: geomagnetic.data?.kp ?? null, lastUpdate: geomagnetic.lastUpdated?.getTime() ?? null, quality: geomagnetic.data?.quality ?? 'live' },
        auroralOval: { active: auroralOvalActive, resolution: auroralOval.data?.resolution ?? null, lastUpdate: auroralOval.lastUpdated?.getTime() ?? null, quality: auroralOval.data?.quality ?? 'live' },
        solarWind: { active: solarWindActive, speed: solarWind.data?.speed ?? null, density: solarWind.data?.density ?? null, bz: solarWind.data?.bz ?? null, lastUpdate: solarWind.lastUpdated?.getTime() ?? null, quality: solarWind.data?.quality ?? 'live' },
        magnetopause: { active: magnetopauseActive, standoffRe: magnetopause.data?.standoffRe ?? null, lastUpdate: magnetopause.lastUpdated?.getTime() ?? null, quality: magnetopause.data?.quality ?? 'live' },
        magneticField: { active: magneticFieldActive, sampleCount: magneticField.data?.sampleCount ?? null, lastUpdate: magneticField.lastUpdated?.getTime() ?? null, quality: magneticField.data?.quality ?? 'live' }
      },
      diagnostics: diagnosticsState
    };
  }, [
    interMagData,
    usCanadaData,
    visualizationVectors,
    settings.enhancedSampling,
    settings.samplingMode,
    settings.activeLayer,
    settings.enabledDatasets,
    settings.pipelineEnabled,
    isElectricFieldsEnabled,
    shouldShowSpaceWeatherVisualization,
    pipelineMeta,
    pipelineVectors,
    lastPipelineError,
    geomagneticActive,
    auroralOvalActive,
    solarWindActive,
    magnetopauseActive,
    magneticFieldActive,
    geomagnetic.data,
    auroralOval.data,
    solarWind.data,
    magnetopause.data,
    magneticField.data,
    geomagnetic.lastUpdated,
    auroralOval.lastUpdated,
    solarWind.lastUpdated,
    magnetopause.lastUpdated,
    magneticField.lastUpdated,
    diagnosticsState
  ]);

  const telemetryPipelineTotalVectors = telemetry.pipeline?.totalVectors ?? null;
  const telemetryPipelineFailures = telemetry.pipeline?.failures ?? null;
  const telemetryPipelineLastFetch = telemetry.pipeline?.lastFetch ?? null;

  useEffect(() => {
    recordSpaceWeatherTelemetrySnapshot({
      provider: currentProvider,
      activeLayer: settings.activeLayer,
      samplingStrategy: telemetry.samplingStrategy,
      rawInterMag: telemetry.rawInterMag,
      rawUSCanada: telemetry.rawUSCanada,
      rawPipeline: telemetry.rawPipeline,
      combinedRaw: telemetry.combinedRaw,
      sampled: telemetry.sampled,
      rendered: telemetry.rendered,
      gatingReason: telemetry.gatingReason,
      datasetFlags: {
        intermag: settings.enabledDatasets.intermag,
        usCanada: settings.enabledDatasets.usCanada,
        pipeline: settings.enabledDatasets.pipeline
      },
      pipeline: telemetry.pipeline
        ? {
            totalVectors: telemetry.pipeline.totalVectors,
            failures: telemetry.pipeline.failures,
            lastFetch: telemetry.pipeline.lastFetch ?? null,
            active: telemetry.pipelineActive
          }
        : undefined,
      degradationStages: telemetry.degradationStages
    });
  }, [
    telemetry.rawInterMag,
    telemetry.rawUSCanada,
    telemetry.rawPipeline,
    telemetry.combinedRaw,
    telemetry.sampled,
    telemetry.rendered,
    telemetry.samplingStrategy,
    telemetry.pipeline,
    telemetryPipelineTotalVectors,
    telemetryPipelineFailures,
    telemetryPipelineLastFetch,
    telemetry.gatingReason,
    telemetry.degradationStages,
    telemetry.pipelineActive,
    settings.activeLayer,
    settings.enabledDatasets,
    currentProvider
  ]);

  const telemetryHistory = getSpaceWeatherTelemetryHistory();

  useEffect(() => {
    if (!shouldShowSpaceWeatherVisualization) {
      visualizationResourceMonitor.clearMode(SPACE_WEATHER_MODE_KEY);
      return;
    }

    const vectorCount = visualizationVectors.length;
    visualizationResourceMonitor.recordVectors(SPACE_WEATHER_MODE_KEY, {
      count: vectorCount,
      approxBytes: vectorCount * VECTOR_BYTES_ESTIMATE
    });

    const pipelineCount = pipelineVectors?.length ?? 0;
    visualizationResourceMonitor.recordPipelineVectors(SPACE_WEATHER_MODE_KEY, {
      count: pipelineCount,
      approxBytes: pipelineCount * PIPELINE_VECTOR_BYTES_ESTIMATE
    });

    const diagnosticsEntries = (
      diagnosticsState.cache.snapshot.length +
      diagnosticsState.providers.entries.length +
      diagnosticsState.adapters.entries.length
    );

    visualizationResourceMonitor.recordDiagnosticsUsage(
      SPACE_WEATHER_MODE_KEY,
      diagnosticsEntries,
      diagnosticsEntries * DIAGNOSTIC_ENTRY_BYTES_ESTIMATE
    );

    const cachedVectors = vectorCacheRef.current.vectors.length;
    visualizationResourceMonitor.recordOverlayCache(
      SPACE_WEATHER_MODE_KEY,
      cachedVectors * VECTOR_BYTES_ESTIMATE
    );

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      visualizationResourceMonitor.recordHeap(SPACE_WEATHER_MODE_KEY, mem.usedJSHeapSize, mem.jsHeapSizeLimit);
    }
  }, [shouldShowSpaceWeatherVisualization, visualizationVectors, pipelineVectors, diagnosticsState]);

  return {
    visualizationVectors,
    telemetry: telemetry || EMPTY_TELEMETRY,
    telemetryHistory,
    resetVisualizationCache
  };
};
