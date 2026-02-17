import { Vector3 } from 'three';
import { latLngToGlobeVector3, normalizeLongitude, vector3ToLatLng } from './globeCoordinates';

export interface GlobeFrameProbe {
  label: string;
  lat: number;
  lng: number;
  vector: Vector3;
  reprojectedLat: number;
  reprojectedLng: number;
  roundTripLatErrorDeg: number;
  roundTripLngErrorDeg: number;
}

export interface GlobeFrameDiagnosticsSnapshot {
  radius: number;
  probes: GlobeFrameProbe[];
  maxRoundTripLatErrorDeg: number;
  maxRoundTripLngErrorDeg: number;
}

const DEFAULT_PROBES: Array<{ label: string; lat: number; lng: number }> = [
  { label: 'prime-meridian', lat: 0, lng: 0 },
  { label: 'east-90', lat: 0, lng: 90 },
  { label: 'west-90', lat: 0, lng: -90 },
  { label: 'anti-meridian', lat: 0, lng: 180 },
  { label: 'north-pole', lat: 90, lng: 0 },
  { label: 'south-pole', lat: -90, lng: 0 }
];

function absoluteLongitudeError(expectedLng: number, actualLng: number): number {
  return Math.abs(normalizeLongitude(actualLng - expectedLng));
}

export function createGlobeFrameDiagnosticsSnapshot(radius = 1): GlobeFrameDiagnosticsSnapshot {
  const probes: GlobeFrameProbe[] = DEFAULT_PROBES.map(({ label, lat, lng }) => {
    const vector = latLngToGlobeVector3(lat, lng, radius);
    const reprojected = vector3ToLatLng(vector, radius);
    const roundTripLatErrorDeg = Math.abs(reprojected.lat - lat);
    const roundTripLngErrorDeg = absoluteLongitudeError(lng, reprojected.lng);

    return {
      label,
      lat,
      lng,
      vector,
      reprojectedLat: reprojected.lat,
      reprojectedLng: reprojected.lng,
      roundTripLatErrorDeg,
      roundTripLngErrorDeg
    };
  });

  return {
    radius,
    probes,
    maxRoundTripLatErrorDeg: Math.max(...probes.map((probe) => probe.roundTripLatErrorDeg)),
    maxRoundTripLngErrorDeg: Math.max(...probes.map((probe) => probe.roundTripLngErrorDeg))
  };
}
