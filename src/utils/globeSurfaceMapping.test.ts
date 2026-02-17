import * as THREE from 'three';
import { findPrimaryGlobeMesh, geoToWorldPointOnGlobe, worldPointToGeoOnGlobe } from './globeSurfaceMapping';

describe('globeSurfaceMapping', () => {
  it('selects the primary earth globe mesh over helper spheres', () => {
    const scene = new THREE.Scene();

    const helperSphere = new THREE.Mesh(new THREE.SphereGeometry(8, 8, 8), new THREE.MeshBasicMaterial());
    helperSphere.name = 'mouse-indicator';
    helperSphere.position.set(30, 10, 20);

    const earthSphere = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial());
    earthSphere.name = 'earth-globe';

    scene.add(helperSphere);
    scene.add(earthSphere);

    const result = findPrimaryGlobeMesh(scene);
    expect(result).toBe(earthSphere);
  });

  it('maps geo -> world -> geo consistently when globe is rotated', () => {
    const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial());
    globeMesh.rotation.y = -Math.PI / 2;
    globeMesh.updateMatrixWorld(true);

    const input = { lat: 18.25, lng: -73.5 };
    const worldPoint = geoToWorldPointOnGlobe(input.lat, input.lng, globeMesh, 100);
    const roundTrip = worldPointToGeoOnGlobe(worldPoint, globeMesh);

    expect(roundTrip.lat).toBeCloseTo(input.lat, 5);
    expect(roundTrip.lng).toBeCloseTo(input.lng, 5);
  });
});
