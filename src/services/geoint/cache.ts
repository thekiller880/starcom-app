import { GeoIntConfig, ParsedFeature, CacheInsertResult } from './types';

export class GeoIntCache {
  private map = new Map<string, ParsedFeature>();
  private seenIds = new Set<string>();
  constructor(private config: GeoIntConfig) {}

  clear(): void {
    this.map.clear();
    this.seenIds.clear();
  }

  prune(now: number): void {
    const cutoff = now - this.config.freshnessWindowMs;
    for (const [id, feat] of this.map.entries()) {
      if (feat.createdAtMs < cutoff) {
        this.map.delete(id);
        this.seenIds.delete(id);
      }
    }
    if (this.map.size > this.config.maxEventsStored) {
      const entries = Array.from(this.map.values()).sort((a, b) => a.createdAtMs - b.createdAtMs);
      const toDrop = this.map.size - this.config.maxEventsStored;
      for (let i = 0; i < toDrop; i++) {
        const victim = entries[i];
        this.map.delete(victim.id);
        this.seenIds.delete(victim.id);
      }
    }
  }

  insert(features: ParsedFeature[]): CacheInsertResult {
    const now = Date.now();
    const cutoff = now - this.config.freshnessWindowMs;
    const accepted: ParsedFeature[] = [];
    let dropped = 0;
    let staleDropped = 0;
    for (const feat of features) {
      if (feat.createdAtMs < cutoff) { dropped++; staleDropped++; continue; }
      if (this.seenIds.has(feat.id)) { dropped++; continue; }
      this.map.set(feat.id, feat);
      this.seenIds.add(feat.id);
      accepted.push(feat);
    }
    this.prune(now);
    return { accepted, dropped, staleDropped };
  }

  values(): ParsedFeature[] {
    return Array.from(this.map.values()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  }
}
