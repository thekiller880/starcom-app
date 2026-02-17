// SpaceWeatherGeometry.ts
// Geometry/material helpers for magnetopause, bow shock, and auroral overlays.
// MVP focuses on lightweight meshes with low vertex counts and simple materials.

import * as THREE from 'three';
import type { AuroraPayload, BowShockPayload, LatLng, MagnetopausePayload } from '../services/SpaceWeatherModeling';
import { latLngToGlobeVector3 } from '../utils/globeCoordinates';

const SHELL_WIDTH_SEGMENTS = 48; // keep under 5k verts with sphere geometry
const SHELL_HEIGHT_SEGMENTS = 32;
const DEFORMED_SHELL_WIDTH_SEGMENTS = 72;
const DEFORMED_SHELL_HEIGHT_SEGMENTS = 36;
const GLOBE_RADIUS_UNITS = 100; // Matches Globe.gl sphere radius used across app
const DEFAULT_AURORA_ALTITUDE_RE = 1.02; // Earth-radii altitude multiplier
const BLACKOUT_ALTITUDE_RE = 1.015; // Earth-radii altitude multiplier
const SHELL_VERTEX_CAP = 5000;
export const AURORA_POINT_CAP = 512;

const COLORS = {
  magnetopause: new THREE.Color('#20d0e8'),
  bowShock: new THREE.Color('#ff9f43'),
  aurora: new THREE.Color('#00ff80'),
  blackout: new THREE.Color('#0a0a0a')
};

function buildShell(radius: number, color: THREE.Color, opacity: number): THREE.Mesh {
  const radiusUnits = radius * GLOBE_RADIUS_UNITS;
  const geometry = new THREE.SphereGeometry(radiusUnits, SHELL_WIDTH_SEGMENTS, SHELL_HEIGHT_SEGMENTS);
  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  if (mesh.geometry.getAttribute('position').count > SHELL_VERTEX_CAP) {
    console.warn('[SpaceWeather] magnetopause/bow-shock shell exceeded vertex cap', {
      vertices: mesh.geometry.getAttribute('position').count,
      cap: SHELL_VERTEX_CAP
    });
  }
  return mesh;
}

function computeDeformedShellRadiusRe(
  fallbackRadiusRe: number,
  theta: number,
  phi: number,
  deformation: MagnetopausePayload['deformation'] | BowShockPayload['deformation']
): number {
  if (!deformation) {
    return fallbackRadiusRe;
  }

  const noseRe = Math.max(1, deformation.noseRe || fallbackRadiusRe);
  const alpha = THREE.MathUtils.clamp(deformation.alpha || 0.6, 0.3, 1.2);
  const denominator = Math.max(0.02, 1 + Math.cos(theta));
  const shue = noseRe * Math.pow(2 / denominator, alpha);

  const flankReference = noseRe * Math.pow(2 / (1 + Math.cos(Math.PI / 2)), alpha);
  const flankTarget = Math.max(noseRe, deformation.flankRe || flankReference);
  const flankScale = flankReference > 0 ? flankTarget / flankReference : 1;
  const flankWeight = Math.pow(Math.sin(theta), 2);

  const tailTarget = Math.max(flankTarget, deformation.tailRe || flankTarget * 1.4);
  const tailWeight = THREE.MathUtils.clamp((theta - Math.PI / 2) / (Math.PI / 2), 0, 1);
  const tailBlend = Math.pow(tailWeight, 1.35);

  let radius = shue * THREE.MathUtils.lerp(1, flankScale, flankWeight);
  radius = THREE.MathUtils.lerp(radius, tailTarget, tailBlend);

  const lateralWeight = Math.sin(theta);
  const dawnDuskTerm = (deformation.dawnDuskSkew || 0) * Math.sin(phi) * lateralWeight * 0.2;
  const northSouthTerm = (deformation.northSouthSkew || 0) * Math.cos(phi) * lateralWeight * 0.16;
  radius *= 1 + dawnDuskTerm + northSouthTerm;

  return THREE.MathUtils.clamp(radius, 1, 80);
}

function buildDeformedShell(
  radiusRe: number,
  color: THREE.Color,
  opacity: number,
  deformation?: MagnetopausePayload['deformation'] | BowShockPayload['deformation']
): THREE.Mesh {
  if (!deformation) {
    return buildShell(radiusRe, color, opacity);
  }

  const widthSegments = DEFORMED_SHELL_WIDTH_SEGMENTS;
  const heightSegments = DEFORMED_SHELL_HEIGHT_SEGMENTS;
  const vertices: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const theta = v * Math.PI;

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const phi = u * Math.PI * 2;
      const shellRadiusRe = computeDeformedShellRadiusRe(radiusRe, theta, phi, deformation);
      const shellRadiusUnits = shellRadiusRe * GLOBE_RADIUS_UNITS;

      const sinTheta = Math.sin(theta);
      const posX = shellRadiusUnits * Math.cos(theta);
      const posY = shellRadiusUnits * sinTheta * Math.cos(phi);
      const posZ = shellRadiusUnits * sinTheta * Math.sin(phi);

      vertices.push(posX, posY, posZ);
      uvs.push(u, v);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      const c = b + 1;
      const d = a + 1;

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshPhongMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.rotation.y = THREE.MathUtils.degToRad(-(deformation.aberrationDeg || 0));

  if (mesh.geometry.getAttribute('position').count > SHELL_VERTEX_CAP) {
    console.warn('[SpaceWeather] deformed shell exceeded vertex cap', {
      vertices: mesh.geometry.getAttribute('position').count,
      cap: SHELL_VERTEX_CAP
    });
  }

  return mesh;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  return latLngToGlobeVector3(lat, lng, radius);
}

