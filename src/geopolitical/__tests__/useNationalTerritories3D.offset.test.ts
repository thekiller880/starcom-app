import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GEOPOLITICAL_SCENE_COUNTER_OFFSET_RAD,
  applyGeoPoliticalSceneCounterOffset
} from '../hooks/useNationalTerritories3D';

describe('useNationalTerritories3D scene counter-offset', () => {
  it('applies -90 degree Y counter-offset to geopolitical groups', () => {
    const group = new THREE.Group();
    expect(group.rotation.y).toBe(0);

    applyGeoPoliticalSceneCounterOffset(group);

    expect(group.rotation.y).toBeCloseTo(GEOPOLITICAL_SCENE_COUNTER_OFFSET_RAD, 8);
    expect(group.userData.sceneCounterOffsetRad).toBeCloseTo(GEOPOLITICAL_SCENE_COUNTER_OFFSET_RAD, 8);
  });
});
