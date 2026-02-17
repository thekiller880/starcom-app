import { IntelGlobeService } from '../src/services/intelligence/IntelGlobeService';

// Minimal window/performance stubs for SSR-less testing
const originalWindow = (global as any).window;
const originalRequestAnimationFrame = (global as any).requestAnimationFrame;
const originalCancelAnimationFrame = (global as any).cancelAnimationFrame;
const originalPerformance = (global as any).performance;

describe('IntelGlobeService performance snapshots', () => {
  beforeEach(() => {
    (global as any).window = { devicePixelRatio: 1 };
    (global as any).requestAnimationFrame = jest.fn(() => 1);
    (global as any).cancelAnimationFrame = jest.fn();
    (global as any).performance = {
      now: jest.fn(() => 120),
      memory: { usedJSHeapSize: 2048 }
    };
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).requestAnimationFrame = originalRequestAnimationFrame;
    (global as any).cancelAnimationFrame = originalCancelAnimationFrame;
    (global as any).performance = originalPerformance;
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it('records render time, fps, and memory snapshot', () => {
    const svc = new IntelGlobeService({ maxMarkers: 10 } as any);

    // Inject stub markers to simulate visibility without constructing THREE objects
    (svc as any).markers = new Map([
      ['a', { id: 'a', group: { visible: true } }],
      ['b', { id: 'b', group: { visible: false } }]
    ]);

    (svc as any).updatePerformanceSnapshot(100);
    const metrics = svc.getPerformanceMetrics();
    const frameStats = svc.getFrameStatsSnapshot();

    expect(metrics.renderTime).toBeGreaterThanOrEqual(0);
    expect(metrics.visibleIntelReports).toBe(1);
    expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.fps).toBeGreaterThan(0);
    expect(frameStats.samples).toBeGreaterThan(0);
  });
});
