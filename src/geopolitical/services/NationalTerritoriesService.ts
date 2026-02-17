// NationalTerritoriesService: loads and builds border / territory geometry
import * as THREE from 'three';
import { GeometryFactory, LineFeature, PolygonFeature } from '../geometry/geometryFactory';
// Corrected path to GeoPoliticalConfig
import { GeoPoliticalConfig } from '../../hooks/useGeoPoliticalSettings';
import { resolveBorderMaterialConfig, createLineMaterial, BorderClassification } from '../theme/materialTheme';

export interface WorldBordersData { features: Array<{ id: string; coordinates: [number, number][] }> }
export interface WorldTerritoriesData { features: Array<{ id: string; rings: [number, number][][] }> }

export interface BakedTerritoryPart {
  id: string;
  countryCode?: string;
  name?: string;
  lod?: number;
  positions: number[];
  indices: number[];
  qa?: {
    maxEdgeToMedianEdgeRatio?: number;
    minTriangleArea?: number;
    status?: 'pass' | 'warn' | 'fail';
  };
}

interface BakedManifestLODEntry {
  parts?: number;
  triangles?: number;
  meshFile?: string;
}

interface BakedManifest {
  version?: string;
  packageId?: string;
  topology?: {
    topologyGraphHash?: string | null;
  } | null;
  lods?: Record<string, BakedManifestLODEntry>;
}

interface BakedMeshPayload {
  lod?: number;
  contract?: {
    manifestVersion?: string;
    packageId?: string;
    topologyGraphHash?: string | null;
  };
  parts?: BakedTerritoryPart[];
}

export type TerritoriesLODLoadResult =
  | { kind: 'baked'; parts: BakedTerritoryPart[] }
  | { kind: 'legacy'; features: PolygonFeature[] };

interface ClassifiedLineFeature extends LineFeature { classification: BorderClassification }
interface MaritimeFeature extends LineFeature { classification: BorderClassification }

const GEOPOLITICAL_LONGITUDE_OFFSET_DEGREES = -90;

function normalizeLongitude(lon: number): number {
  return ((lon + 540) % 360) - 180;
}

function applyLongitudeOffset(lon: number): number {
  return normalizeLongitude(lon + GEOPOLITICAL_LONGITUDE_OFFSET_DEGREES);
}

function offsetLineCoordinates(coords: [number, number][]): [number, number][] {
  return coords.map(([lon, lat]) => [applyLongitudeOffset(lon), lat]);
}

function offsetPolygonRings(rings: [number, number][][]): [number, number][][] {
  return rings.map((ring) => ring.map(([lon, lat]) => [applyLongitudeOffset(lon), lat]));
}

// --- WS1 Normalization Scaffold ---
// Canonical normalization tokens mapped to classification categories
const FEATURE_CLA_MAP: { test: RegExp; value: BorderClassification }[] = [
  { test: /disputed/i, value: 'disputed' },
  { test: /line of control/i, value: 'line_of_control' },
  { test: /indefinite/i, value: 'indefinite' }
];

function normalizeFeatureCla(raw: string | undefined): BorderClassification {
  if (!raw) return 'international';
  for (const rule of FEATURE_CLA_MAP) {
    if (rule.test.test(raw)) return rule.value;
  }
  if (/verify/i.test(raw)) {
    // keep as international but may flag unknown later
    return 'international';
  }
  return 'international';
}

// Perspective recognition value normalization
export type PerspectiveRecognition = 'recognized' | 'unrecognized' | 'verify' | 'admin1' | 'blank';

function normalizePerspectiveValue(v: string | undefined): PerspectiveRecognition {
  if (!v) return 'blank';
  const lc = v.toLowerCase();
  if (lc.includes('international boundary')) return 'recognized';
  if (lc.includes('admin-1')) return 'admin1';
  if (lc.includes('unrecognized')) return 'unrecognized';
  if (lc.includes('verify')) return 'verify';
  return 'blank';
}

