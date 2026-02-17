import { Event as NostrEvent } from 'nostr-tools';
import { GeoIntConfig, ParsedFeature, ParsedLine, ParsedPoint, ParsedPolygon, ParsedResult } from './types';
import { boundsCheck } from './validator';

const GEO_KEYS = ['geo', 'g'];
const GEOJSON_DELIMITER = '---GEOJSON---';

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function stripGeoJsonTail(content: string): string {
  const idx = content.indexOf(GEOJSON_DELIMITER);
  return idx >= 0 ? content.slice(0, idx) : content;
}

function extractGeoJsonPayloads(content: string): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // Navcom format: "... #tag ---GEOJSON---{...json...}"
  if (trimmed.includes(GEOJSON_DELIMITER)) {
    const parts = trimmed.split(GEOJSON_DELIMITER).slice(1);
    return parts
      .map((p) => p.trim())
      .map((p) => {
        const firstBrace = p.indexOf('{');
        return firstBrace >= 0 ? p.slice(firstBrace).trim() : '';
      })
      .filter(Boolean);
  }

  // Raw JSON content
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return [trimmed];
  }

  return [];
}

function parseGeoTag(tagVal: string): ParsedPoint | null {
  const parts = tagVal.split(/[;,]/).map(p => p.trim()).filter(Boolean);
  const kv: Record<string, string> = {};
  for (const part of parts) {
    const [k, v] = part.split(/[:=]/).map(s => s.trim());
    if (k && v) kv[k.toLowerCase()] = v;
  }
  const lat = parseFloat(kv.lat ?? kv.latitude);
  const lon = parseFloat(kv.lon ?? kv.lng ?? kv.longitude);
  const alt = kv.alt ? parseFloat(kv.alt) : undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon, alt: Number.isFinite(alt || NaN) ? alt : undefined };
}

// Minimal geohash decode (center of cell)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function decodeGeohash(hash: string): ParsedPoint | null {
  let even = true;
  let latRange = [-90.0, 90.0];
  let lonRange = [-180.0, 180.0];
  for (const ch of hash.toLowerCase()) {
    const cd = BASE32.indexOf(ch);
    if (cd === -1) return null;
    for (let mask = 16; mask >= 1; mask >>= 1) {
      if (even) {
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (cd & mask) lonRange[0] = mid; else lonRange[1] = mid;
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (cd & mask) latRange[0] = mid; else latRange[1] = mid;
      }
      even = !even;
    }
  }
  return { lat: (latRange[0] + latRange[1]) / 2, lon: (lonRange[0] + lonRange[1]) / 2 };
}

function collectGeoFromTags(event: NostrEvent): ParsedPoint | null {
  for (const tag of event.tags) {
    if (!Array.isArray(tag) || tag.length < 2) continue;
    const key = String(tag[0] || '').toLowerCase();
    const val = String(tag[1] || '').trim();
    if (!GEO_KEYS.includes(key)) continue;
    if (key === 'geo') {
      const pt = parseGeoTag(val);
      if (pt) return pt;
    }
    if (key === 'g') {
      const pt = decodeGeohash(val);
      if (pt) return pt;
    }
  }
  return null;
}

function parseGeoJSON(content: string, config: GeoIntConfig, eventId: string): ParsedFeature[] {
  const features: ParsedFeature[] = [];

  const payloads = extractGeoJsonPayloads(content);
  if (payloads.length === 0) return [];

  const pushFeature = (kind: 'point' | 'line' | 'polygon', geometry: any, createdAtMs: number) => {
    const id = kind === 'point' ? eventId : `${eventId}#${features.length}`;
    features.push({
      id,
      kind,
      createdAtMs,
      geometry,
      props: {}
    });
  };
  const createdAtMs = Date.now();
  const addPoint = (coords: any) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    const [lon, lat, alt] = coords;
    if (!boundsCheck(lat, lon).ok) return;
    pushFeature('point', { lat, lon, alt }, createdAtMs);
  };
  const addLine = (coords: any) => {
    if (!Array.isArray(coords) || coords.length < 2) return;
    const pts: ParsedPoint[] = [];
    for (const c of coords) {
      if (!Array.isArray(c) || c.length < 2) return;
      const [lon, lat, alt] = c;
      if (!boundsCheck(lat, lon).ok) return;
      pts.push({ lat, lon, alt });
    }
    pushFeature('line', { coords: pts } as ParsedLine, createdAtMs);
  };
  const addPolygon = (rings: any) => {
    if (!Array.isArray(rings) || rings.length === 0) return;
    const ringPoints: ParsedPoint[][] = [];
    let vertexTotal = 0;
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 4) return;
      const pts: ParsedPoint[] = [];
      for (const c of ring) {
        if (!Array.isArray(c) || c.length < 2) return;
        const [lon, lat, alt] = c;
        if (!boundsCheck(lat, lon).ok) return;
        pts.push({ lat, lon, alt });
      }
      vertexTotal += pts.length;
      ringPoints.push(pts);
    }
    if (vertexTotal > config.maxVerticesPerPolygon || vertexTotal > config.maxEventVertexTotal) return;
    pushFeature('polygon', { rings: ringPoints } as ParsedPolygon, createdAtMs);
  };

  const handleGeometry = (geom: any) => {
    if (!geom || typeof geom.type !== 'string') return;
    const t = geom.type;
    if (t === 'Point') addPoint(geom.coordinates);
    if (t === 'LineString') addLine(geom.coordinates);
    if (t === 'Polygon') addPolygon(geom.coordinates);
  };

  for (const payload of payloads) {
    let json: any;
    try {
      json = JSON.parse(payload);
    } catch {
      continue;
    }

    if (json?.type === 'Feature') {
      handleGeometry(json.geometry);
    } else if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) {
      for (const feat of json.features.slice(0, config.maxFeaturesPerCollection)) {
        handleGeometry(feat.geometry);
      }
    }
  }
  return features;
}

export function parseEvent(event: NostrEvent, config: GeoIntConfig): ParsedResult {
  const createdAtMs = (event.created_at || 0) * 1000;
  const features: ParsedFeature[] = [];
  const rawContent = event.content || '';
  const descriptionText = stripHtml(stripGeoJsonTail(rawContent)).slice(0, 512);

  const tagPoint = collectGeoFromTags(event);
  if (tagPoint && boundsCheck(tagPoint.lat, tagPoint.lon).ok) {
    features.push({
      id: event.id,
      kind: 'point',
      createdAtMs,
      geometry: tagPoint,
      props: {
        description: descriptionText,
        sourceTags: event.tags.map(t => (Array.isArray(t) ? t.join(':') : String(t)))
      }
    });
  }
  const geojsonFeatures = parseGeoJSON(rawContent, config, event.id);
  for (const f of geojsonFeatures) {
    f.createdAtMs = createdAtMs;
    f.props.description = f.props.description ?? descriptionText;
    f.props.sourceTags = f.props.sourceTags ?? event.tags.map(t => (Array.isArray(t) ? t.join(':') : String(t)));
    features.push(f);
  }
  if (features.length === 0) return { features: [], reason: 'invalid_geojson' };
  return { features };
}
