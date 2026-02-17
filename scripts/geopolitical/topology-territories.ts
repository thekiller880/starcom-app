import path from 'node:path';
import crypto from 'node:crypto';
import { parseArgs, ensureDir, readJson, writeJson, type LOD } from './shared';

interface GeoJsonFeature {
  geometry?: { type?: string; coordinates?: unknown };
}

interface GeoJsonCollection {
  features?: GeoJsonFeature[];
}

type Point = [number, number];

interface LodTopologySummary {
  lod: LOD;
  sourceFile: string;
  featureCount: number;
  polygonCount: number;
  ringCount: number;
  uniqueVertexCount: number;
  uniqueEdgeCount: number;
  sharedEdgeCount: number;
  topologyHash: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function quantizePoint(point: Point, scale: number): [number, number] {
  return [Math.round(point[0] * scale), Math.round(point[1] * scale)];
}

function pointKey(point: [number, number]): string {
  return `${point[0]},${point[1]}`;
}

function edgeKey(a: [number, number], b: [number, number]): string {
  const aKey = pointKey(a);
  const bKey = pointKey(b);
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

function toPolygons(feature: GeoJsonFeature): number[][][][] {
  const geometry = feature.geometry;
  if (!geometry?.type || !geometry.coordinates) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates as number[][][]];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as number[][][][];
  return [];
}

function normalizeRing(ring: number[][]): Point[] {
  const points = ring
    .filter((p) => Array.isArray(p) && p.length >= 2)
    .map((p) => [Number(p[0]), Number(p[1])] as Point)
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));

  if (points.length > 1) {
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
      points.pop();
    }
  }

  return points.length >= 3 ? points : [];
}

function buildLodTopology(lod: LOD, sourceDir: string, quantizationScale: number): LodTopologySummary {
  const sourceFile = path.join(sourceDir, `world-territories-lod${lod}.geojson`);
  const collection = readJson<GeoJsonCollection>(sourceFile);
  const features = Array.isArray(collection.features) ? collection.features : [];

  let polygonCount = 0;
  let ringCount = 0;

  const vertexSet = new Set<string>();
  const edgeCounts = new Map<string, number>();

  for (let f = 0; f < features.length; f++) {
    const polygons = toPolygons(features[f]);
    polygonCount += polygons.length;

    for (let p = 0; p < polygons.length; p++) {
      const polygon = polygons[p];
      for (let r = 0; r < polygon.length; r++) {
        const normalized = normalizeRing(polygon[r]);
        if (normalized.length < 3) continue;
        ringCount += 1;

        const qRing = normalized.map((pt) => quantizePoint(pt, quantizationScale));
        for (let i = 0; i < qRing.length; i++) {
          const a = qRing[i];
          const b = qRing[(i + 1) % qRing.length];
          vertexSet.add(pointKey(a));
          vertexSet.add(pointKey(b));
          const key = edgeKey(a, b);
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const sortedEdges = Array.from(edgeCounts.keys()).sort();
  const topologyHash = sha256(sortedEdges.join('\n'));
  const sharedEdgeCount = Array.from(edgeCounts.values()).filter((count) => count > 1).length;

  return {
    lod,
    sourceFile,
    featureCount: features.length,
    polygonCount,
    ringCount,
    uniqueVertexCount: vertexSet.size,
    uniqueEdgeCount: edgeCounts.size,
    sharedEdgeCount,
    topologyHash
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const quantizationScale = Number(process.env.GEO_TOPOLOGY_QUANT ?? '1000000');
  const outputFile = path.join(args.generatedDir, 'topology', 'territories-topology-report.json');

  const summaries = args.lods.map((lod) => buildLodTopology(lod, args.sourceDir, quantizationScale));
  const lodHashConcat = summaries
    .sort((a, b) => a.lod - b.lod)
    .map((s) => `${s.lod}:${s.topologyHash}`)
    .join('|');

  const topologyGraphHash = sha256(`quant:${quantizationScale}|${lodHashConcat}`);

  ensureDir(path.dirname(outputFile));
  writeJson(outputFile, {
    generatedAt: new Date().toISOString(),
    sourceDir: args.sourceDir,
    quantizationScale,
    topologyGraphHash,
    lods: summaries,
    summary: {
      lodCount: summaries.length,
      totalFeatures: summaries.reduce((sum, s) => sum + s.featureCount, 0),
      totalPolygons: summaries.reduce((sum, s) => sum + s.polygonCount, 0),
      totalRings: summaries.reduce((sum, s) => sum + s.ringCount, 0)
    }
  });

  console.log(`[geo:topology:territories] topologyGraphHash=${topologyGraphHash}`);
  console.log(`[geo:topology:territories] report: ${outputFile}`);
}

main();
