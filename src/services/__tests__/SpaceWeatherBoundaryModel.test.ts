import {
  computeBowShockDeformation,
  computeMagnetopauseDeformation
} from '../SpaceWeatherBoundaryModel';

describe('SpaceWeatherBoundaryModel', () => {
  it('computes stable magnetopause deformation profile from pressure and IMF inputs', () => {
    const profile = computeMagnetopauseDeformation(10.2, {
      pressureNPa: 2.1,
      speedKmPerSec: 430,
      bz: -5
    });

    expect(profile.modelVersion).toBe('shue-approx-v1');
    expect(profile.noseRe).toBeCloseTo(10.2, 2);
    expect(profile.flankRe).toBeGreaterThan(profile.noseRe);
    expect(profile.tailRe).toBeGreaterThan(profile.flankRe);
    expect(profile.alpha).toBeGreaterThan(0.4);
    expect(profile.alpha).toBeLessThan(1);
    expect(profile.aberrationDeg).toBeGreaterThan(0);
    expect(profile.confidence).toBeGreaterThan(0.7);
  });

  it('computes bow shock deformation outside magnetopause with consistent skew', () => {
    const magnetopause = computeMagnetopauseDeformation(9.8, {
      pressureNPa: 3,
      speedKmPerSec: 550,
      bz: 1
    });

    const bowShock = computeBowShockDeformation(13.6, magnetopause, {
      pressureNPa: 3,
      speedKmPerSec: 550,
      bz: 1
    });

    expect(bowShock.noseRe).toBeGreaterThan(magnetopause.noseRe);
    expect(bowShock.flankRe).toBeGreaterThan(bowShock.noseRe);
    expect(bowShock.tailRe).toBeGreaterThan(bowShock.flankRe);
    expect(bowShock.dawnDuskSkew).toBeCloseTo(magnetopause.dawnDuskSkew, 6);
    expect(bowShock.northSouthSkew).toBeCloseTo(magnetopause.northSouthSkew, 6);
  });
});
