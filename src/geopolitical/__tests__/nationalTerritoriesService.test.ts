import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { nationalTerritoriesService } from '../services/NationalTerritoriesService';

const baseConfig: any = {
  borderVisibility: 80,
  borderThickness: 1,
  territoryColors: { opacity: 40, colorScheme: 'default', useCustomColors: false },
  showDisputedTerritories: true
};

describe('NationalTerritoriesService loading + building', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear internal cache by recreating (not exported) - rely on distinct URL paths per test to avoid collisions
  });

  it('prefers topology for loadBordersLOD and maps arc indices', async () => {
    const topo = {
      quantization: 1,
      arcs: [ [[0,0],[1,1]] ],
      lods: { lod0: { features: [ { id: 1, arcIndices: [0], classification: 'disputed' } ] } }
    };
    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('world-borders.topology')) return new Response(JSON.stringify(topo), { status: 200 });
      return new Response('nf', { status: 404 });
    });
  const features = await nationalTerritoriesService.loadBordersLOD(0) as any[];
  expect(features.length).toBe(1);
  expect(features[0].classification).toBe('disputed');
  });

  it('falls back to normalized when topology missing', async () => {
    const normalized = { features: [ { id: 'x', coordinates: [[0,0],[10,5]], classification: 'line_of_control' } ] };
    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('topology')) return new Response('nf', { status: 404 });
      if (url.includes('normalized')) return new Response(JSON.stringify(normalized), { status: 200 });
      return new Response(JSON.stringify({ features: [] }), { status: 200 });
    });
  const features = await nationalTerritoriesService.loadBordersLOD(1) as any[];
  expect(features[0].classification).toBe('line_of_control');
  });

  it('falls back to raw borders when both topology & normalized missing', async () => {
    const rawGeo = { features: [ { id: 'A', properties: { FEATURECLA: 'Indefinite' }, geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] } } ] } as any;
    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('topology')) return new Response('nf', { status: 404 });
      if (url.includes('normalized')) return new Response('nf', { status: 404 });
      if (url.includes('world-borders-lod2')) return new Response(JSON.stringify(rawGeo), { status: 200 });
      return new Response('nf', { status: 404 });
    });
  const features = await nationalTerritoriesService.loadBordersLOD(2) as any[];
  expect(features[0].classification).toBe('indefinite');
  });

  it('buildBorders filters disputed set when showDisputedTerritories=false', () => {
    const features: any = [
      { id: 'i', coordinates: [[0,0],[1,1]], classification: 'international' },
      { id: 'd', coordinates: [[2,0],[3,1]], classification: 'disputed' },
      { id: 'lc', coordinates: [[4,0],[5,1]], classification: 'line_of_control' },
      { id: 'ind', coordinates: [[6,0],[7,1]], classification: 'indefinite' }
    ];
    const g = nationalTerritoriesService.buildBorders(features, { ...baseConfig, showDisputedTerritories: false });
    expect(g.children.length).toBe(1);
    expect(g.children[0].name).toContain('i');
  });

  it('buildTerritories constructs meshes for each polygon including MultiPolygon split', async () => {
    const geo = { features: [
      { id: 'T1', geometry: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } },
      { id: 'T2', geometry: { type: 'MultiPolygon', coordinates: [
        [[[2,0],[3,0],[3,1],[2,1],[2,0]]],
        [[[4,0],[5,0],[5,1],[4,1],[4,0]]]
      ] } }
    ] };
    (global as any).fetch = vi.fn(async (url: string) => new Response(JSON.stringify(geo), { status: 200 }));
    const terr = await nationalTerritoriesService.loadTerritories();
    expect(terr.length).toBe(3); // 1 + 2 from multipolygon
    const group = nationalTerritoriesService.buildTerritories(terr, baseConfig);
    expect(group.children.length).toBe(3);
    group.children.forEach(ch => expect(ch instanceof THREE.Mesh).toBe(true));
  });

  it('falls back to legacy territories when baked RUS pathological part is detected', async () => {
    const bakedManifest = {
      version: 'territories-bake-v1',
      packageId: 'pkg-1',
      topology: { topologyGraphHash: 'hash-1' },
      lods: { '2': { parts: 1 } }
    };

    const bakedMesh = {
      contract: {
        manifestVersion: 'territories-bake-v1',
        packageId: 'pkg-1',
        topologyGraphHash: 'hash-1'
      },
      parts: [
        {
          id: 'RUS:1-0',
          countryCode: 'RUS',
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          indices: [0, 1, 2],
          qa: {
            maxEdgeToMedianEdgeRatio: 76.4467,
            minTriangleArea: 0.001,
            status: 'warn'
          }
        }
      ]
    };

    const legacyTerritories = {
      features: [
        {
          id: 'LEGACY',
          properties: { ADM0_A3: 'LEG', NAME: 'Legacy Land' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
          }
        }
      ]
    };

    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('/territories-baked/manifest.json')) {
        return new Response(JSON.stringify(bakedManifest), { status: 200 });
      }
      if (url.includes('/territories-baked/lod2/parts-mesh.json')) {
        return new Response(JSON.stringify(bakedMesh), { status: 200 });
      }
      if (url.includes('/world-territories-lod2.geojson')) {
        return new Response(JSON.stringify(legacyTerritories), { status: 200 });
      }
      return new Response('nf', { status: 404 });
    });

    const result = await nationalTerritoriesService.loadTerritoriesLODResolved(2);
    expect(result.kind).toBe('legacy');
    if (result.kind === 'legacy') {
      expect(result.features.length).toBe(1);
      expect(result.features[0].id).toContain('LEG');
    }
  });

  it('uses baked territories when RUS pathological ratio guard is not exceeded', async () => {
    const bakedManifest = {
      version: 'territories-bake-v1',
      packageId: 'pkg-2',
      topology: { topologyGraphHash: 'hash-2' },
      lods: { '2': { parts: 1 } }
    };

    const bakedMesh = {
      contract: {
        manifestVersion: 'territories-bake-v1',
        packageId: 'pkg-2',
        topologyGraphHash: 'hash-2'
      },
      parts: [
        {
          id: 'RUS:1-0',
          countryCode: 'RUS',
          positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
          indices: [0, 1, 2],
          qa: {
            maxEdgeToMedianEdgeRatio: 15,
            minTriangleArea: 0.001,
            status: 'pass'
          }
        }
      ]
    };

    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('/territories-baked/manifest.json')) {
        return new Response(JSON.stringify(bakedManifest), { status: 200 });
      }
      if (url.includes('/territories-baked/lod2/parts-mesh.json')) {
        return new Response(JSON.stringify(bakedMesh), { status: 200 });
      }
      if (url.includes('/world-territories-lod2.geojson')) {
        return new Response('should-not-use-legacy', { status: 500 });
      }
      return new Response('nf', { status: 404 });
    });

    const result = await nationalTerritoriesService.loadTerritoriesLODResolved(2);
    expect(result.kind).toBe('baked');
    if (result.kind === 'baked') {
      expect(result.parts.length).toBe(1);
      expect(result.parts[0].id).toBe('RUS:1-0');
    }
  });
});
