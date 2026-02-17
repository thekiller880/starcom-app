import type { Event as NostrEvent } from 'nostr-tools';
import type { IntelReportPriority, IntelReportStatus, IntelReportUI } from '../../types/intel/IntelReportUI';

export type ParsedFeatureKind = 'point' | 'line' | 'polygon';

export interface ParsedPoint { lat: number; lon: number; alt?: number | null; }
export interface ParsedLine { coords: ParsedPoint[]; }
export interface ParsedPolygon { rings: ParsedPoint[][]; }

export interface ParsedProps {
  description?: string;
  type?: string;
  confidence?: number;
  timestamp?: number; // ms
  sourceTags?: string[];
  relay?: string;
  rawSize?: number;
}

export interface ParsedFeature {
  id: string;
  kind: ParsedFeatureKind;
  createdAtMs: number;
  geometry: ParsedPoint | ParsedLine | ParsedPolygon;
  props: ParsedProps;
}

export type DropReason =
  | 'invalid_sig'
  | 'invalid_shape'
  | 'invalid_kind'
  | 'too_large'
  | 'too_many_tags'
  | 'invalid_tags'
  | 'missing_app_tag'
  | 'invalid_geo'
  | 'invalid_geojson'
  | 'stale'
  | 'deduped'
  | 'bounds'
  | 'parse_error'
  | 'validation_failed';

export interface ValidationResult {
  ok: boolean;
  reason?: DropReason;
}

export interface ParsedResult {
  features: ParsedFeature[];
  reason?: DropReason;
}

export interface CacheInsertResult {
  accepted: ParsedFeature[];
  dropped: number;
  staleDropped: number;
  reason?: DropReason;
}

export interface GeoIntMetrics {
  parsed: number;
  dropped: Record<DropReason, number>;
  deduped: number;
  stale: number;
  imported: number;
}

export interface RelayStatus {
  url: string;
  connected: boolean;
  lastError?: string;
  lastSeen?: number;
  attempts: number;
}

export interface GeoIntConfig {
  relays: string[];
  limitPerReq: number;
  freshnessWindowMs: number;
  maxEventsStored: number;
  maxFeaturesPerCollection: number;
  maxVerticesPerPolygon: number;
  maxEventVertexTotal: number;
  contentSizeCapBytes: number;
  tagCountCap: number;
  tagLengthCap: number;
  debounceMs: number;
  backoff: { initialMs: number; maxMs: number; factor: number; jitterMs: number };
  cluster: { enabled: boolean; radiusKm: number; minSize: number };
  intelDefaults: {
    classification: string;
    status: IntelReportStatus;
    category: string;
    priorityHigh: IntelReportPriority;
    priorityMed: IntelReportPriority;
    priorityLow: IntelReportPriority;
    confidenceDefault: number;
  };
}

export interface IntelConversionContext {
  relay?: string;
  sourceEvent: NostrEvent;
}

export interface IntelMappedReport {
  report: IntelReportUI;
  validationOk: boolean;
  validationErrors?: string[];
}
