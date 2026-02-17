import { describe, expect, it } from 'vitest';
import { normalizeOuterRingDetailed, splitRingAtDateline } from '../polygonNormalize';

describe('polygonNormalize dateline splitting', () => {
  it('creates valid seam points for +170 -> -170 crossings', () => {
    const ring: [number, number][] = [
      [170, 10],
      [-170, 20],
      [-160, 0],
      [170, 10]
    ];

    const parts = splitRingAtDateline(ring);
    expect(parts.length).toBeGreaterThan(1);

    const seamPoints = parts.flatMap((part) => part.filter(([lon]) => Math.abs(Math.abs(lon) - 180) < 1e-9));
    expect(seamPoints.length).toBeGreaterThan(0);
    seamPoints.forEach(([, lat]) => {
      expect(Number.isFinite(lat)).toBe(true);
      expect(lat).toBeGreaterThanOrEqual(0);
      expect(lat).toBeLessThanOrEqual(20);
    });
  });

  it('creates valid seam points for -170 -> +170 crossings', () => {
    const ring: [number, number][] = [
      [-170, 10],
      [170, 20],
      [160, 0],
      [-170, 10]
    ];

    const parts = splitRingAtDateline(ring);
    expect(parts.length).toBeGreaterThan(1);

    const seamPoints = parts.flatMap((part) => part.filter(([lon]) => Math.abs(Math.abs(lon) - 180) < 1e-9));
    expect(seamPoints.length).toBeGreaterThan(0);
    seamPoints.forEach(([, lat]) => {
      expect(Number.isFinite(lat)).toBe(true);
      expect(lat).toBeGreaterThanOrEqual(0);
      expect(lat).toBeLessThanOrEqual(20);
    });
  });

  it('does not split rings that do not cross the dateline', () => {
    const ring: [number, number][] = [
      [-40, 0],
      [-30, 10],
      [-20, 0],
      [-40, 0]
    ];

    const parts = splitRingAtDateline(ring);
    expect(parts).toHaveLength(1);
  });

  it('does not classify northern high-lat dateline rings as polar', () => {
    const ring: [number, number][] = [
      [179.5, 72],
      [-179.5, 74],
      [-178.5, 70],
      [179.5, 72]
    ];

    const normalized = normalizeOuterRingDetailed(ring);
    expect(normalized.classification).toBe('split');
    expect(normalized.parts.length).toBeGreaterThan(1);
  });
});
