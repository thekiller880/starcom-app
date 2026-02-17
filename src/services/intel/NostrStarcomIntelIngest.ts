import type { Event as NostrEvent, Filter, SimplePool } from 'nostr-tools';
import type { IntelReportUI, IntelReportHistoryEntry } from '../../types/intel/IntelReportUI';
import { GEOINT_DEFAULT_CONFIG } from '../geoint/config';
import { parseEvent } from '../geoint/parser';
import type { ParsedLine, ParsedPoint, ParsedPolygon } from '../geoint/types';

type NostrToolsModule = typeof import('nostr-tools');

export interface NostrStarcomIntelIngestMetrics {
  seen: number;
  accepted: number;
  droppedNoGeo: number;
  droppedInvalid: number;
  deduped: number;
  relaysConnected: number;
}

export interface NostrRelayState {
  url: string;
  connected: boolean;
  lastNotice?: string;
  lastSeen?: number;
}

type RelayProbeResult = {
  relay: string;
  status: 'pending' | 'open' | 'error' | 'timeout' | 'closed' | 'unsupported';
  ts: number;
  detail?: string;
};

export interface NostrStarcomIntelIngestConfig {
  relays: string[];
  searchRelays: string[];
  hashtags: string[];
  sinceWindowMs: number;
  maxReports: number;
  enableRelaySearch: boolean;
}

const defaultConfig = (): NostrStarcomIntelIngestConfig => ({
  // Match Navcom's default/search relay surface so hashtag visibility is consistent.
  // Navcom default/search: relay.primal.net, nostr.mom, relay.wellorder.net, relay.damus.io, nos.lol
  relays: [
    'wss://relay.primal.net',
    'wss://nostr.mom',
    'wss://relay.wellorder.net',
    'wss://relay.damus.io',
    'wss://nos.lol'
  ],
  // Navcom search relays: relay.primal.net, nostr.mom, relay.wellorder.net, relay.damus.io, nos.lol
  searchRelays: [
    'wss://relay.primal.net',
    'wss://nostr.mom',
    'wss://relay.wellorder.net',
    'wss://relay.damus.io',
    'wss://nos.lol'
  ],
  // Include a few common variants; many clients differ in underscore vs dash.
  hashtags: ['starcom_intel', 'starcom-intel', 'starcomintel'],
  // Generous default so existing posts show up without env tuning.
  sinceWindowMs: 365 * 24 * 60 * 60 * 1000,
  maxReports: 200,
  enableRelaySearch: true
});

function expandHashtagVariants(normalizedHashtags: string[]): string[] {
  // Some clients/relays store the 't' tag with a leading '#'.
  const expanded = normalizedHashtags.flatMap((t) => [t, `#${t}`]);
  return Array.from(new Set(expanded));
}

function parseCsvList(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeRelayUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^wss?:\/\//, '')
    .replace(/\/+$/, '');
}

function envConfig(): Partial<NostrStarcomIntelIngestConfig> {
  if (typeof import.meta === 'undefined') return {};
  const env = ((import.meta as unknown as { env?: Record<string, unknown> }).env ?? {});
  const relays = parseCsvList(env.VITE_NOSTR_INTEL_RELAYS);
  const searchRelays = parseCsvList(env.VITE_NOSTR_INTEL_SEARCH_RELAYS);
  const hashtags = parseCsvList(env.VITE_NOSTR_INTEL_HASHTAGS);
  const enableRelaySearchRaw = env.VITE_NOSTR_INTEL_ENABLE_SEARCH;
  const enableRelaySearch = typeof enableRelaySearchRaw === 'string'
    ? enableRelaySearchRaw.toLowerCase() === 'true'
    : undefined;
  const sinceDaysRaw = env.VITE_NOSTR_INTEL_SINCE_DAYS;
  const sinceDays = typeof sinceDaysRaw === 'string' ? Number.parseFloat(sinceDaysRaw) : NaN;

  // Important: do not explicitly set keys to `undefined` here.
  // Spreading `{ hashtags: undefined }` over defaults will clobber defaults and can crash at runtime.
  const cfg: Partial<NostrStarcomIntelIngestConfig> = {};
  if (relays.length) cfg.relays = relays;
  if (searchRelays.length) cfg.searchRelays = searchRelays;
  if (hashtags.length) cfg.hashtags = hashtags;
  if (typeof enableRelaySearch === 'boolean') cfg.enableRelaySearch = enableRelaySearch;
  if (Number.isFinite(sinceDays) && sinceDays > 0) {
    cfg.sinceWindowMs = Math.round(sinceDays * 24 * 60 * 60 * 1000);
  }
  return cfg;
}

