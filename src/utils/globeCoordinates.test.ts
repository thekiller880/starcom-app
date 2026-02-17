import { Vector3 } from 'three';
import { latLngToGlobeVector3, normalizeLongitude, vector3ToLatLng } from './globeCoordinates';

const EPSILON = 1e-6;

describe('globeCoordinates', () => {
  it('normalizes longitude into [-180, 180)', () => {
    expect(normalizeLongitude(190)).toBe(-170);
    expect(normalizeLongitude(-190)).toBe(170);
    expect(normalizeLongitude(540)).toBe(-180);
  });

  it('maps cardinal lat/lng to expected unit vectors', () => {
    const primeMeridian = latLngToGlobeVector3(0, 0, 1);
    expect(primeMeridian.x).toBeCloseTo(1, 6);
    expect(primeMeridian.y).toBeCloseTo(0, 6);
    expect(primeMeridian.z).toBeCloseTo(0, 6);

    const east90 = latLngToGlobeVector3(0, 90, 1);
    expect(east90.x).toBeCloseTo(0, 6);
    expect(east90.y).toBeCloseTo(0, 6);
    expect(east90.z).toBeCloseTo(-1, 6);

    const northPole = latLngToGlobeVector3(90, 0, 1);
    expect(northPole.x).toBeCloseTo(0, 6);
    expect(northPole.y).toBeCloseTo(1, 6);
    expect(northPole.z).toBeCloseTo(0, 6);

    const west90 = latLngToGlobeVector3(0, -90, 1);
    expect(west90.x).toBeCloseTo(0, 6);
    expect(west90.y).toBeCloseTo(0, 6);
    expect(west90.z).toBeCloseTo(1, 6);

    const antiMeridian = latLngToGlobeVector3(0, 180, 1);
    expect(antiMeridian.x).toBeCloseTo(-1, 6);
    expect(antiMeridian.y).toBeCloseTo(0, 6);
    expect(antiMeridian.z).toBeCloseTo(0, 6);
  });

  it('round-trips lat/lng through vector conversion', () => {
    const cases = [
      { lat: 0, lng: 0, radius: 1 },
      { lat: 37.7749, lng: -122.4194, radius: 100 },
      { lat: -33.8688, lng: 151.2093, radius: 250 },
      { lat: 64.1265, lng: -21.8174, radius: 42 },
      { lat: -12.0464, lng: -77.0428, radius: 73 }
    ];

    for (const current of cases) {
      const vector = latLngToGlobeVector3(current.lat, current.lng, current.radius);
      const result = vector3ToLatLng(vector, current.radius);

      expect(result.lat).toBeCloseTo(current.lat, 6);
      expect(normalizeLongitude(result.lng)).toBeCloseTo(normalizeLongitude(current.lng), 6);
    }
  });

  it('preserves position for pick-to-marker conversion flow', () => {
    const picked = new Vector3(34.2, 72.9, -55.4).normalize().multiplyScalar(100);

    const pickedLatLng = vector3ToLatLng(picked, 100);
    const markerPosition = latLngToGlobeVector3(pickedLatLng.lat, pickedLatLng.lng, 100);

    expect(markerPosition.distanceTo(picked)).toBeLessThan(EPSILON);
  });

  it('derives radius from vector length when omitted', () => {
    const point = new Vector3(0, 2, 0);
    const result = vector3ToLatLng(point);

    expect(result.lat).toBeCloseTo(90, 6);
    expect(Math.abs(result.lng)).toBeLessThan(EPSILON);
  });

  it('keeps pole vectors on Y axis for any longitude', () => {
    const northPoleAt120E = latLngToGlobeVector3(90, 120, 1);
    const southPoleAt45W = latLngToGlobeVector3(-90, -45, 1);

    expect(northPoleAt120E.x).toBeCloseTo(0, 6);
    expect(northPoleAt120E.y).toBeCloseTo(1, 6);
    expect(northPoleAt120E.z).toBeCloseTo(0, 6);

    expect(southPoleAt45W.x).toBeCloseTo(0, 6);
    expect(southPoleAt45W.y).toBeCloseTo(-1, 6);
    expect(southPoleAt45W.z).toBeCloseTo(0, 6);
  });
});