export interface RecognitionMatrixEntry {
  featureId: string;
  classification: BorderClassification;
  perspectives: Record<string, PerspectiveRecognition>;
}

type AnyGeoFeature = { id?: string; properties?: Record<string, unknown>; geometry?: { type: string; coordinates: unknown } };
type LineStringGeom = { type: 'LineString'; coordinates: [number, number][] };
type MultiLineStringGeom = { type: 'MultiLineString'; coordinates: [number, number][][] };
type PolygonGeom = { type: 'Polygon'; coordinates: [number, number][][] };
type MultiPolygonGeom = { type: 'MultiPolygon'; coordinates: [number, number][][][] };

function buildRecognitionMatrix(rawFeatures: AnyGeoFeature[]): RecognitionMatrixEntry[] {
  return rawFeatures.map(f => {
    const props = (f.properties || {}) as Record<string, unknown>;
    const classification = normalizeFeatureCla(typeof props.FEATURECLA === 'string' ? props.FEATURECLA : undefined);
    const perspectives: Record<string, PerspectiveRecognition> = {};
    Object.keys(props).forEach(k => {
      if (k.startsWith('FCLASS_')) {
        perspectives[k.substring('FCLASS_'.length)] = normalizePerspectiveValue(typeof props[k] === 'string' ? (props[k] as string) : undefined);
      }
    });
    const id = (typeof props.NE_ID === 'string' && props.NE_ID)
      || (typeof props.BRK_A3 === 'string' && props.BRK_A3)
      || f.id
      || 'border';
    return { featureId: String(id), classification, perspectives };
  });
}
// --- End WS1 Scaffold ---

function isDisputed(classification: BorderClassification) {
  return classification === 'disputed' || classification === 'line_of_control' || classification === 'indefinite';
}

const TERRITORY_RADIUS_SCALE = 1.03;
const BAKED_MANIFEST_CACHE_KEY = '__territories_baked_manifest__';
const RUSSIA_PATHOLOGICAL_PART_ID = 'RUS:1-0';
const RUSSIA_PATHOLOGICAL_RATIO_GUARD = 60;

function isProductionRuntime(): boolean {
  try {
    return Boolean(import.meta.env?.PROD);
  } catch {
    return false;
  }
}

function allowLegacyTerritoryFallback(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('geoAllowLegacyTerritories') === '1';
  } catch {
    return false;
  }
}

export class NationalTerritoriesService {
  private cache: Map<string, unknown> = new Map();

  private hasPathologicalRussiaBakedPart(parts: BakedTerritoryPart[]): boolean {
    return parts.some((part) => {
      if (part.id !== RUSSIA_PATHOLOGICAL_PART_ID) return false;
      const ratio = part.qa?.maxEdgeToMedianEdgeRatio ?? 0;
      return ratio >= RUSSIA_PATHOLOGICAL_RATIO_GUARD;
    });
  }

  private borderFileForLOD(lod: 0 | 1 | 2) { return `/geopolitical/world-borders-lod${lod}.geojson`; }
  private normalizedBorderFileForLOD(lod: 0 | 1 | 2) { return `/geopolitical/normalized/world-borders-lod${lod}.normalized.json`; }
  private territoryFileForLOD(lod: 0 | 1 | 2) { return `/geopolitical/world-territories-lod${lod}.geojson`; }
  private bakedManifestFile() { return '/geopolitical/territories-baked/manifest.json'; }
  private bakedTerritoryFileForLOD(lod: 0 | 1 | 2) { return `/geopolitical/territories-baked/lod${lod}/parts-mesh.json`; }
  private topologyFile() { return '/geopolitical/topology/world-borders.topology.json'; }
  private maritimeTopologyFile() { return '/geopolitical/maritime/topology/eez.topology.json'; }

