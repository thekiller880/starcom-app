import { Event as NostrEvent, SimplePool } from 'nostr-tools';
import { GEOINT_DEFAULT_CONFIG } from './config';
import { GeoIntCache } from './cache';
import { mapFeatureToIntel, importIntelReport } from './conversion';
import { parseEvent } from './parser';
import { validateEnvelope } from './validator';
import { GeoIntConfig, GeoIntMetrics, RelayStatus } from './types';
import { intelReportService } from '../intel/IntelReportService';

interface PendingItem {
  event: NostrEvent;
  relay?: string;
  features: ReturnType<GeoIntCache['insert']>['accepted'];
}

export class NostrGeoIntService {
  private config: GeoIntConfig;
  private pool: SimplePool | null = null;
  private subs: Array<{ on: (type: string, cb: (...args: any[]) => void) => void; unsub: () => void; }> = [];
  private cache: GeoIntCache;
  private pending: PendingItem[] = [];
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private metrics: GeoIntMetrics;
  private relayStatus: Map<string, RelayStatus> = new Map();
  private backoffTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private healthTimer: ReturnType<typeof setTimeout> | null = null;
  private metricsListeners = new Set<(metrics: GeoIntMetrics) => void>();
  private relayListeners = new Set<(status: RelayStatus[]) => void>();
  private importedIds = new Set<string>();

  constructor(config?: Partial<GeoIntConfig>) {
    this.config = { ...GEOINT_DEFAULT_CONFIG, ...config, backoff: { ...GEOINT_DEFAULT_CONFIG.backoff, ...(config?.backoff || {}) } };
    this.cache = new GeoIntCache(this.config);
    this.config.relays.forEach(url => this.relayStatus.set(url, { url, connected: false, attempts: 0 }));
    this.metrics = this.createEmptyMetrics();
  }

  public getMetrics(): GeoIntMetrics { return this.metrics; }
  public getRelayStatus(): RelayStatus[] { return Array.from(this.relayStatus.values()); }
  public isActive(): boolean { return this.active; }

  public onMetrics(listener: (metrics: GeoIntMetrics) => void): () => void {
    this.metricsListeners.add(listener);
    listener(this.cloneMetrics());
    return () => this.metricsListeners.delete(listener);
  }

  public onRelayStatus(listener: (status: RelayStatus[]) => void): () => void {
    this.relayListeners.add(listener);
    listener(this.getRelayStatus());
    return () => this.relayListeners.delete(listener);
  }

