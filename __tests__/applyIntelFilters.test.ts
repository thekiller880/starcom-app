import { applyIntelFilters } from '../src/services/intelligence/filterUtils';
import type { IntelReport3DData } from '../src/models/Intel/IntelVisualization3D';

describe('applyIntelFilters', () => {
  const baseReport = (overrides: Partial<IntelReport3DData> = {}): IntelReport3DData => ({
    id: 'r1',
    title: 'Test',
    content: { summary: 'summary', details: 'details' } as any,
    visualization: { priority: 'high' } as any,
    metadata: { tags: [], category: 'cyber_threat' } as any,
    timestamp: new Date(),
    location: { lat: 0, lng: 0 },
    ...overrides,
  });

  it('filters by riskLevels with tag and priority fallback', () => {
    const reports: IntelReport3DData[] = [
      baseReport({ id: 'highTag', metadata: { tags: ['risk:high'] } as any }),
      baseReport({ id: 'mediumPriority', visualization: { priority: 'medium' } as any }),
      baseReport({ id: 'lowDefault', visualization: { priority: 'low' } as any }),
    ];

    const filtered = applyIntelFilters(reports, { riskLevels: ['high'] });
    expect(filtered.map(r => r.id)).toEqual(['highTag']);

    const filteredMedium = applyIntelFilters(reports, { riskLevels: ['medium'] });
    expect(filteredMedium.map(r => r.id)).toEqual(['mediumPriority']);
  });

  it('filters by relay whitelist and source tag', () => {
    const reports: IntelReport3DData[] = [
      baseReport({ id: 'relayA', metadata: { tags: ['relay:a.relay', 'source:alpha'] } as any }),
      baseReport({ id: 'relayB', metadata: { tags: ['relay:b.relay', 'source:beta'] } as any }),
    ];

    const byRelay = applyIntelFilters(reports, { relayWhitelist: ['a.relay'] });
    expect(byRelay.map(r => r.id)).toEqual(['relayA']);

    const bySource = applyIntelFilters(reports, { sourceTag: 'beta' });
    expect(bySource.map(r => r.id)).toEqual(['relayB']);
  });

  it('filters by timeRange (recency)', () => {
    const now = Date.now();
    const recent = baseReport({ id: 'recent', timestamp: new Date(now - 60_000) });
    const stale = baseReport({ id: 'stale', timestamp: new Date(now - 10 * 60_000) });

    const filtered = applyIntelFilters([recent, stale], {
      timeRange: { start: new Date(now - 5 * 60_000), end: new Date(now) }
    });

    expect(filtered.map(r => r.id)).toEqual(['recent']);
  });
});
