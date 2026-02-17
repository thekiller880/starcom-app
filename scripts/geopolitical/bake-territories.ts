import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  ensureDir,
  parseArgs,
  readJson,
  writeJson,
  type LOD
} from './shared';
import { normalizeOuterRingDetailed, validateRing } from '../../src/geopolitical/geometry/polygonNormalize';
import { latLonToVector3 } from '../../src/geopolitical/utils/latLonToVector3';
import { projectToTangentPlane } from '../../src/geopolitical/geometry/projections/tangentPlane';
import { projectPolarLambert } from '../../src/geopolitical/geometry/projections/polarLambert';

interface GeoJsonFeature {
  id?: string;
  properties?: Record<string, unknown>;
  geometry?: { type?: string; coordinates?: unknown };
}

interface GeoJsonCollection {
  type: string;
  features: GeoJsonFeature[];
}

interface LODSummary {
  parts: number;
  vertices: number;
  triangles: number;
  chunkCount: number;
  failedParts: number;
  warnParts: number;
  bytes: {
    index: number;
    mesh: number;
    chunks: number;
  };
  sourceFeatures: number;
  sourceFile: string;
  outputFile: string;
  meshFile: string;
  chunksIndexFile: string;
}

type LngLat = [number, number];

interface BakedPart {
  id: string;
  countryCode: string;
  name: string;
  lod: LOD;
  ringCount: number;
  pointCount: number;
  vertexCount: number;
  triangleCount: number;
  indexFormat: 'uint16' | 'uint32';
  quantizationScale: number;
  positions: number[];
  positionsQuantized: number[];
  indices: number[];
  estimatedBytes: {
    positionsFloat32: number;
    positionsQuantizedInt16: number;
    indices: number;
  };
  qa: {
    maxEdgeToMedianEdgeRatio: number;
    minTriangleArea: number;
    droppedDegenerateFaces: number;
    droppedPathologicalFaces: number;
    status: 'pass' | 'warn' | 'fail';
  };
}

interface LODChunk {
  id: string;
  partIds: string[];
  partCount: number;
  vertexCount: number;
  triangleCount: number;
}

interface BakeContract {
  manifestVersion: string;
  packageId: string;
  topologyGraphHash: string | null;
}

const POSITION_QUANTIZATION_SCALE = 256;
const CHUNK_TRIANGLE_BUDGET = 1800;

function quantizePosition(value: number, scale: number): number {
  const quantized = Math.round(value * scale);
  if (quantized > 32767) return 32767;
  if (quantized < -32768) return -32768;
  return quantized;
}

function isClosedRing(ring: LngLat[]): boolean {
  if (ring.length < 2) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function openRing(ring: LngLat[]): LngLat[] {
  if (!isClosedRing(ring)) return ring.slice();
  return ring.slice(0, ring.length - 1);
}

function unwrapRing(ring: LngLat[]): LngLat[] {
  if (!ring.length) return [];
  const result: LngLat[] = [];
  let prevLng = ring[0][0];
  let offset = 0;
  result.push([prevLng, ring[0][1]]);
  for (let i = 1; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    const delta = lng - prevLng;
    if (delta > 180) offset -= 360;
    else if (delta < -180) offset += 360;
    result.push([lng + offset, lat]);
    prevLng = lng;
  }
  return result;
}

function sanitizeRing(ring: LngLat[]): LngLat[] {
  if (ring.length < 3) return [];
  const validated = validateRing(ring).ring;
  const open = openRing(validated);
  if (open.length < 3) return [];
  return unwrapRing(open);
}

function ringCentroid(ring: LngLat[]): LngLat {
  let lng = 0;
  let lat = 0;
  for (let i = 0; i < ring.length; i++) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / ring.length, lat / ring.length];
}

function ringBounds(ring: LngLat[]): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, maxLng, minLat, maxLat };
}