  public async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    this.pool = new SimplePool();
    this.metrics = this.createEmptyMetrics();
    this.emitMetrics();
    this.importedIds.clear();
    this.config.relays.forEach(relay => this.subscribeRelay(relay));
    this.scheduleHealthCheck();
  }

  public stop(): void {
    this.active = false;
    if (this.debounceHandle) clearTimeout(this.debounceHandle);
    if (this.healthTimer) clearTimeout(this.healthTimer);
    this.pending = [];
    this.cache.clear();
    for (const s of this.subs) s.unsub();
    this.subs = [];
    if (this.pool) this.pool.close(this.config.relays);
    this.pool = null;
    this.backoffTimers.forEach(t => clearTimeout(t));
    this.backoffTimers.clear();
    void this.cleanupImported();
    this.metrics = this.createEmptyMetrics();
    this.emitMetrics();
    this.emitRelayStatus();
  }

  private markRelay(relay?: string, connected?: boolean, err?: string) {
    if (!relay) return;
    const existing = this.relayStatus.get(relay) || { url: relay, connected: false, attempts: 0 };
    this.relayStatus.set(relay, {
      ...existing,
      connected: connected ?? existing.connected,
      lastError: err,
      lastSeen: Date.now(),
      attempts: connected ? 0 : existing.attempts + 1
    });
    this.emitRelayStatus();
  }

  private subscribeRelay(relay: string): void {
    if (!this.pool) return;
    const since = Math.floor((Date.now() - this.config.freshnessWindowMs) / 1000);
    const filter = { kinds: [1], limit: this.config.limitPerReq, since } as const;
    const sub = (this.pool as unknown as { sub: (relays: string[], filters: typeof filter[]) => { on: (type: string, cb: (...args: any[]) => void) => void; unsub: () => void; } }).sub([relay], [filter]);
    this.subs.push(sub);
    sub.on('event', (event: NostrEvent) => this.handleEvent(event, relay));
    sub.on('eose', () => this.markRelay(relay, true));
    sub.on('notice', (msg: string) => this.markRelay(relay, undefined, msg));
    this.markRelay(relay, false);
  }

  private scheduleHealthCheck(): void {
    if (!this.active) return;
    if (this.healthTimer) return;
    this.healthTimer = setTimeout(() => {
      this.healthTimer = null;
      this.runHealthCheck();
      this.scheduleHealthCheck();
    }, this.config.backoff.initialMs);
  }

  private runHealthCheck(): void {
    const now = Date.now();
    for (const relay of this.config.relays) {
      const status = this.relayStatus.get(relay);
      const lastSeen = status?.lastSeen || 0;
      if (!status || !status.connected || now - lastSeen > this.config.backoff.maxMs) {
        this.scheduleReconnect(relay, status?.attempts || 0);
      }
    }
  }

  private scheduleReconnect(relay: string, attempts: number): void {
    if (this.backoffTimers.has(relay)) return;
    const { initialMs, maxMs, factor, jitterMs } = this.config.backoff;
    const base = Math.min(maxMs, initialMs * Math.pow(factor, Math.max(0, attempts)));
    const jitter = Math.random() * jitterMs;
    const delay = base + jitter;
    const timer = setTimeout(() => {
      this.backoffTimers.delete(relay);
      this.subscribeRelay(relay);
    }, delay);
    this.backoffTimers.set(relay, timer);
  }

  private handleEvent(event: NostrEvent, relay?: string): void {
    if (!this.active) return;
    const envelope = validateEnvelope(event, this.config);
    if (!envelope.ok) { this.bumpDrop(envelope.reason!); return; }
    const parsed = parseEvent(event, this.config);
    if (!parsed.features.length) { this.bumpDrop(parsed.reason || 'invalid_geojson'); return; }
    this.metrics.parsed += parsed.features.length;
    const insertResult = this.cache.insert(parsed.features);
    if (insertResult.dropped) {
      const deduped = insertResult.dropped - insertResult.staleDropped;
      if (deduped) {
        this.metrics.deduped += deduped;
        this.metrics.dropped.deduped += deduped;
      }
      if (insertResult.staleDropped) {
        this.metrics.stale += insertResult.staleDropped;
        this.metrics.dropped.stale += insertResult.staleDropped;
      }
    }
    if (!insertResult.accepted.length) return;
    this.pending.push({ event, relay, features: insertResult.accepted });
    if (relay) this.markRelay(relay, true);
    this.scheduleFlush();
    this.emitMetrics();
  }

  private scheduleFlush(): void {
    if (this.debounceHandle) return;
    this.debounceHandle = setTimeout(() => {
      this.flushPending().catch(() => undefined);
      this.debounceHandle = null;
    }, this.config.debounceMs);
  }

  private async flushPending(): Promise<void> {
    const batch = this.pending.splice(0, this.pending.length);
    if (!batch.length) return;
    for (const item of batch) {
      const context = { sourceEvent: item.event, relay: item.relay } as const;
      for (const feature of item.features) {
        const mapped = mapFeatureToIntel(feature, context, this.config);
        if (!mapped || !mapped.validationOk) {
          if (mapped && mapped.validationErrors?.length) this.bumpDrop('validation_failed');
          continue;
        }
        const imported = await importIntelReport(mapped);
        if (imported) {
          this.metrics.imported += 1;
          this.importedIds.add(imported.id);
        }
      }
    }
    this.emitMetrics();
  }

  private bumpDrop(reason: keyof GeoIntMetrics['dropped']): void {
    this.metrics.dropped[reason] = (this.metrics.dropped[reason] || 0) + 1;
    this.emitMetrics();
  }

  private createEmptyMetrics(): GeoIntMetrics {
    return {
      parsed: 0,
      dropped: {
        invalid_sig: 0,
        invalid_shape: 0,
        invalid_kind: 0,
        too_large: 0,
        too_many_tags: 0,
        invalid_tags: 0,
        missing_app_tag: 0,
        invalid_geo: 0,
        invalid_geojson: 0,
        stale: 0,
        deduped: 0,
        bounds: 0,
        parse_error: 0,
        validation_failed: 0
      },
      deduped: 0,
      stale: 0,
      imported: 0
    };
  }

  private emitMetrics(): void {
    if (!this.metricsListeners.size) return;
    const snapshot = this.cloneMetrics();
    this.metricsListeners.forEach(listener => {
      try { listener(snapshot); } catch { /* ignore listener errors */ }
    });
  }

  private emitRelayStatus(): void {
    if (!this.relayListeners.size) return;
    const snapshot = this.getRelayStatus();
    this.relayListeners.forEach(listener => {
      try { listener(snapshot); } catch { /* ignore listener errors */ }
    });
  }

  private cloneMetrics(): GeoIntMetrics {
    return {
      ...this.metrics,
      dropped: { ...this.metrics.dropped }
    };
  }

  private async cleanupImported(): Promise<void> {
    if (!this.importedIds.size) return;
    const ids = Array.from(this.importedIds);
    this.importedIds.clear();
    for (const id of ids) {
      try {
        await intelReportService.deleteReport(id);
      } catch { /* swallow cleanup errors */ }
    }
  }
}

export const nostrGeoIntService = new NostrGeoIntService();
