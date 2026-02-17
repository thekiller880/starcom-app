import { latLngToGlobeVector3, normalizeLongitude } from '../utils/globeCoordinates';
import * as THREE from 'three';

export type SolarEphemeris = {
  rightAscensionDeg: number;
  declinationDeg: number;
  subsolarLatitudeDeg: number;
  subsolarLongitudeDeg: number;
  gmstDeg: number;
  julianDay: number;
};

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const normalize360 = (value: number) => {
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const toJulianDay = (date: Date): number => date.getTime() / 86400000 + 2440587.5;

export function computeSolarEphemeris(date: Date): SolarEphemeris {
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525;

  const L0 = normalize360(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = normalize360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const MRad = M * DEG2RAD;
  const equationOfCenter =
    Math.sin(MRad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * MRad) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * MRad) * 0.000289;

  const trueLongitude = L0 + equationOfCenter;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEG2RAD);

  const epsilon0 =
    23 +
    (26 +
      (21.448 -
        T *
          (46.815 +
            T * (0.00059 - T * 0.001813))) /
        60) /
      60;
  const epsilon = epsilon0 + 0.00256 * Math.cos(omega * DEG2RAD);

  const lambdaRad = lambda * DEG2RAD;
  const epsilonRad = epsilon * DEG2RAD;

  const alpha = Math.atan2(
    Math.cos(epsilonRad) * Math.sin(lambdaRad),
    Math.cos(lambdaRad)
  ) * RAD2DEG;

  const delta = Math.asin(Math.sin(epsilonRad) * Math.sin(lambdaRad)) * RAD2DEG;

  const theta = normalize360(
    280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      T * T * (0.000387933 - T / 38710000)
  );

  const rightAscension = normalize360(alpha);
  const subsolarLongitudeDeg = normalizeLongitude(rightAscension - theta);

  return {
    rightAscensionDeg: rightAscension,
    declinationDeg: delta,
    subsolarLatitudeDeg: delta,
    subsolarLongitudeDeg,
    gmstDeg: theta,
    julianDay: jd
  };
}

export function computeSunDirectionGlobe(date: Date, textureLongitudeOffsetDeg = 0): THREE.Vector3 {
  const ephemeris = computeSolarEphemeris(date);
  const adjustedLongitude = normalizeLongitude(ephemeris.subsolarLongitudeDeg + textureLongitudeOffsetDeg);
  return latLngToGlobeVector3(ephemeris.subsolarLatitudeDeg, adjustedLongitude, 1).normalize();
}
