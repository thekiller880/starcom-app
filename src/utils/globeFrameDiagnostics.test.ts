import { createGlobeFrameDiagnosticsSnapshot } from './globeFrameDiagnostics';

describe('globeFrameDiagnostics', () => {
  it('returns canonical probes with bounded round-trip error', () => {
    const snapshot = createGlobeFrameDiagnosticsSnapshot(100);

    expect(snapshot.probes).toHaveLength(6);
    expect(snapshot.maxRoundTripLatErrorDeg).toBeLessThan(1e-6);
    expect(snapshot.maxRoundTripLngErrorDeg).toBeLessThan(1e-6);
  });

  it('keeps canonical cardinal vectors on expected axes', () => {
    const snapshot = createGlobeFrameDiagnosticsSnapshot(1);

    const byLabel = new Map(snapshot.probes.map((probe) => [probe.label, probe]));

    const primeMeridian = byLabel.get('prime-meridian');
    const east90 = byLabel.get('east-90');
    const west90 = byLabel.get('west-90');
    const antiMeridian = byLabel.get('anti-meridian');

    expect(primeMeridian).toBeDefined();
    expect(east90).toBeDefined();
    expect(west90).toBeDefined();
    expect(antiMeridian).toBeDefined();

    expect(primeMeridian!.vector.x).toBeCloseTo(1, 6);
    expect(primeMeridian!.vector.y).toBeCloseTo(0, 6);
    expect(primeMeridian!.vector.z).toBeCloseTo(0, 6);

    expect(east90!.vector.x).toBeCloseTo(0, 6);
    expect(east90!.vector.z).toBeCloseTo(-1, 6);

    expect(west90!.vector.x).toBeCloseTo(0, 6);
    expect(west90!.vector.z).toBeCloseTo(1, 6);

    expect(antiMeridian!.vector.x).toBeCloseTo(-1, 6);
    expect(antiMeridian!.vector.z).toBeCloseTo(0, 6);
  });
});
