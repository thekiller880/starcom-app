import * as THREE from 'three';
import { IntelGlobeService } from '../src/services/intelligence/IntelGlobeService';

const originalWindow = (global as any).window;
const originalRAF = (global as any).requestAnimationFrame;
const originalCAF = (global as any).cancelAnimationFrame;

describe('IntelGlobeService disposal', () => {
  beforeEach(() => {
    (global as any).window = { devicePixelRatio: 1 };
    (global as any).requestAnimationFrame = jest.fn(() => 1);
    (global as any).cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
    (global as any).requestAnimationFrame = originalRAF;
    (global as any).cancelAnimationFrame = originalCAF;
    jest.clearAllMocks();
  });

  it('disposes geometries and materials when removing markers', () => {
    const svc = new IntelGlobeService({ maxMarkers: 5 } as any);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);

    const marker = {
      id: 'm1',
      report: { id: 'm1', location: { lat: 0, lng: 0 }, visualization: {} } as any,
      group,
      mesh,
      position: new THREE.Vector3(),
      surfacePosition: new THREE.Vector3(),
      animations: [],
      visible: true,
      lodLevel: 'high' as const,
      lastUpdate: new Date()
    };

    const geoSpy = jest.spyOn(geometry, 'dispose');
    const matSpy = jest.spyOn(material, 'dispose');

    (svc as any).markers = new Map([[marker.id, marker]]);

    const removed = svc.removeIntelReport('m1');

    expect(removed).toBe(true);
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
    expect((svc as any).markers.size).toBe(0);
  });
});