  private async loadBakedManifest(): Promise<BakedManifest | null> {
    if (this.cache.has(BAKED_MANIFEST_CACHE_KEY)) {
      return this.cache.get(BAKED_MANIFEST_CACHE_KEY) as BakedManifest;
    }
    try {
      const res = await fetch(this.bakedManifestFile(), { cache: 'no-cache' });
      if (!res.ok) return null;
      const manifest = await res.json() as BakedManifest;
      if (!manifest || typeof manifest.version !== 'string' || !manifest.version.length) return null;
      if (!manifest.lods || typeof manifest.lods !== 'object') return null;
      this.cache.set(BAKED_MANIFEST_CACHE_KEY, manifest);
      return manifest;
    } catch {
      return null;
    }
  }

  private async tryLoadBakedTerritoriesLOD(lod: 0 | 1 | 2): Promise<BakedTerritoryPart[] | null> {
    const manifest = await this.loadBakedManifest();
    if (!manifest) return null;
    const topologyHash = typeof manifest.topology?.topologyGraphHash === 'string'
      ? manifest.topology.topologyGraphHash
      : null;
    const expectedVersion = typeof manifest.version === 'string' ? manifest.version : null;
    const expectedPackageId = typeof manifest.packageId === 'string' ? manifest.packageId : null;

    const url = this.bakedTerritoryFileForLOD(lod);
    if (this.cache.has(url)) return this.cache.get(url) as BakedTerritoryPart[];
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = await res.json() as BakedMeshPayload;
      if (!json || !Array.isArray(json.parts)) return null;
      // Backward-compatible contract validation:
      // - New format: validate strict contract fields when manifest declares them.
      // - Legacy format: no contract block present; allow as long as parts payload is valid.
      const contract = json.contract;
      if (expectedVersion && contract?.manifestVersion && contract.manifestVersion !== expectedVersion) return null;
      if (expectedPackageId && contract?.packageId && contract.packageId !== expectedPackageId) return null;
      if (topologyHash && contract?.topologyGraphHash && contract.topologyGraphHash !== topologyHash) return null;

      const parts = (json.parts as BakedTerritoryPart[])
        .filter((part) => Array.isArray(part.positions) && Array.isArray(part.indices))
        .filter((part) => part.positions.length >= 9 && part.indices.length >= 3)
        .filter((part) => part.positions.length % 3 === 0 && part.indices.length % 3 === 0);
      if (!parts.length) return null;
      this.cache.set(url, parts);
      return parts;
    } catch {
      return null;
    }
  }

  // Attempt to load pre-normalized artifact (WS1). Falls back silently if missing or malformed.
  private async tryLoadNormalizedBorders(lod: 0 | 1 | 2): Promise<ClassifiedLineFeature[] | null> {
    const url = this.normalizedBorderFileForLOD(lod);
    if (this.cache.has(url)) return this.cache.get(url) as ClassifiedLineFeature[];
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.features)) return null;
      const mapClass = (c: string | undefined): BorderClassification => {
        switch ((c || '').toLowerCase()) {
          case 'international': return 'international';
          case 'disputed': return 'disputed';
          case 'lineofcontrol':
          case 'line_of_control': return 'line_of_control';
          case 'indefinite': return 'indefinite';
          default: return 'unknown';
        }
      };
  const features: ClassifiedLineFeature[] = json.features.map((f: { id: string; coordinates: [number, number][]; classification?: string }) => ({
        id: f.id,
        coordinates: f.coordinates,
        classification: mapClass(f.classification)
      }));
      this.cache.set(url, features);
      return features;
    } catch {
      return null;
    }
  }

  private async tryLoadTopologyLOD(lod: 0|1|2): Promise<ClassifiedLineFeature[] | null> {
    const topoUrl = this.topologyFile();
    const cacheKey = `${topoUrl}::lod${lod}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as ClassifiedLineFeature[];
    try {
      const res = await fetch(topoUrl, { cache: 'no-cache' });
      if (!res.ok) return null;
      const topo = await res.json();
      if (!topo || !topo.lods || !topo.arcs) return null;
      const lodKey = `lod${lod}`;
      const lodData = topo.lods[lodKey];
      if (!lodData) return null;
      const arcs: number[][][] = topo.arcs;
  const features: ClassifiedLineFeature[] = lodData.features.map((f: { id: string | number; arcIndices: number[]; classification?: string }) => {
        const arcCoords = f.arcIndices.flatMap((ai: number) => arcs[ai]?.map((p: number[]) => {
          const lon = (p[0] / topo.quantization) * 360 - 180;
          const lat = (p[1] / topo.quantization) * 180 - 90;
          return [applyLongitudeOffset(lon), lat] as [number, number];
        }) || []);
        return {
          id: f.id.toString(),
          coordinates: arcCoords,
          classification: ((): BorderClassification => {
            const c = (f.classification || '').toLowerCase();
            if (c === 'disputed') return 'disputed';
            if (c === 'lineofcontrol' || c === 'line_of_control') return 'line_of_control';
            if (c === 'indefinite') return 'indefinite';
            return 'international';
          })()
        };
      });
      this.cache.set(cacheKey, features);
      return features;
    } catch {
      return null;
    }
  }

  private async tryLoadMaritimeTopologyLOD(lod:0|1|2): Promise<MaritimeFeature[] | null> {
    const topoUrl = this.maritimeTopologyFile();
    const cacheKey = `${topoUrl}::lod${lod}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as MaritimeFeature[];
    try {
      const res = await fetch(topoUrl, { cache: 'no-cache' });
      if (!res.ok) return null;
      const topo = await res.json();
      if (!topo || !topo.lods || !topo.arcs) return null;
      const lodKey = `lod${lod}`;
      const lodData = topo.lods[lodKey];
      if (!lodData) return null;
      const arcs: number[][][] = topo.arcs;
  const features: MaritimeFeature[] = lodData.features.map((f: { id: string | number; arcIndices: number[]; classification?: string }) => {
        const arcCoords = f.arcIndices.flatMap((ai: number) => arcs[ai]?.map((p: number[]) => {
          const lon = (p[0] / topo.quantization) * 360 - 180;
          const lat = (p[1] / topo.quantization) * 180 - 90;
          return [applyLongitudeOffset(lon), lat] as [number, number];
        }) || []);
        const clsRaw = (f.classification || '').toLowerCase();
        const classification: BorderClassification = clsRaw === 'maritimeoverlap' || clsRaw === 'maritime_overlap' ? 'maritime_overlap' : 'maritime_eez';
        return { id: f.id.toString(), coordinates: arcCoords, classification };
      });
      this.cache.set(cacheKey, features);
      return features;
    } catch { return null; }
  }

  async loadBorders(url = '/geopolitical/world-borders.geojson'): Promise<ClassifiedLineFeature[]> {
    if (this.cache.has(url)) return this.cache.get(url) as ClassifiedLineFeature[];
    const res = await fetch(url);
    const geo = await res.json();
    // Build recognition matrix (cached internally for future analytics)
    const matrix = buildRecognitionMatrix(geo.features || []);
    this.cache.set(`${url}::matrix`, matrix);

    const features: ClassifiedLineFeature[] = (geo.features || [])
      .filter((f: AnyGeoFeature) => f.geometry?.type === 'LineString' || f.geometry?.type === 'MultiLineString')
      .flatMap((f: AnyGeoFeature) => {
        const props = (f.properties || {}) as Record<string, unknown>;
        const baseId = (typeof props.BRK_A3 === 'string' && props.BRK_A3) || f.id || 'border';
        const classification = normalizeFeatureCla(typeof props.FEATURECLA === 'string' ? props.FEATURECLA : undefined);
        const build = (coords: [number, number][], idx?: number): ClassifiedLineFeature => ({
          id: idx !== undefined ? `${baseId}:${idx}` : String(baseId),
          coordinates: offsetLineCoordinates(coords),
          classification
        });
        if (f.geometry?.type === 'LineString') {
          const g = f.geometry as LineStringGeom;
          return [build(g.coordinates)];
        }
        if (f.geometry?.type === 'MultiLineString') {
          const g = f.geometry as MultiLineStringGeom;
          return g.coordinates.map((coords, idx) => build(coords, idx));
        }
        return [];
      });
    this.cache.set(url, features);
    return features;
  }

  getRecognitionMatrix(url = '/geopolitical/world-borders.geojson'): RecognitionMatrixEntry[] | undefined {
    return this.cache.get(`${url}::matrix`) as RecognitionMatrixEntry[] | undefined;
  }

  async loadBordersLOD(lod: 0 | 1 | 2): Promise<ClassifiedLineFeature[]> {
    // Prefer topology -> normalized -> raw
    const topo = await this.tryLoadTopologyLOD(lod);
    if (topo) return topo;
    const normalized = await this.tryLoadNormalizedBorders(lod);
    if (normalized) return normalized;
    return this.loadBorders(this.borderFileForLOD(lod));
  }

  async loadTerritories(url = '/geopolitical/world-territories.geojson'): Promise<PolygonFeature[]> {
    if (this.cache.has(url)) return this.cache.get(url) as PolygonFeature[];
    const res = await fetch(url);
    const geo = await res.json();
    const features: PolygonFeature[] = (geo.features || [])
      .filter((f: AnyGeoFeature) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
      .flatMap((f: AnyGeoFeature) => {
        const props = (f.properties || {}) as Record<string, unknown>;
        const idBase = (typeof props.ADM0_A3 === 'string' && props.ADM0_A3) || f.id || 'territory';
        if (f.geometry?.type === 'Polygon') {
          const g = f.geometry as PolygonGeom;
          return [{ id: String(idBase), rings: offsetPolygonRings(g.coordinates) }];
        }
        if (f.geometry?.type === 'MultiPolygon') {
          const g = f.geometry as MultiPolygonGeom;
          return g.coordinates.map((poly, idx) => ({ id: `${String(idBase)}:${idx}`, rings: offsetPolygonRings(poly) }));
        }
        return [];
      });
    this.cache.set(url, features);
    return features;
  }

  async loadTerritoriesLOD(lod: 0 | 1 | 2): Promise<PolygonFeature[]> {
    return this.loadTerritories(this.territoryFileForLOD(lod));
  }

  async loadTerritoriesLODResolved(lod: 0 | 1 | 2): Promise<TerritoriesLODLoadResult> {
    const baked = await this.tryLoadBakedTerritoriesLOD(lod);
    let bakedIntegrityFallbackRequired = false;
    if (baked) {
      if (!this.hasPathologicalRussiaBakedPart(baked)) {
        return { kind: 'baked', parts: baked };
      }
      bakedIntegrityFallbackRequired = true;
      console.warn('[NationalTerritories] baked integrity fallback engaged (pathological Russia part detected); using legacy territory source for this LOD', {
        lod,
        partId: RUSSIA_PATHOLOGICAL_PART_ID,
        ratioGuard: RUSSIA_PATHOLOGICAL_RATIO_GUARD
      });
    }
    if (isProductionRuntime() && !allowLegacyTerritoryFallback() && !bakedIntegrityFallbackRequired) {
      throw new Error('Baked territory artifacts are unavailable or invalid; runtime fallback is disabled in production.');
    }
    const features = await this.loadTerritoriesLOD(lod);
    return { kind: 'legacy', features };
  }

  async loadMaritimeBordersLOD(lod:0|1|2): Promise<MaritimeFeature[] | null> {
    return this.tryLoadMaritimeTopologyLOD(lod);
  }

  buildBorders(features: ClassifiedLineFeature[], cfg: GeoPoliticalConfig['nationalTerritories']): THREE.Group {
    const filtered = cfg.showDisputedTerritories ? features : features.filter(f => !isDisputed(f.classification));
    const group = GeometryFactory.buildBorderLines(filtered, { radius: 101, color: 0xffffff, opacity: cfg.borderVisibility / 100 });
    group.children.forEach(child => {
      if (child instanceof THREE.Line) {
        const featureId = child.name.replace('border:', '');
        const f = filtered.find(ft => `border:${ft.id}` === child.name);
        const classification = (f?.classification || 'international') as BorderClassification;
        const params = resolveBorderMaterialConfig(cfg, featureId, classification);
        const mat = createLineMaterial(params);
        mat.depthWrite = false; // Enforce overlay line rendering does not write depth
        (child as THREE.Line).material = mat;
        const priority = classification === 'disputed' ? 3
          : classification === 'line_of_control' ? 3
          : classification === 'maritime_overlap' ? 2
          : classification === 'maritime_eez' ? 1
          : 0;
        child.renderOrder = 100 + priority; // base 100, layered within borders
        child.userData.classification = classification;
      }
    });
    return group;
  }

  buildTerritories(features: PolygonFeature[], cfg: GeoPoliticalConfig['nationalTerritories']): THREE.Group {
    // Apply config-driven rendering flags
    const group = GeometryFactory.buildTerritoryPolygons(features, {
      radius: 101,
      color: 0x0044ff,
      opacity: cfg.territoryColors.opacity / 100,
  // If user did not specify, let GeometryFactory apply dynamic default (0.5% radius)
  elevation: typeof cfg.fillElevationEpsilon === 'number' ? cfg.fillElevationEpsilon : undefined,
  side: THREE.DoubleSide,
  usePolygonOffset: cfg.usePolygonOffset ?? true,
  polygonOffsetFactor: cfg.polygonOffsetFactor ?? -1.5,
  polygonOffsetUnits: cfg.polygonOffsetUnits ?? -1.5
    });

    group.scale.setScalar(TERRITORY_RADIUS_SCALE);
    group.userData = {
      ...(group.userData || {}),
      territoryRadiusScale: TERRITORY_RADIUS_SCALE,
      source: 'legacy'
    };

    return group;
  }

  buildTerritoriesFromBaked(parts: BakedTerritoryPart[], cfg: GeoPoliticalConfig['nationalTerritories']): THREE.Group {
    const group = new THREE.Group();
    const opacity = cfg.territoryColors.opacity / 100;

    parts.forEach((part) => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(part.positions), 3));
      geom.setIndex(part.indices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        color: 0x0044ff,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: true,
        polygonOffset: cfg.usePolygonOffset ?? true,
        polygonOffsetFactor: cfg.polygonOffsetFactor ?? -1.5,
        polygonOffsetUnits: cfg.polygonOffsetUnits ?? -1.5
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.name = `territory:${part.id}`;
      mesh.userData = {
        ...(mesh.userData || {}),
        source: 'baked',
        countryCode: part.countryCode,
        qa: part.qa
      };
      group.add(mesh);
    });

    group.scale.setScalar(TERRITORY_RADIUS_SCALE);
    group.userData = {
      ...(group.userData || {}),
      territoryRadiusScale: TERRITORY_RADIUS_SCALE,
      source: 'baked'
    };

    return group;
  }

  buildMaritimeBorders(features: MaritimeFeature[], cfg: GeoPoliticalConfig['nationalTerritories']): THREE.Group {
    const group = GeometryFactory.buildBorderLines(features, { radius: 101, color: 0x0094ff, opacity: cfg.borderVisibility / 100 });
    group.children.forEach(child => {
      if (child instanceof THREE.Line) {
        const f = features.find(ft => `border:${ft.id}` === child.name);
  const classification = (f?.classification || 'maritime_eez') as BorderClassification;
  const params = resolveBorderMaterialConfig(cfg, f?.id || 'maritime', classification);
  const mat = createLineMaterial(params);
  mat.depthWrite = false; // Enforce overlay line rendering does not write depth
  (child as THREE.Line).material = mat;
  const priority = classification === 'maritime_overlap' ? 2 : 1;
  child.renderOrder = 98 + priority; // maritime base below borders base
  child.userData.classification = classification;
      }
    });
    group.userData.maritime = true;
    return group;
  }
}

export const nationalTerritoriesService = new NationalTerritoriesService();
