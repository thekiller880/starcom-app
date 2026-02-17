import { FrameStats } from '../src/services/intelligence/perf/FrameStats';

describe('FrameStats', () => {
  it('caps samples and computes averages', () => {
    const stats = new FrameStats(3);
    stats.record({ fps: 60, renderTimeMs: 10, heapBytes: 100 });
    stats.record({ fps: 30, renderTimeMs: 20, heapBytes: 200 });
    stats.record({ fps: 90, renderTimeMs: 30, heapBytes: 300 });
    stats.record({ fps: 120, renderTimeMs: 40, heapBytes: 400 }); // pushes out first

    const snap = stats.snapshot();
    expect(snap.samples).toBe(3);
    expect(snap.avgFps).toBeCloseTo((30 + 90 + 120) / 3);
    expect(snap.maxRenderMs).toBe(40);
    expect(snap.minRenderMs).toBe(20);
    expect(snap.avgHeap).toBeCloseTo((200 + 300 + 400) / 3);
  });

  it('returns zeros when empty', () => {
    const stats = new FrameStats();
    const snap = stats.snapshot();
    expect(snap.avgFps).toBe(0);
    expect(snap.samples).toBe(0);
  });
});