function normalizeHashtag(tag: string): string {
  // Nostr hashtag tags are usually lowercased (without '#')
  return tag.replace(/^#/, '').trim().toLowerCase();
}

function deriveTitle(content: string): string {
  const firstLine = content.split(/\r?\n/)[0]?.trim() || '';
  const cleaned = firstLine.replace(/#[a-zA-Z0-9_]+/g, '').trim();
  if (cleaned.length >= 8) return cleaned.slice(0, 96);
  const fallback = content.replace(/\s+/g, ' ').trim();
  return (fallback || 'Nostr Intel Report').slice(0, 96);
}

function collectHashtags(event: NostrEvent): string[] {
  const tags = Array.isArray(event.tags) ? event.tags : [];
  const hashTags = tags
    .filter((t) => Array.isArray(t) && t[0] === 't' && typeof t[1] === 'string')
    .map((t) => normalizeHashtag(String(t[1])));

  const contentTags = (event.content || '').match(/#[a-zA-Z0-9_]+/g)?.map((m) => normalizeHashtag(m)) || [];

  return Array.from(new Set([...hashTags, ...contentTags]));
}

function hasGeoIntEncoding(event: NostrEvent): boolean {
  const content = event.content || '';
  if (content.includes('---GEOJSON---')) return true;
  const trimmed = content.trim();
  // Raw JSON payloads (the parser will validate shape and bounds).
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true;
  const tags = Array.isArray(event.tags) ? event.tags : [];
  // Common geo tags used by some clients.
  return tags.some((t) => Array.isArray(t) && (t[0] === 'geo' || t[0] === 'g'));
}

export class NostrStarcomIntelIngest {
  private config: NostrStarcomIntelIngestConfig;
  private pool: SimplePool | null = null;
  private subs: Array<{ unsub: () => void }> = [];
  private active = false;

  private debugInterval: ReturnType<typeof setInterval> | null = null;
  private startupWatchdog: ReturnType<typeof setTimeout> | null = null;

  private listeners = new Set<(report: IntelReportUI) => void>();
  private relayStatus = new Map<string, NostrRelayState>();
  private relayProbe = new Map<string, RelayProbeResult>();

  private seenIds = new Set<string>();
  private reportIds: string[] = [];

  private metrics: NostrStarcomIntelIngestMetrics = {
    seen: 0,
    accepted: 0,
    droppedNoGeo: 0,
    droppedInvalid: 0,
    deduped: 0,
    relaysConnected: 0
  };
  private readonly verboseLogs = process.env.NODE_ENV === 'development';

  private subscribeWithPool(relay: string, filter: Filter, label: 'tag' | 'search' | 'discovery'): { unsub: () => void } {
    if (!this.pool) {
      throw new Error('Nostr pool is not initialized');
    }

    const anyPool = this.pool as unknown as {
      sub?: (relays: string[], filters: Filter[]) => {
        on: (type: 'event' | 'eose' | 'notice', cb: (...args: unknown[]) => void) => void;
        unsub: () => void;
      };
      subscribeMany?: (
        relays: string[],
        filters: Filter[],
        params: {
          onevent?: (event: NostrEvent) => void;
          oneose?: () => void;
          onclose?: (reason: unknown) => void;
        }
      ) => { close?: () => void };
    };

    // nostr-tools v1 style
    if (typeof anyPool.sub === 'function') {
      const sub = anyPool.sub([relay], [filter]);
      sub.on('event', (event: NostrEvent) => this.handleEvent(event, relay));
      sub.on('eose', () => this.markRelay(relay, true));
      sub.on('notice', (msg: unknown) => {
        const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
        this.markRelay(relay, false, text);
        if (this.verboseLogs) {
          console.warn('[NostrStarcomIntelIngest] relay NOTICE', { relay, sub: label, notice: text });
        }
      });
      return { unsub: () => sub.unsub() };
    }

    // nostr-tools v2 style
    if (typeof anyPool.subscribeMany === 'function') {
      const sub = anyPool.subscribeMany([relay], [filter], {
        onevent: (event: NostrEvent) => this.handleEvent(event, relay),
        oneose: () => this.markRelay(relay, true),
        onclose: (reason: unknown) => {
          const text = typeof reason === 'string' ? reason : JSON.stringify(reason);
          this.markRelay(relay, false, text);
          if (this.verboseLogs) {
            console.info('[NostrStarcomIntelIngest] relay closed', { relay, sub: label, reason: text });
          }
        }
      });
      return { unsub: () => sub.close?.() };
    }

    throw new Error('No supported subscription API found on Nostr pool (expected sub or subscribeMany)');
  }

  constructor(config?: Partial<NostrStarcomIntelIngestConfig>) {
    const base = defaultConfig();
    this.config = { ...base, ...envConfig(), ...(config || {}) };
    this.config.hashtags = (this.config.hashtags || base.hashtags).map(normalizeHashtag);
    this.config.relays.forEach((url) => this.relayStatus.set(url, { url, connected: false }));
  }
  getRelayStatus(): NostrRelayState[] {
    return Array.from(this.relayStatus.values());
  }

  getRelayProbeStatus(): RelayProbeResult[] {
    return this.config.relays.map((relay) => {
      return this.relayProbe.get(relay) || {
        relay,
        status: 'pending',
        ts: Date.now()
      };
    });
  }


  isActive(): boolean {
    return this.active;
  }

  getMetrics(): NostrStarcomIntelIngestMetrics {
    return { ...this.metrics };
  }

  subscribe(listener: (report: IntelReportUI) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.active) return;
    if (typeof window === 'undefined') return;

    this.active = true;
    this.resetState();

    const nostr = (await import('nostr-tools')) as unknown as NostrToolsModule;
    this.pool = new nostr.SimplePool();

    const since = Math.floor((Date.now() - this.config.sinceWindowMs) / 1000);
    const limit = Math.max(10, Math.min(200, this.config.maxReports));

    // Periodic debug so production runs can confirm whether we're seeing/dropping/accepting events.
    // This is lightweight (no content) and only active while IntelReports mode is active.
    if (this.verboseLogs) {
      this.debugInterval = setInterval(() => {
        if (!this.active) return;
        console.info('[NostrStarcomIntelIngest] heartbeat', {
          metrics: this.getMetrics(),
          relays: this.getRelayStatus(),
          probes: this.getRelayProbeStatus()
        });
      }, 15000);
    }

    // Primary path: Nostr tag filter by hashtag tag: ["t", "starcom_intel"] => filter key "#t": ["starcom_intel"]
    type HashtagFilter = Filter & { ['#t']?: string[] };
    const filter: HashtagFilter = { kinds: [1, 30023], since, limit, ['#t']: expandHashtagVariants(this.config.hashtags) };

    // Secondary path: some clients include #starcom_intel in content but omit the ["t", ...] tag.
    // On relays that support NIP-50-ish search, we can query by content. We still filter locally.
    type SearchFilter = Filter & { search?: string };
    const searchFilter: SearchFilter = {
      kinds: [1, 30023],
      since,
      limit,
      // Keep search string narrowly scoped.
      search: '#starcom_intel'
    };

    // Some relays tokenize search differently; include a variant without the '#'.
    const searchFilterNoHash: SearchFilter = {
      kinds: [1, 30023],
      since,
      limit,
      search: 'starcom_intel'
    };

    const searchRelaySet = new Set(this.config.searchRelays.map(normalizeRelayUrl));

    // Transport probes help distinguish "no events available" from "cannot reach relay".
    // Run in parallel and log outcomes explicitly.
    if (this.verboseLogs) {
      this.config.relays.forEach((relay) => {
        this.probeRelayTransport(relay).catch(() => {
          // ignore probe failures; results are recorded in map/logs.
        });
      });
    }

    for (const relay of this.config.relays) {
      try {
        // Primary subscription (hashtag tag filter).
        if (this.verboseLogs) {
          console.info('[NostrStarcomIntelIngest] subscribing', {
            relay,
            mode: 'tag',
            filter
          });
        }
        this.subs.push(this.subscribeWithPool(relay, filter, 'tag'));

        // Optional secondary subscription (relay search) to catch content-only hashtags.
        if (this.config.enableRelaySearch && searchRelaySet.has(normalizeRelayUrl(relay))) {
          if (this.verboseLogs) {
            console.info('[NostrStarcomIntelIngest] subscribing', {
              relay,
              mode: 'search',
              filter: searchFilter
            });
          }
          this.subs.push(this.subscribeWithPool(relay, searchFilter, 'search'));
          if (this.verboseLogs) {
            console.info('[NostrStarcomIntelIngest] subscribing', {
              relay,
              mode: 'search-no-hash',
              filter: searchFilterNoHash
            });
          }
          this.subs.push(this.subscribeWithPool(relay, searchFilterNoHash, 'search'));
        } else if (this.config.enableRelaySearch) {
          console.info('[NostrStarcomIntelIngest] search skipped for relay (not in searchRelays after normalization)', {
            relay,
            searchRelays: this.config.searchRelays
          });
        }
      } catch (error) {
        console.warn('[NostrStarcomIntelIngest] subscribe failed', {
          relay,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        });
        this.markRelay(relay, false);
      }
    }

    if (this.verboseLogs) {
      console.info('[NostrStarcomIntelIngest] started', {
        relays: this.config.relays.length,
        searchRelays: this.config.enableRelaySearch ? this.config.searchRelays.length : 0,
        hashtags: this.config.hashtags,
        since
      });
    }

    // If nothing arrives shortly after startup, emit a focused diagnostic with likely root causes.
    this.startupWatchdog = setTimeout(() => {
      if (!this.active) return;
      if (this.metrics.seen > 0) return;
      if (this.verboseLogs) {
        console.warn('[NostrStarcomIntelIngest] no events observed after startup window', {
          metrics: this.getMetrics(),
          relays: this.getRelayStatus(),
          probes: this.getRelayProbeStatus(),
          likelyCauses: [
            'Browser/network blocks outbound wss:// connections (CSP, extension, corporate firewall)',
            'Relays reachable but not returning matching historical events for current filters',
            'Relay search unsupported and hashtag-tagged events unavailable in current window'
          ]
        });
      }

      // Fallback: start a bounded discovery subscription on top relays without hashtag filters,
      // then continue strict local filtering (#starcom_intel + GEOINT) in handleEvent.
      this.activateDiscoveryFallback();
    }, 12000);
  }

  private activateDiscoveryFallback(): void {
    if (!this.active || !this.pool) return;

    const discoveryRelays = this.config.relays.slice(0, 2);
    const cappedWindowMs = Math.min(this.config.sinceWindowMs, 30 * 24 * 60 * 60 * 1000);
    const discoverySince = Math.floor((Date.now() - cappedWindowMs) / 1000);
    const discoveryLimit = Math.max(100, Math.min(800, this.config.maxReports * 4));

    type DiscoveryFilter = Filter;
    const discoveryFilter: DiscoveryFilter = {
      kinds: [1, 30023],
      since: discoverySince,
      limit: discoveryLimit
    };

    console.warn('[NostrStarcomIntelIngest] activating discovery fallback', {
      relays: discoveryRelays,
      discoveryFilter,
      note: 'Local strict filtering remains enabled (#starcom_intel + GEOINT).'
    });

    for (const relay of discoveryRelays) {
      try {
        this.subs.push(this.subscribeWithPool(relay, discoveryFilter, 'discovery'));
        console.info('[NostrStarcomIntelIngest] discovery fallback subscribed', { relay });
      } catch (error) {
        console.warn('[NostrStarcomIntelIngest] discovery fallback subscribe failed', {
          relay,
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        });
      }
    }
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;

    if (this.debugInterval) {
      clearInterval(this.debugInterval);
      this.debugInterval = null;
    }
    if (this.startupWatchdog) {
      clearTimeout(this.startupWatchdog);
      this.startupWatchdog = null;
    }

    try {
      for (const sub of this.subs) sub.unsub();
    } catch {
      // ignore
    }
    this.subs = [];

    try {
      this.pool?.close(this.config.relays);
    } catch {
      // ignore
    }

    this.pool = null;
    if (this.verboseLogs) {
      console.info('[NostrStarcomIntelIngest] stopped', this.getMetrics());
    }
  }

  private setRelayProbe(relay: string, status: RelayProbeResult['status'], detail?: string): void {
    const result: RelayProbeResult = { relay, status, detail, ts: Date.now() };
    this.relayProbe.set(relay, result);
  }

  private async probeRelayTransport(relay: string): Promise<void> {
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      this.setRelayProbe(relay, 'unsupported', 'WebSocket unavailable in runtime');
      return;
    }

    this.setRelayProbe(relay, 'pending');

    await new Promise<void>((resolve) => {
      let settled = false;
      let ws: WebSocket | null = null;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        this.setRelayProbe(relay, 'timeout', 'No WebSocket open within timeout window');
        console.warn('[NostrStarcomIntelIngest] relay probe timeout', { relay });
        try {
          ws?.close();
        } catch {
          // ignore
        }
        resolve();
      }, 8000);

      try {
        ws = new WebSocket(relay);
      } catch (error) {
        clearTimeout(timeoutId);
        settled = true;
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        this.setRelayProbe(relay, 'error', detail);
        console.warn('[NostrStarcomIntelIngest] relay probe constructor error', { relay, detail });
        resolve();
        return;
      }

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.setRelayProbe(relay, 'open');
        this.markRelay(relay, true);
        console.info('[NostrStarcomIntelIngest] relay probe open', { relay });
        try {
          ws?.close();
        } catch {
          // ignore
        }
        resolve();
      };

      ws.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        this.setRelayProbe(relay, 'error', 'WebSocket onerror');
        this.markRelay(relay, false, 'WebSocket probe error');
        console.warn('[NostrStarcomIntelIngest] relay probe error', { relay });
        try {
          ws?.close();
        } catch {
          // ignore
        }
        resolve();
      };

      ws.onclose = (event) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        const detail = `code=${event.code} reason=${event.reason || 'none'} wasClean=${event.wasClean}`;
        this.setRelayProbe(relay, 'closed', detail);
        this.markRelay(relay, false, detail);
        console.warn('[NostrStarcomIntelIngest] relay probe closed before open', { relay, detail });
        resolve();
      };
    });
  }

  private markRelay(relay: string, connected: boolean, notice?: string): void {
    const prev = this.relayStatus.get(relay) || { url: relay, connected: false };
    const next: NostrRelayState = {
      ...prev,
      connected,
      lastSeen: Date.now(),
      lastNotice: notice ?? prev.lastNotice
    };
    this.relayStatus.set(relay, next);
    const relaysConnected = Array.from(this.relayStatus.values()).filter((r) => r.connected).length;
    this.metrics.relaysConnected = relaysConnected;
  }

  private resetState(): void {
    this.seenIds.clear();
    this.reportIds = [];
    this.metrics = {
      seen: 0,
      accepted: 0,
      droppedNoGeo: 0,
      droppedInvalid: 0,
      deduped: 0,
      relaysConnected: 0
    };
  }

  private handleEvent(event: NostrEvent, relay: string): void {
    if (!this.active) return;

    const safeEvent: NostrEvent = {
      ...event,
      tags: Array.isArray((event as unknown as { tags?: unknown }).tags)
        ? (event as unknown as { tags: NostrEvent['tags'] }).tags
        : []
    };

    this.metrics.seen += 1;

    if (!safeEvent || typeof safeEvent.id !== 'string') {
      this.metrics.droppedInvalid += 1;
      return;
    }

    if (this.seenIds.has(safeEvent.id)) {
      this.metrics.deduped += 1;
      return;
    }
    this.seenIds.add(safeEvent.id);

    // If we're seeing events, the relay is effectively connected even if it never sends EOSE.
    this.markRelay(relay, true);

    const tags = collectHashtags(safeEvent);
    const hasRequired = this.config.hashtags.some((t) => tags.includes(t));
    if (!hasRequired) {
      // Should be rare since relay filter is #t, but keep guard.
      this.metrics.droppedInvalid += 1;
      return;
    }

    // We only care about GEOINT-bearing #starcom_intel posts for globe markers.
    if (!hasGeoIntEncoding(safeEvent)) {
      this.metrics.droppedNoGeo += 1;
      if (this.verboseLogs && (this.metrics.droppedNoGeo <= 3 || this.metrics.droppedNoGeo % 50 === 0)) {
        console.info('[NostrStarcomIntelIngest] dropped (prefilter no geo encoding)', {
          id: safeEvent.id,
          relay,
          hashtags: tags,
          contentHead: (safeEvent.content || '').slice(0, 180),
          metrics: this.getMetrics()
        });
      }
      return;
    }

    let parsed: ReturnType<typeof parseEvent>;
    try {
      parsed = parseEvent(safeEvent, {
        ...GEOINT_DEFAULT_CONFIG,
        // loosen ingestion caps a bit for intel notes while still bounded
        maxFeaturesPerCollection: 10,
        maxEventsStored: this.config.maxReports,
        freshnessWindowMs: this.config.sinceWindowMs
      });
    } catch (error) {
      this.metrics.droppedInvalid += 1;
      console.warn('[NostrStarcomIntelIngest] dropped (parser error)', {
        id: safeEvent.id,
        relay,
        error
      });
      return;
    }

    const feature = parsed.features[0];
    if (!feature) {
      this.metrics.droppedNoGeo += 1;
      if (this.verboseLogs && (this.metrics.droppedNoGeo <= 3 || this.metrics.droppedNoGeo % 25 === 0)) {
        console.info('[NostrStarcomIntelIngest] dropped (no geo)', {
          id: safeEvent.id,
          relay,
          hashtags: tags,
          metrics: this.getMetrics()
        });
      }
      this.markRelay(relay, true);
      return;
    }

    let point: ParsedPoint | undefined;
    if (feature.kind === 'point') {
      point = feature.geometry as ParsedPoint;
    } else if (feature.kind === 'line') {
      point = (feature.geometry as ParsedLine).coords[0];
    } else {
      point = (feature.geometry as ParsedPolygon).rings[0]?.[0];
    }

    const lat = point?.lat;
    const lon = point?.lon;

    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      this.metrics.droppedNoGeo += 1;
      if (this.verboseLogs && (this.metrics.droppedNoGeo <= 3 || this.metrics.droppedNoGeo % 25 === 0)) {
        console.info('[NostrStarcomIntelIngest] dropped (invalid geo)', {
          id: safeEvent.id,
          relay,
          hashtags: tags,
          lat,
          lon,
          metrics: this.getMetrics()
        });
      }
      this.markRelay(relay, true);
      return;
    }

    const createdAt = new Date((safeEvent.created_at || Math.floor(Date.now() / 1000)) * 1000);
    const nowIso = new Date().toISOString();
    const history: IntelReportHistoryEntry[] = [{ action: 'IMPORTED', timestamp: nowIso, user: 'nostr' }];

    const report: IntelReportUI = {
      id: safeEvent.id,
      title: deriveTitle(safeEvent.content || ''),
      content: (safeEvent.content || '').slice(0, 8000),
      author: safeEvent.pubkey || 'nostr',
      category: 'GEOINT',
      tags: Array.from(new Set([...tags, 'nostr', `relay:${relay}`])),
      classification: 'UNCLASSIFIED',
      latitude: lat,
      longitude: lon,
      createdAt,
      updatedAt: createdAt,
      status: 'SUBMITTED',
      version: 1,
      manualSummary: false,
      history
    };

    this.metrics.accepted += 1;
    this.markRelay(relay, true);

    this.reportIds.unshift(report.id);
    if (this.reportIds.length > this.config.maxReports) {
      const evicted = this.reportIds.pop();
      if (evicted) {
        // allow re-import after eviction
        this.seenIds.delete(evicted);
      }
    }

    if (this.verboseLogs && (this.metrics.accepted <= 3 || this.metrics.accepted % 25 === 0)) {
      console.info('[NostrStarcomIntelIngest] accepted', {
        id: report.id,
        title: report.title,
        lat,
        lon,
        hashtags: tags,
        relay,
        metrics: this.getMetrics()
      });
    }

    this.listeners.forEach((listener) => {
      try {
        listener(report);
      } catch {
        // ignore listener error
      }
    });
  }
}

export const nostrStarcomIntelIngest = new NostrStarcomIntelIngest();
