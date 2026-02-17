export type BoundaryModelVersion = 'shue-approx-v1';

export type BoundaryDeformationProfile = {
  modelVersion: BoundaryModelVersion;
  noseRe: number;
  flankRe: number;
  tailRe: number;
  alpha: number;
  aberrationDeg: number;
  dawnDuskSkew: number;
  northSouthSkew: number;
  confidence: number;
};

export type BoundaryModelInputs = {
  pressureNPa: number;
  speedKmPerSec: number;
  bz?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toFinite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

const computeAberrationDeg = (speedKmPerSec: number): number => {
  const solarWindSpeed = Math.max(100, speedKmPerSec);
  const earthOrbitalSpeed = 29.78;
  const aberrationRad = Math.atan2(earthOrbitalSpeed, solarWindSpeed);
  return clamp((aberrationRad * 180) / Math.PI, 0, 12);
};

const computeShueAlpha = (pressureNPa: number, bz?: number): number => {
  const safePressure = Math.max(0.1, pressureNPa);
  const bzTerm = typeof bz === 'number' ? -0.007 * bz : 0;
  const alpha = (0.58 + bzTerm) * (1 + 0.024 * Math.log(safePressure));
  return clamp(alpha, 0.4, 0.95);
};

const shueRadiusAtTheta = (noseRe: number, alpha: number, thetaRad: number): number => {
  const denominator = 1 + Math.cos(thetaRad);
  const safeDenominator = Math.max(0.02, denominator);
  const factor = Math.pow(2 / safeDenominator, alpha);
  return noseRe * factor;
};

export function computeMagnetopauseDeformation(
  standoffRe: number,
  inputs: BoundaryModelInputs
): BoundaryDeformationProfile {
  const safeStandoff = clamp(toFinite(standoffRe, 10), 4, 35);
  const alpha = computeShueAlpha(inputs.pressureNPa, inputs.bz);
  const flankRe = shueRadiusAtTheta(safeStandoff, alpha, Math.PI / 2);
  const tailRe = shueRadiusAtTheta(safeStandoff, alpha, (170 * Math.PI) / 180);
  const dawnDuskSkew = clamp(-computeAberrationDeg(inputs.speedKmPerSec) / 20, -0.6, 0.6);
  const northSouthSkew = clamp((inputs.bz ?? 0) / 30, -0.5, 0.5);
  const confidence = typeof inputs.bz === 'number' ? 0.85 : 0.65;

  return {
    modelVersion: 'shue-approx-v1',
    noseRe: safeStandoff,
    flankRe,
    tailRe,
    alpha,
    aberrationDeg: computeAberrationDeg(inputs.speedKmPerSec),
    dawnDuskSkew,
    northSouthSkew,
    confidence
  };
}

export function computeBowShockDeformation(
  bowShockRe: number,
  magnetopauseProfile: BoundaryDeformationProfile,
  inputs: BoundaryModelInputs
): BoundaryDeformationProfile {
  const safeBowShock = clamp(toFinite(bowShockRe, magnetopauseProfile.noseRe + 2.5), magnetopauseProfile.noseRe + 1, 50);
  const alpha = clamp(magnetopauseProfile.alpha * 0.9, 0.35, 0.85);
  const flankRe = shueRadiusAtTheta(safeBowShock, alpha, Math.PI / 2);
  const tailRe = shueRadiusAtTheta(safeBowShock, alpha, (172 * Math.PI) / 180);
  const pressureFactor = clamp(Math.log(Math.max(inputs.pressureNPa, 0.1) + 1) / 3, 0, 1);
  const confidence = typeof inputs.bz === 'number' ? 0.8 : 0.6;

  return {
    modelVersion: 'shue-approx-v1',
    noseRe: safeBowShock,
    flankRe,
    tailRe: tailRe * (1 + pressureFactor * 0.12),
    alpha,
    aberrationDeg: computeAberrationDeg(inputs.speedKmPerSec),
    dawnDuskSkew: magnetopauseProfile.dawnDuskSkew,
    northSouthSkew: magnetopauseProfile.northSouthSkew,
    confidence
  };
}
