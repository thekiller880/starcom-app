import { GeoIntConfig } from './types';

export const GEOINT_DEFAULT_CONFIG: GeoIntConfig = {
  relays: [
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://nostr.wine',
    'wss://relay.nostr.band',
    'wss://purplepag.es'
  ],
  limitPerReq: 500,
  freshnessWindowMs: 24 * 60 * 60 * 1000,
  maxEventsStored: 1000,
  maxFeaturesPerCollection: 50,
  maxVerticesPerPolygon: 2000,
  maxEventVertexTotal: 5000,
  contentSizeCapBytes: 64 * 1024,
  tagCountCap: 100,
  tagLengthCap: 256,
  debounceMs: 300,
  backoff: {
    initialMs: 2000,
    maxMs: 60000,
    factor: 2,
    jitterMs: 500
  },
  cluster: {
    enabled: true,
    radiusKm: 50,
    minSize: 2
  },
  intelDefaults: {
    classification: 'UNCLASSIFIED',
    status: 'SUBMITTED',
    category: 'GEOINT',
    priorityHigh: 'IMMEDIATE',
    priorityMed: 'PRIORITY',
    priorityLow: 'ROUTINE',
    confidenceDefault: 0.5
  }
};