function pointInRing(x: number, y: number, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function alignRingDomainToCenter(ring: LngLat[], centerLng: number): LngLat[] {
  return ring.map(([lng, lat]) => {
    const candidates = [lng - 360, lng, lng + 360];
    let best = candidates[0];
    let bestDist = Math.abs(candidates[0] - centerLng);
    for (let i = 1; i < candidates.length; i++) {
      const dist = Math.abs(candidates[i] - centerLng);
      if (dist < bestDist) {
        best = candidates[i];
        bestDist = dist;
      }
    }
    return [best, lat];
  });
}

function assignHolesToParts(outerParts: LngLat[][], holes: LngLat[][]): LngLat[][][] {
  const perPart: LngLat[][][] = outerParts.map(() => []);
  if (!holes.length || outerParts.length === 1) {
    if (outerParts.length === 1) perPart[0] = holes;
    return perPart;
  }

  const partData = outerParts.map((part) => {
    const bounds = ringBounds(part);
    const center = (bounds.minLng + bounds.maxLng) / 2;
    return { part, bounds, center };
  });

  for (let h = 0; h < holes.length; h++) {
    const hole = holes[h];
    if (hole.length < 3) continue;
    const [holeLng, holeLat] = ringCentroid(hole);

    let bestPart = -1;
    let bestScore = -Infinity;

    for (let p = 0; p < partData.length; p++) {
      const part = partData[p];
      const alignedLng = alignRingDomainToCenter([[holeLng, holeLat]], part.center)[0][0];
      const inBounds = alignedLng >= part.bounds.minLng - 1
        && alignedLng <= part.bounds.maxLng + 1
        && holeLat >= part.bounds.minLat - 1
        && holeLat <= part.bounds.maxLat + 1;
      if (!inBounds) continue;

      const contains = pointInRing(alignedLng, holeLat, part.part);
      const centerDelta = Math.abs(alignedLng - part.center);
      const score = (contains ? 1000 : 0) - centerDelta;
      if (score > bestScore) {
        bestScore = score;
        bestPart = p;
      }
    }

    if (bestPart >= 0) {
      const alignedHole = alignRingDomainToCenter(hole, partData[bestPart].center);
      perPart[bestPart].push(alignedHole);
    }
  }

  return perPart;
}

function isDegenerateFace(tri: number[], vertices: THREE.Vector2[], epsilon = 1e-12): boolean {
  const a = vertices[tri[0]];
  const b = vertices[tri[1]];
  const c = vertices[tri[2]];
  if (!a || !b || !c) return true;
  const area2 = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
  return area2 < epsilon;
}

function computeEdgeStats(faces: number[][], vertices: THREE.Vector2[]): { median: number; max: number } {
  const lengths: number[] = [];
  for (let i = 0; i < faces.length; i++) {
    const tri = faces[i];
    const a = vertices[tri[0]];
    const b = vertices[tri[1]];
    const c = vertices[tri[2]];
    if (!a || !b || !c) continue;
    lengths.push(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
  }
  if (!lengths.length) return { median: 1, max: 1 };
  lengths.sort((x, y) => x - y);
  const median = lengths[Math.floor(lengths.length / 2)] || 1;
  const max = lengths[lengths.length - 1] || median;
  return { median, max };
}

function triangleArea3D(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  return ab.cross(ac).length() * 0.5;
}

function bakePolygonPart(
  id: string,
  countryCode: string,
  name: string,
  lod: LOD,
  outer: LngLat[],
  holes: LngLat[][],
  ringCount: number,
  pointCount: number
): BakedPart {
  const allPoints: Array<{ lon: number; lat: number }> = [];
  outer.forEach(([lng, lat]) => allPoints.push({ lon: lng, lat }));
  const holeStarts: number[] = [];
  holes.forEach((ring) => {
    holeStarts.push(allPoints.length);
    ring.forEach(([lng, lat]) => allPoints.push({ lon: lng, lat }));
  });

  const avgLat = outer.reduce((sum, p) => sum + p[1], 0) / outer.length;
  const projection = Math.abs(avgLat) > 60
    ? projectPolarLambert(allPoints)
    : projectToTangentPlane(allPoints);

  const outer2D = outer.map((_, index) => {
    const p = projection.points2D[index];
    return new THREE.Vector2(p.x, p.y);
  });
  const hole2D = holes.map((ring, holeIndex) => {
    const start = holeStarts[holeIndex];
    return ring.map((_, ringIndex) => {
      const p = projection.points2D[start + ringIndex];
      return new THREE.Vector2(p.x, p.y);
    });
  });
  const all2DVertices: THREE.Vector2[] = [...outer2D, ...hole2D.flat()];

  const faces = THREE.ShapeUtils.triangulateShape(outer2D, hole2D);
  const nonDegenerate = faces.filter((tri) => !isDegenerateFace(tri, all2DVertices));
  const droppedDegenerateFaces = faces.length - nonDegenerate.length;

  const preFilterEdgeStats = computeEdgeStats(nonDegenerate, all2DVertices);
  const maxAllowedEdge = preFilterEdgeStats.median * 16;
  const isLargeComplexPart = pointCount >= 800;
  const pathologicalCandidates = nonDegenerate.filter((tri) => {
    const a = all2DVertices[tri[0]];
    const b = all2DVertices[tri[1]];
    const c = all2DVertices[tri[2]];
    const maxEdge = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    return maxEdge > maxAllowedEdge;
  });
  // For very large contiguous parts, dropping long-edge triangles can carve visible interior voids.
  // Keep those triangles for visual continuity and rely on QA ratio thresholds tuned for large parts.
  const shouldDropPathologicalFaces = !isLargeComplexPart;
  const filteredFaces = shouldDropPathologicalFaces
    ? nonDegenerate.filter((tri) => {
        const a = all2DVertices[tri[0]];
        const b = all2DVertices[tri[1]];
        const c = all2DVertices[tri[2]];
        const maxEdge = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
        return maxEdge <= maxAllowedEdge;
      })
    : nonDegenerate;
  const droppedPathologicalFaces = shouldDropPathologicalFaces
    ? pathologicalCandidates.length
    : 0;
  const finalEdgeStats = computeEdgeStats(filteredFaces, all2DVertices);

  const ringVertices: LngLat[] = [...outer, ...holes.flat()];
  const positions: number[] = [];
  const positionsQuantized: number[] = [];
  for (let i = 0; i < ringVertices.length; i++) {
    const [lng, lat] = ringVertices[i];
    const vec = latLonToVector3(lat, lng, { radius: 100, elevation: 0.5, invertX: false });
    const x = Number(vec.x.toFixed(6));
    const y = Number(vec.y.toFixed(6));
    const z = Number((-vec.z).toFixed(6));
    positions.push(x, y, z);
    positionsQuantized.push(
      quantizePosition(x, POSITION_QUANTIZATION_SCALE),
      quantizePosition(y, POSITION_QUANTIZATION_SCALE),
      quantizePosition(z, POSITION_QUANTIZATION_SCALE)
    );
  }

  const indices: number[] = [];
  for (let i = 0; i < filteredFaces.length; i++) {
    indices.push(filteredFaces[i][0], filteredFaces[i][1], filteredFaces[i][2]);
  }

  let minTriangleArea = Number.POSITIVE_INFINITY;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i] * 3;
    const i1 = indices[i + 1] * 3;
    const i2 = indices[i + 2] * 3;
    a.set(positions[i0], positions[i0 + 1], positions[i0 + 2]);
    b.set(positions[i1], positions[i1 + 1], positions[i1 + 2]);
    c.set(positions[i2], positions[i2 + 1], positions[i2 + 2]);
    minTriangleArea = Math.min(minTriangleArea, triangleArea3D(a, b, c));
  }
  if (!Number.isFinite(minTriangleArea)) minTriangleArea = 0;

  const ratio = finalEdgeStats.max / (finalEdgeStats.median || 1);
  const failRatioThreshold = isLargeComplexPart ? 80 : 20;
  const warnRatioThreshold = isLargeComplexPart ? 20 : 12;
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (indices.length === 0 || ratio > failRatioThreshold || minTriangleArea < 1e-7) status = 'fail';
  else if (ratio > warnRatioThreshold || minTriangleArea < 1e-6 || droppedPathologicalFaces > 0) status = 'warn';

  return {
    id,
    countryCode,
    name,
    lod,
    ringCount,
    pointCount,
    vertexCount: ringVertices.length,
    triangleCount: indices.length / 3,
    indexFormat: ringVertices.length <= 65535 ? 'uint16' : 'uint32',
    quantizationScale: POSITION_QUANTIZATION_SCALE,
    positions,
    positionsQuantized,
    indices,
    estimatedBytes: {
      positionsFloat32: positions.length * 4,
      positionsQuantizedInt16: positionsQuantized.length * 2,
      indices: indices.length * (ringVertices.length <= 65535 ? 2 : 4)
    },
    qa: {
      maxEdgeToMedianEdgeRatio: Number(ratio.toFixed(4)),
      minTriangleArea: Number(minTriangleArea.toFixed(8)),
      droppedDegenerateFaces,
      droppedPathologicalFaces,
      status
    }
  };
}

