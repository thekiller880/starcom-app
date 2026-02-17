export interface FrameSample {
  fps?: number;
  renderTimeMs?: number;
  heapBytes?: number;
}

export interface FrameStatsSnapshot {
  avgFps: number;
  maxFps: number;
  minFps: number;
  avgRenderMs: number;
  maxRenderMs: number;
  minRenderMs: number;
  avgHeap: number;
  samples: number;
}

export class FrameStats {
  private samples: FrameSample[] = [];
  private maxSamples: number;

  constructor(maxSamples = 120) {
    this.maxSamples = Math.max(1, maxSamples);
  }

  record(sample: FrameSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  clear(): void {
    this.samples = [];
  }

  snapshot(): FrameStatsSnapshot {
    if (!this.samples.length) {
      return {
        avgFps: 0,
        maxFps: 0,
        minFps: 0,
        avgRenderMs: 0,
        maxRenderMs: 0,
        minRenderMs: 0,
        avgHeap: 0,
        samples: 0
      };
    }

    let fpsSum = 0;
    let fpsCount = 0;
    let fpsMax = 0;
    let fpsMin = Number.POSITIVE_INFINITY;

    let renderSum = 0;
    let renderCount = 0;
    let renderMax = 0;
    let renderMin = Number.POSITIVE_INFINITY;

    let heapSum = 0;
    let heapCount = 0;

    for (const s of this.samples) {
      if (typeof s.fps === 'number' && Number.isFinite(s.fps)) {
        fpsSum += s.fps;
        fpsCount++;
        fpsMax = Math.max(fpsMax, s.fps);
        fpsMin = Math.min(fpsMin, s.fps);
      }
      if (typeof s.renderTimeMs === 'number' && Number.isFinite(s.renderTimeMs)) {
        renderSum += s.renderTimeMs;
        renderCount++;
        renderMax = Math.max(renderMax, s.renderTimeMs);
        renderMin = Math.min(renderMin, s.renderTimeMs);
      }
      if (typeof s.heapBytes === 'number' && Number.isFinite(s.heapBytes)) {
        heapSum += s.heapBytes;
        heapCount++;
      }
    }

    return {
      avgFps: fpsCount ? fpsSum / fpsCount : 0,
      maxFps: fpsCount ? fpsMax : 0,
      minFps: fpsCount ? fpsMin : 0,
      avgRenderMs: renderCount ? renderSum / renderCount : 0,
      maxRenderMs: renderCount ? renderMax : 0,
      minRenderMs: renderCount ? renderMin : 0,
      avgHeap: heapCount ? heapSum / heapCount : 0,
      samples: this.samples.length
    };
  }
}
