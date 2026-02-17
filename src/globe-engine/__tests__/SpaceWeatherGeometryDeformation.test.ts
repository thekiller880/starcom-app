import { Box3, Vector3 } from 'three';
import { createBowShockMesh, createMagnetopauseMesh } from '../SpaceWeatherGeometry';
import type { BowShockPayload, MagnetopausePayload } from '../../services/SpaceWeatherModeling';

const getBoundsSize = (mesh: { updateMatrixWorld: (force?: boolean) => void }) => {
  mesh.updateMatrixWorld(true);
  const box = new Box3().setFromObject(mesh as any);
  return box.getSize(new Vector3());
};

describe('SpaceWeatherGeometry deformation shells', () => {
  it('falls back to near-spherical shell when deformation profile is absent', () => {
    const payload: MagnetopausePayload = {
      standoffRe: 10,
      quality: 'live',
      lastUpdated: '2024-01-01T00:00:00Z'
    };

    const mesh = createMagnetopauseMesh(payload);
    const size = getBoundsSize(mesh);

    expect(Math.abs(size.x - size.y)).toBeLessThan(5);
    expect(Math.abs(size.y - size.z)).toBeLessThan(5);
  });

  it('creates visibly non-spherical shell when deformation profile is present', () => {
    const payload: MagnetopausePayload = {
      standoffRe: 10,
      quality: 'live',
      lastUpdated: '2024-01-01T00:00:00Z',
      deformation: {
        modelVersion: 'shue-approx-v1',
        noseRe: 10,
        flankRe: 16,
        tailRe: 40,
        alpha: 0.72,
        aberrationDeg: 4,
        dawnDuskSkew: 0.2,
        northSouthSkew: -0.1,
        confidence: 0.9
      }
    };

    const mesh = createMagnetopauseMesh(payload);
    const size = getBoundsSize(mesh);

    expect(size.x).toBeGreaterThan(size.y + 80);
  });

  it('applies deformation and orientation to bow shock mesh', () => {
    const payload: BowShockPayload = {
      radiusRe: 14,
      quality: 'live',
      lastUpdated: '2024-01-01T00:00:00Z',
      deformation: {
        modelVersion: 'shue-approx-v1',
        noseRe: 14,
        flankRe: 20,
        tailRe: 46,
        alpha: 0.66,
        aberrationDeg: 6,
        dawnDuskSkew: 0.15,
        northSouthSkew: 0.08,
        confidence: 0.85
      }
    };

    const mesh = createBowShockMesh(payload);
    const size = getBoundsSize(mesh);

    expect(mesh.rotation.y).not.toBe(0);
    expect(size.x).toBeGreaterThan(size.z);
  });
});