function buildChunks(parts: BakedPart[]): LODChunk[] {
  const chunks: LODChunk[] = [];
  let currentParts: BakedPart[] = [];
  let currentTriangles = 0;
  let currentVertices = 0;

  const flush = () => {
    if (!currentParts.length) return;
    chunks.push({
      id: `chunk-${String(chunks.length).padStart(3, '0')}`,
      partIds: currentParts.map((part) => part.id),
      partCount: currentParts.length,
      vertexCount: currentVertices,
      triangleCount: currentTriangles
    });
    currentParts = [];
    currentTriangles = 0;
    currentVertices = 0;
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const exceedsBudget = currentTriangles > 0 && (currentTriangles + part.triangleCount > CHUNK_TRIANGLE_BUDGET);
    if (exceedsBudget) flush();
    currentParts.push(part);
    currentTriangles += part.triangleCount;
    currentVertices += part.vertexCount;
  }
  flush();

  return chunks;
}

function bakeFeatureParts(feature: GeoJsonFeature, lod: LOD): BakedPart[] {
  const geometry = feature.geometry;
  const baseId = String(feature.id ?? feature.properties?.ADM0_A3 ?? 'UNKNOWN');
  const countryCode = String(feature.properties?.ADM0_A3 ?? baseId.split(':')[0]);
  const name = String(feature.properties?.NAME ?? feature.properties?.ADMIN ?? baseId);
  if (!geometry || !geometry.type || !geometry.coordinates) return [];

  const polygons: number[][][][] = geometry.type === 'Polygon'
    ? [geometry.coordinates as number[][][]]
    : geometry.type === 'MultiPolygon'
      ? (geometry.coordinates as number[][][][])
      : [];

  const baked: BakedPart[] = [];

  for (let polyIndex = 0; polyIndex < polygons.length; polyIndex++) {
    const polygon = polygons[polyIndex];
    const outerRaw = (polygon[0] || []).map(([lng, lat]) => [lng, lat] as LngLat);
    const holesRaw = polygon.slice(1).map((ring) => ring.map(([lng, lat]) => [lng, lat] as LngLat));
    if (outerRaw.length < 3) continue;

    const normalized = normalizeOuterRingDetailed(outerRaw);
    const outerParts = normalized.parts
      .map((ring) => sanitizeRing(ring as LngLat[]))
      .filter((ring) => ring.length >= 3);

    const holesSanitized = holesRaw
      .map((ring) => sanitizeRing(ring))
      .filter((ring) => ring.length >= 3);

    if (!outerParts.length) continue;
    const holesPerPart = assignHolesToParts(outerParts, holesSanitized);

    for (let partIndex = 0; partIndex < outerParts.length; partIndex++) {
      const outer = outerParts[partIndex];
      const holes = holesPerPart[partIndex] || [];
      const id = geometry.type === 'Polygon' && outerParts.length === 1
        ? baseId
        : `${baseId}:${polyIndex}-${partIndex}`;
      const ringCount = 1 + holes.length;
      const pointCount = outer.length + holes.reduce((sum, ring) => sum + ring.length, 0);
      baked.push(bakePolygonPart(id, countryCode, name, lod, outer, holes, ringCount, pointCount));
    }
  }

  return baked;
}

