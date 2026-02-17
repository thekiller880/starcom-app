import * as THREE from 'three';
import { latLngToGlobeVector3, vector3ToLatLng } from './globeCoordinates';

const DEFAULT_GLOBE_RADIUS = 100;

function getSphereRadius(mesh: THREE.Mesh): number | null {
  if (!(mesh.geometry instanceof THREE.SphereGeometry || mesh.geometry.type === 'SphereBufferGeometry')) {
    return null;
  }

  const sphereGeometry = mesh.geometry as THREE.SphereGeometry;
  const radius = sphereGeometry.parameters?.radius ?? sphereGeometry.boundingSphere?.radius;
  return typeof radius === 'number' && Number.isFinite(radius) && radius > 0 ? radius : null;
}

function getGlobeCandidateScore(mesh: THREE.Mesh): number {
  const radius = getSphereRadius(mesh);
  if (!radius) {
    return Number.NEGATIVE_INFINITY;
  }

  const name = mesh.name?.toLowerCase() ?? '';
  const nameBonus = name.includes('earth') || name.includes('globe') ? 500 : 0;
  const radiusScore = Math.max(0, 220 - Math.abs(radius - DEFAULT_GLOBE_RADIUS) * 4);
  const positionLength = mesh.position.length();
  const centerScore = Math.max(0, 50 - positionLength);

  return nameBonus + radiusScore + centerScore;
}

export function findPrimaryGlobeMesh(scene: THREE.Scene): THREE.Mesh | null {
  let bestMesh: THREE.Mesh | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const score = getGlobeCandidateScore(child);
    if (score > bestScore) {
      bestScore = score;
      bestMesh = child;
    }
  });

  return bestMesh;
}

export function getGlobeMeshRadius(globeMesh: THREE.Mesh): number {
  return getSphereRadius(globeMesh) ?? DEFAULT_GLOBE_RADIUS;
}

export function worldPointToGeoOnGlobe(worldPoint: THREE.Vector3, globeMesh: THREE.Mesh): { lat: number; lng: number } {
  globeMesh.updateMatrixWorld(true);
  const inverseWorld = globeMesh.matrixWorld.clone().invert();
  const localPoint = worldPoint.clone().applyMatrix4(inverseWorld);
  return vector3ToLatLng(localPoint, getGlobeMeshRadius(globeMesh));
}

export function geoToWorldPointOnGlobe(
  lat: number,
  lng: number,
  globeMesh: THREE.Mesh,
  radius: number = getGlobeMeshRadius(globeMesh)
): THREE.Vector3 {
  const localPoint = latLngToGlobeVector3(lat, lng, radius);
  globeMesh.updateMatrixWorld(true);
  return localPoint.applyMatrix4(globeMesh.matrixWorld);
}
