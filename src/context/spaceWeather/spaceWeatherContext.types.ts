import type { useEcoNaturalSettings } from '../../hooks/useEcoNaturalSettings';
import type { DataQualityMetrics } from '../../services/data-management/DataQualityService';
import type { SpaceWeatherDiagnosticsState } from '../../services/space-weather/SpaceWeatherDiagnostics';
import type { ProcessedElectricFieldData, SpaceWeatherAlert } from '../../types';
import type { SpaceWeatherTelemetrySnapshot } from '../../utils/spaceWeatherTelemetryTracker';

export type DataProvider = 'legacy' | 'enterprise' | 'enhanced';

export const SPACE_WEATHER_MODE_KEY = 'EcoNatural.SpaceWeather' as const;
export const VECTOR_BYTES_ESTIMATE = 64;
export const PIPELINE_VECTOR_BYTES_ESTIMATE = 48;
export const DIAGNOSTIC_ENTRY_BYTES_ESTIMATE = 128;

export type SpaceWeatherSettings = ReturnType<typeof useEcoNaturalSettings>['config']['spaceWeather'];
export type UpdateSpaceWeatherSettings = ReturnType<typeof useEcoNaturalSettings>['updateSpaceWeather'];

export interface VisualizationVector {
  latitude: number;
  longitude: number;
  magnitude: number;
  direction: number;
  quality: number;
  intensity: number;
  opacity: number;
  color: string;
  size: number;
  correlationScore?: number;
  qualityScore?: number;
  anomaly?: boolean;
}

export interface ProviderStatusEntry {
  available: boolean;
  lastTested?: Date;
  error?: string;
}

export interface SpaceWeatherTelemetry {
  rawInterMag: number;
  rawUSCanada: number;
  rawPipeline: number;
  combinedRaw: number;
  sampled: number;
  rendered: number;
  samplingStrategy: 'legacy-topN' | 'grid-binning';
  unit: 'mV/km';
  gatingReason: null | 'inactiveLayer' | 'disabled' | 'noData';
  timings: { samplingMs: number; normalizationMs: number; totalMs: number };
  degraded: boolean;
  degradationStages: number[];
  pipeline: null | { adapterCount: number; failures: number; fetchMs: number; totalVectors: number; lastFetch: number; lastError: string | null };
  pipelineActive: boolean;
  modes: {
    geomagnetic: { active: boolean; kp: number | null; lastUpdate: number | null; quality?: 'live' | 'fallback' | 'stale' };
    auroralOval: { active: boolean; resolution: string | null; lastUpdate: number | null; quality?: 'live' | 'fallback' | 'stale' };
    solarWind: { active: boolean; speed: number | null; density: number | null; bz: number | null; lastUpdate: number | null; quality?: 'live' | 'fallback' | 'stale' };
    magnetopause: { active: boolean; standoffRe: number | null; lastUpdate: number | null; quality?: 'live' | 'fallback' | 'stale' };
    magneticField: { active: boolean; sampleCount: number | null; lastUpdate: number | null; quality?: 'live' | 'fallback' | 'stale' };
  };
  diagnostics: SpaceWeatherDiagnosticsState;
}

export interface SpaceWeatherContextType {
  settings: SpaceWeatherSettings;
  updateSettings: UpdateSpaceWeatherSettings;
  isElectricFieldsEnabled: boolean;
  interMagData: ProcessedElectricFieldData | null;
  usCanadaData: ProcessedElectricFieldData | null;
  alerts: SpaceWeatherAlert[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  currentProvider: DataProvider;
  switchProvider: (provider: DataProvider) => void;
  providerStatus: {
    legacy: ProviderStatusEntry;
    enterprise: ProviderStatusEntry;
    enhanced: ProviderStatusEntry;
  };
  qualityMetrics?: DataQualityMetrics;
  enhancedAlerts: SpaceWeatherAlert[];
  shouldShowOverlay: boolean;
  visualizationVectors: VisualizationVector[];
  telemetry: SpaceWeatherTelemetry;
  telemetryHistory: SpaceWeatherTelemetrySnapshot[];
  diagnostics: SpaceWeatherDiagnosticsState;
  enableDataCorrelation: boolean;
  setEnableDataCorrelation: (enabled: boolean) => void;
  enableQualityAssessment: boolean;
  setEnableQualityAssessment: (enabled: boolean) => void;
}
