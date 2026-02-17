import { describe, expect, test } from '@jest/globals';
import { computeSolarEphemeris, computeSunDirectionGlobe } from '../SolarEphemerisService';

describe('SolarEphemerisService', () => {
  test('computes subsolar latitude near equinox around UTC noon', () => {
    const date = new Date('2025-03-20T12:00:00Z');
    const eph = computeSolarEphemeris(date);

    expect(Math.abs(eph.subsolarLatitudeDeg)).toBeLessThan(2.5);
    expect(Number.isFinite(eph.subsolarLongitudeDeg)).toBe(true);
    expect(eph.subsolarLongitudeDeg).toBeGreaterThanOrEqual(-180);
    expect(eph.subsolarLongitudeDeg).toBeLessThanOrEqual(180);
  });

  test('sun direction is normalized and responds to texture offset', () => {
    const date = new Date('2025-06-21T12:00:00Z');
    const noOffset = computeSunDirectionGlobe(date, 0);
    const offset90 = computeSunDirectionGlobe(date, 90);

    expect(noOffset.length()).toBeCloseTo(1, 6);
    expect(offset90.length()).toBeCloseTo(1, 6);
    expect(noOffset.distanceTo(offset90)).toBeGreaterThan(0.5);
  });
});