function downsamplePolyline(points: LatLng[], cap: number, label: string): LatLng[] {
  if (points.length <= cap) return points;

  const result: LatLng[] = [];
  const step = (points.length - 1) / (cap - 1);
  for (let i = 0; i < cap - 1; i++) {
    const idx = Math.floor(i * step);
    result.push(points[idx]);
  }
  result.push(points[points.length - 1]);

  console.warn(`[SpaceWeather] downsampling ${label} polyline`, {
    original: points.length,
    cap,
    used: result.length
  });
  return result;
}

function buildAuroraLine(points: LatLng[], color: THREE.Color, opacity: number, altitudeRe = DEFAULT_AURORA_ALTITUDE_RE): THREE.Line {
  const usable = downsamplePolyline(points, AURORA_POINT_CAP, 'aurora-line');
  const altitudeUnits = altitudeRe * GLOBE_RADIUS_UNITS;
  const positions: number[] = [];
  usable.forEach((p) => {
    const v = latLngToVector3(p.lat, p.lng, altitudeUnits);
    positions.push(v.x, v.y, v.z);
  });
  const geometry = new THREE.BufferGeometry();
  const positionAttr = new Float32Array(positions);
  geometry.setAttribute('position', new THREE.BufferAttribute(positionAttr, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    linewidth: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true
  });
  const line = new THREE.LineLoop(geometry, material);
  line.renderOrder = 1;
  return line;
}

function buildBlackoutBand(points: LatLng[], gradient: { inner: number; outer: number }): THREE.Mesh {
  // Build a triangle strip band between inner/outer altitude offsets using provided polyline.
  const usable = downsamplePolyline(points, AURORA_POINT_CAP, 'aurora-blackout');
  const innerAlt = (BLACKOUT_ALTITUDE_RE + gradient.inner * 0.02) * GLOBE_RADIUS_UNITS;
  const outerAlt = (BLACKOUT_ALTITUDE_RE + gradient.outer * 0.04) * GLOBE_RADIUS_UNITS;
  const vertices: number[] = [];
  const indices: number[] = [];

  usable.forEach((p) => {
    const inner = latLngToVector3(p.lat, p.lng, innerAlt);
    const outer = latLngToVector3(p.lat, p.lng, outerAlt);
    vertices.push(inner.x, inner.y, inner.z);
    vertices.push(outer.x, outer.y, outer.z);
  });

  // Close loop by repeating first segment
  const inner0 = latLngToVector3(usable[0].lat, usable[0].lng, innerAlt);
  const outer0 = latLngToVector3(usable[0].lat, usable[0].lng, outerAlt);
  vertices.push(inner0.x, inner0.y, inner0.z);
  vertices.push(outer0.x, outer0.y, outer0.z);

  // Build triangle indices for strip (two vertices per segment)
  const pairs = vertices.length / 3 / 2; // number of point pairs
  for (let i = 0; i < pairs - 1; i++) {
    const iInner = i * 2;
    const iOuter = i * 2 + 1;
    const nextInner = (i + 1) * 2;
    const nextOuter = (i + 1) * 2 + 1;
    indices.push(iInner, iOuter, nextOuter);
    indices.push(iInner, nextOuter, nextInner);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshBasicMaterial({
    color: COLORS.blackout,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 0.5;
  return mesh;
}

export function countVertices(object: THREE.Object3D): number {
  let total = 0;
  object.traverse((child) => {
    const geometry = (child as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    const position = geometry?.getAttribute('position');
    if (position) total += position.count;
  });
  return total;
}

const defaultVertexLogger = (label: string, total: number) => {
  console.info(`[SpaceWeather] ${label} vertices=${total}`);
};

export function logVertexCount(
  label: string,
  object: THREE.Object3D,
  logger: (label: string, total: number) => void = defaultVertexLogger
): number {
  const total = countVertices(object);
  logger(label, total);
  return total;
}

export function createMagnetopauseMesh(payload: MagnetopausePayload): THREE.Mesh {
  const opacity = payload.quality === 'live' ? 0.4 : 0.3;
  return buildDeformedShell(payload.standoffRe, COLORS.magnetopause, opacity, payload.deformation);
}

export function createBowShockMesh(payload: BowShockPayload): THREE.Mesh {
  const opacity = payload.quality === 'live' ? 0.35 : 0.28;
  return buildDeformedShell(payload.radiusRe, COLORS.bowShock, opacity, payload.deformation);
}

export function createAuroraLines(payload: AuroraPayload): { north: THREE.Line; south: THREE.Line } {
  const baseOpacity = payload.quality === 'live' ? 0.55 : 0.4;
  const pulseEnabled = Boolean((payload.meta as Record<string, unknown> | undefined)?.pulse);
  const applyPulse = (line: THREE.Line) => {
    if (!pulseEnabled) return;
    line.onBeforeRender = (_renderer, _scene, _camera, _geometry, material) => {
      const m = material as THREE.LineBasicMaterial;
      const t = performance.now() * 0.002;
      const amp = 0.12;
      const osc = Math.sin(t) * amp;
      m.opacity = THREE.MathUtils.clamp(baseOpacity + osc, 0.15, 0.85);
    };
  };

  const north = buildAuroraLine(payload.oval.north, COLORS.aurora, baseOpacity);
  const south = buildAuroraLine(payload.oval.south, COLORS.aurora, baseOpacity);
  applyPulse(north);
  applyPulse(south);
  return { north, south };
}

export function createAuroraBlackoutMesh(payload: AuroraPayload): THREE.Mesh {
  // Use north oval path for blackout band approximation; share gradient from payload
  return buildBlackoutBand(payload.oval.north, payload.blackout.gradient);
}

export function disposeObject(obj: THREE.Object3D | null | undefined) {
  if (!obj) return;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}