function flattenFeatureParts(feature: GeoJsonFeature): Array<{ id: string; name: string; ringCount: number; pointCount: number }> {
  const geometry = feature.geometry;
  const baseId = String(feature.id ?? feature.properties?.ADM0_A3 ?? 'UNKNOWN');
  const name = String(feature.properties?.NAME ?? feature.properties?.ADMIN ?? baseId);

  if (!geometry || !geometry.type || !geometry.coordinates) return [];

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as number[][][];
    return [{
      id: baseId,
      name,
      ringCount: rings.length,
      pointCount: rings.reduce((sum, ring) => sum + ring.length, 0)
    }];
  }

  if (geometry.type === 'MultiPolygon') {
    const polys = geometry.coordinates as number[][][][];
    return polys.map((poly, index) => ({
      id: `${baseId}:${index}`,
      name,
      ringCount: poly.length,
      pointCount: poly.reduce((sum, ring) => sum + ring.length, 0)
    }));
  }

  return [];
}

function bakeLod(lod: LOD, sourceDir: string, generatedDir: string, contract: BakeContract): LODSummary {
  const sourceFile = path.join(sourceDir, `world-territories-lod${lod}.geojson`);
  const outputDir = path.join(generatedDir, `lod${lod}`);
  const outputFile = path.join(outputDir, 'parts-index.json');
  const meshFile = path.join(outputDir, 'parts-mesh.json');
  const chunksIndexFile = path.join(outputDir, 'chunks-index.json');
  const chunksDir = path.join(outputDir, 'chunks');

  const geo = readJson<GeoJsonCollection>(sourceFile);
  const parts = geo.features.flatMap((feature) => bakeFeatureParts(feature, lod));
  const chunks = buildChunks(parts);

  ensureDir(outputDir);
  ensureDir(chunksDir);
  writeJson(meshFile, {
    lod,
    generatedAt: new Date().toISOString(),
    contract,
    sourceFile,
    projectionDomain: 'lonlat-unwrapped-per-part',
    triangulation: 'three-shapeutils-with-pathological-filter',
    radius: 100,
    elevation: 0.5,
    parts
  });

  writeJson(outputFile, {
    lod,
    generatedAt: new Date().toISOString(),
    contract,
    sourceFile,
    projectionDomain: 'lonlat-unwrapped-per-part',
    triangulation: 'three-shapeutils-with-pathological-filter',
    parts: parts.map((part) => ({
      id: part.id,
      countryCode: part.countryCode,
      name: part.name,
      ringCount: part.ringCount,
      pointCount: part.pointCount,
      vertexCount: part.vertexCount,
      triangleCount: part.triangleCount,
      indexFormat: part.indexFormat,
      quantizationScale: part.quantizationScale,
      estimatedBytes: part.estimatedBytes,
      qa: part.qa
    }))
  });

  let chunkBytes = 0;
  writeJson(chunksIndexFile, {
    lod,
    generatedAt: new Date().toISOString(),
    contract,
    chunkTriangleBudget: CHUNK_TRIANGLE_BUDGET,
    chunks
  });
  chunkBytes += fs.statSync(chunksIndexFile).size;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkParts = parts.filter((part) => chunk.partIds.includes(part.id));
    const chunkFile = path.join(chunksDir, `${chunk.id}.json`);
    writeJson(chunkFile, {
      lod,
      contract,
      chunk,
      parts: chunkParts
    });
    chunkBytes += fs.statSync(chunkFile).size;
  }

  const vertices = parts.reduce((sum, part) => sum + part.vertexCount, 0);
  const triangles = parts.reduce((sum, part) => sum + part.triangleCount, 0);
  const failedParts = parts.filter((part) => part.qa.status === 'fail').length;
  const warnParts = parts.filter((part) => part.qa.status === 'warn').length;
  const indexBytes = fs.statSync(outputFile).size;
  const meshBytes = fs.statSync(meshFile).size;

  return {
    parts: parts.length,
    vertices,
    triangles,
    chunkCount: chunks.length,
    failedParts,
    warnParts,
    bytes: {
      index: indexBytes,
      mesh: meshBytes,
      chunks: chunkBytes
    },
    sourceFeatures: geo.features.length,
    sourceFile,
    outputFile,
    meshFile,
    chunksIndexFile
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const summaries: Record<string, LODSummary> = {};
  const generatedAt = new Date().toISOString();
  const packageId = `territories-bake-${generatedAt}`;
  const sourceValidationPath = path.join(args.generatedDir, 'source-validation.json');
  const topologyReportPath = path.join(args.generatedDir, 'topology', 'territories-topology-report.json');

  const sourceValidation = (() => {
    try {
      return readJson<Record<string, unknown>>(sourceValidationPath);
    } catch {
      return null;
    }
  })();

  const topologyReport = (() => {
    try {
      return readJson<Record<string, unknown>>(topologyReportPath);
    } catch {
      return null;
    }
  })();

  const contract: BakeContract = {
    manifestVersion: 'territories-bake-v1',
    packageId,
    topologyGraphHash: (topologyReport?.topologyGraphHash as string | undefined) ?? null
  };

  for (const lod of args.lods) {
    summaries[String(lod)] = bakeLod(lod, args.sourceDir, args.generatedDir, contract);
  }

  const failedParts = Object.values(summaries).reduce((sum, lod) => sum + lod.failedParts, 0);
  const warnParts = Object.values(summaries).reduce((sum, lod) => sum + lod.warnParts, 0);

  writeJson(path.join(args.generatedDir, 'manifest.json'), {
    version: 'territories-bake-v1',
    generatedAt,
    packageId,
    source: {
      dataset: 'world-territories-lod*.geojson',
      sourceDir: args.sourceDir,
      validationReport: sourceValidationPath,
      provider: sourceValidation?.provider ?? 'unknown',
      status: sourceValidation?.status ?? 'unknown'
    },
    topology: topologyReport
      ? {
          report: topologyReportPath,
          topologyGraphHash: topologyReport.topologyGraphHash ?? null,
          quantizationScale: topologyReport.quantizationScale ?? null
        }
      : null,
    lods: summaries,
    qaSummary: {
      status: failedParts > 0 ? 'fail' : warnParts > 0 ? 'warn' : 'pass',
      failedParts,
      warnParts
    }
  });

  console.log(`[geo:bake] Generated baked geometry artifacts in ${args.generatedDir}`);
}

main();
