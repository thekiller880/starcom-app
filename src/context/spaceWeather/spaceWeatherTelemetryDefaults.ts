import type { SpaceWeatherDiagnosticsState } from '../../services/space-weather/SpaceWeatherDiagnostics';
import type { SpaceWeatherTelemetry } from './spaceWeatherContext.types';

export const EMPTY_TELEMETRY: SpaceWeatherTelemetry = {
  rawInterMag: 0,
  rawUSCanada: 0,
  rawPipeline: 0,
  combinedRaw: 0,
  sampled: 0,
  rendered: 0,
  samplingStrategy: 'legacy-topN',
  unit: 'mV/km',
  gatingReason: 'noData',
  timings: { samplingMs: 0, normalizationMs: 0, totalMs: 0 },
  degraded: false,
  degradationStages: [],
  pipeline: null,
  pipelineActive: false,
  modes: {
    geomagnetic: { active: false, kp: null, lastUpdate: null, quality: 'live' },
    auroralOval: { active: false, resolution: null, lastUpdate: null, quality: 'live' },
    solarWind: { active: false, speed: null, density: null, bz: null, lastUpdate: null, quality: 'live' },
    magnetopause: { active: false, standoffRe: null, lastUpdate: null, quality: 'live' },
    magneticField: { active: false, sampleCount: null, lastUpdate: null, quality: 'live' }
  },
  diagnostics: { providers: { entries: [] }, adapters: { entries: [] }, cache: { snapshot: [] } } as SpaceWeatherDiagnosticsState
};
