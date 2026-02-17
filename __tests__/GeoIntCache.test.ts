import { GeoIntCache } from '../src/services/geoint/cache';
import { GEOINT_DEFAULT_CONFIG } from '../src/services/geoint/config';
import { ParsedFeature } from '../src/services/geoint/types';

describe('GeoIntCache', () => {
  const baseConfig = { ...GEOINT_DEFAULT_CONFIG, freshnessWindowMs: 1_000_000 };

  function feature(id: string, createdAtMs: number): ParsedFeature {
    return {
      id,
      kind: 'point',
      createdAtMs,
      geometry: { lat: 0, lon: 0 },
      props: {}
    };
  }

  beforeEach(() => {
    jest.useFakeTimers({ now: 10_000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('evicts oldest when exceeding cap', () => {
    const cache = new GeoIntCache({ ...baseConfig, maxEventsStored: 2 });
    const f1 = feature('a', 1_000);
    const f2 = feature('b', 2_000);
    const f3 = feature('c', 3_000);

    cache.insert([f1, f2]);
    expect(cache.values().map(f => f.id)).toEqual(['b', 'a']);

    cache.insert([f3]);
    expect(cache.values().map(f => f.id)).toEqual(['c', 'b']);
  });

  it('dedupes repeated ids', () => {
    const cache = new GeoIntCache({ ...baseConfig, maxEventsStored: 5 });
    const f1 = feature('dup', 1_000);

    const first = cache.insert([f1]);
    expect(first.accepted).toHaveLength(1);

    const second = cache.insert([feature('dup', 2_000)]);
    expect(second.accepted).toHaveLength(0);
    expect(cache.values().map(f => f.id)).toEqual(['dup']);
  });

  it('handles burst inserts without exceeding cap', () => {
    const cache = new GeoIntCache({ ...baseConfig, maxEventsStored: 50 });
    const burst: ParsedFeature[] = [];
    for (let i = 0; i < 500; i++) {
      burst.push(feature(`id-${i}`, 9_000 + i));
    }

    cache.insert(burst);

    expect(cache.values()).toHaveLength(50);
    const newest = cache.values()[0];
    const oldest = cache.values()[49];
    expect(newest.createdAtMs).toBeGreaterThan(oldest.createdAtMs);
  });
});
