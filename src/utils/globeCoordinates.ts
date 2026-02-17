import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

export function latLngToGlobeVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const latRad = lat * DEG2RAD;
  const lngRad = lng * DEG2RAD;

  const x = radius * Math.cos(latRad) * Math.cos(lngRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lngRad);

  return new THREE.Vector3(x, y, z);
}

export function vector3ToLatLng(point: THREE.Vector3, radius?: number): { lat: number; lng: number } {
  const r = radius && radius > 0 ? radius : point.length() || 1;
  const lat = Math.asin(clamp(point.y / r, -1, 1)) * RAD2DEG;
  const lng = normalizeLongitude(Math.atan2(-point.z, point.x) * RAD2DEG);
  return { lat, lng };
}
