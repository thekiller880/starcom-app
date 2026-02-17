# National Territories Geometry Bake Spec

## Status
- **Owner:** CyberCommand / Geopolitical Visualization
- **Scope:** National territory fill meshes + border line geometry for globe rendering
- **Decision:** Move from runtime triangulation to offline deterministic mesh bake pipeline
- **Date:** 2026-02-13

---

## 0) Source and Architecture Decision (Clean-Room)

### 0.1 Decision
- Build a **clean-room baked geometry pipeline** from scratch.
- Do **not** reference legacy runtime triangulation paths or fallback methods.
- Runtime loads **baked assets only** for national fills.

### 0.2 Recommended Primary Data Source
- **Primary:** Overture Maps administrative boundaries (latest stable snapshot pinned by checksum).
- **Fallback source (if coverage gap):** Natural Earth 10m admin boundaries/countries.

### 0.3 Why this is the best fit
- Higher source fidelity than current Natural Earth 50m baseline.
- Better long-term update cadence while still allowing deterministic version pinning.
- Works with aggressive offline optimization so browser runtime remains light on older devices.

---

## 1) Goals and Non-Goals

### Goals
- Produce stable, high-quality national territory geometry without cross-country bridge artifacts.
- Make geometry generation deterministic and CI-verifiable.
- Support multiple LODs while preserving visual integrity near dateline/poles.
- Keep border rendering decoupled from fill triangulation quality.
- Ensure acceptable performance on older hardware (including pre-M1 Mac mini class devices).

### Non-Goals
- Real-time runtime mesh repair in browser.
- Introducing custom rendering effects or UI changes.
- Rewriting globe engine architecture beyond geometry ingestion contract.
- Legacy geometry fallback paths for national fills in production runtime.

---

## 2) Problem Summary (Current State)

Runtime triangulation from raw GeoJSON rings is fragile for:
- Dateline-crossing and near-polar polygons.
- Complex multi-polygons and ring edge-cases.
- Higher LODs where pathological long triangles appear more frequently.

Observed behavior indicates artifacts are emergent during triangulation/mesh construction, not primarily from raw source ring corruption.

---

## 3) Target Architecture

### 3.1 High-Level Pipeline
1. **Ingest** source boundaries (Overture primary; approved fallback source only when required).
2. **Build Canonical Shared Topology Graph** (single arc/ring model for all countries).
3. **Normalize/Repair Topology** (validity, snapping, de-slivering, winding normalization).
4. **Dateline + Polar Handling** (split/safe projection domains with seam continuity constraints).
5. **Triangulate Offline** in stable local 2D domain per polygon part.
6. **Reproject** to globe coordinates and build mesh artifacts.
7. **Optimize + Quantize** geometry for web delivery budgets.
8. **QA Gates** reject pathological outputs, topology drift, and budget violations.
9. **Publish Versioned Artifacts** consumed by app at runtime.

### 3.2 Runtime Rendering Model
- Runtime only loads pre-baked geometry artifacts.
- Borders loaded as separate line-layer assets.
- No runtime earcut/shape triangulation for national fills.
- Device-aware LOD selection is allowed, but all selected assets are pre-baked.
- Borders and fills are required to be derived from the same canonical topology graph.

---

## 4) Open Source Stack (Recommended)

### Primary Stack (MVP + Production)
- **GDAL/ogr2ogr**: ingest, transform, simplify, split operations.
- **GEOS/Shapely (Python)**: validity repair, topology ops, geometry normalization.
- **pyproj**: projection transforms for local triangulation domains.
- **mapbox_earcut** (offline use) or constrained triangulation library for triangulation.
- **meshoptimizer / Draco / quantized binary packing**: reduce payload and decode cost for web.

### Optional / Alternative
- **PostGIS** for large-scale repeatable geometry ETL and audit trails.
- **H3/S2** as a fallback representation strategy for extreme robustness.

### Source Ingestion Rule
- Source snapshots must be pinned by: provider name, dataset version/snapshot date, URL, SHA-256 checksum.
- Any source update triggers full rebake + QA + visual regression before merge.

---

## 4.1 Performance-First Output Budget (Web + Older Devices)

These are release targets, not aspirational metrics.

### LOD Triangle Budgets (fills only)
- **LOD0 (far / default on low-tier):** target <= 50k triangles global
- **LOD1 (mid):** target <= 120k triangles global
- **LOD2 (near / high-tier):** target <= 240k triangles global

### Transfer Budgets (compressed)
- **LOD0:** <= 900 KB gzip/brotli
- **LOD1:** <= 2.2 MB gzip/brotli
- **LOD2:** <= 4.5 MB gzip/brotli

### Decode + Main-Thread Budgets
- LOD0 decode+upload target <= 80 ms on pre-M1 Mac mini class hardware
- LOD1 decode+upload target <= 180 ms on pre-M1 Mac mini class hardware
- LOD2 decode+upload target <= 350 ms on pre-M1 Mac mini class hardware

### Runtime Frame Budget
- Must sustain smooth interaction at **>= 30 FPS** on low-tier devices at default quality.
- Default quality tier for low-tier devices must prefer LOD0 for territories.

---

## 5) Artifact Contract

## 5.1 Directory Layout
- `public/geopolitical/territories-baked/manifest.json`
- `public/geopolitical/territories-baked/lod0/*.json`
- `public/geopolitical/territories-baked/lod1/*.json`
- `public/geopolitical/territories-baked/lod2/*.json`
- `public/geopolitical/borders-baked/lod0.geojson`
- `public/geopolitical/borders-baked/lod1.geojson`
- `public/geopolitical/borders-baked/lod2.geojson`

## 5.2 Territory Mesh Artifact Schema (per country part)
```json
{
  "id": "USA:12",
  "countryCode": "USA",
  "name": "United States of America",
  "lod": 1,
  "version": "v1",
  "projectionDomain": {
    "type": "tangent|lambert|regional-equirect",
    "centerLon": -96.0,
    "centerLat": 39.0
  },
  "bbox": [minLon, minLat, maxLon, maxLat],
  "vertexCount": 0,
  "triangleCount": 0,
  "encoding": {
    "positionFormat": "quantized-int16|float32",
    "indexFormat": "uint16|uint32",
    "compression": "none|meshopt|draco"
  },
  "positions": [x, y, z, ...],
  "indices": [i0, i1, i2, ...],
  "qa": {
    "maxEdgeToMedianEdgeRatio": 0,
    "minTriangleArea": 0,
    "selfIntersectionCount2D": 0,
    "status": "pass|warn|fail"
  }
}
```

## 5.3 Manifest Schema
```json
{
  "version": "territories-bake-v1",
  "generatedAt": "ISO-8601",
  "source": {
    "provider": "overture|natural-earth|other",
    "dataset": "string",
    "datasetVersion": "string",
    "snapshotDate": "YYYY-MM-DD",
    "checksumSha256": "hex"
  },
  "lods": {
    "0": { "parts": 0, "vertices": 0, "triangles": 0 },
    "1": { "parts": 0, "vertices": 0, "triangles": 0 },
    "2": { "parts": 0, "vertices": 0, "triangles": 0 }
  },
  "qaSummary": {
    "failedParts": 0,
    "warnParts": 0,
    "maxObservedEdgeRatio": 0,
    "budgetViolations": 0,
    "payloadBytesByLod": { "0": 0, "1": 0, "2": 0 }
  }
}
```

---

## 6) Quality Gates (Release Blocking)

A bake is releasable only when all mandatory gates pass.

### 6.1 Mandatory Gates
- Geometry validity after repair: **100% pass**.
- Triangle indices in range / no NaN coordinates: **100% pass**.
- Self-intersections in triangulation domain: **0** for final mesh parts.
- Max edge ratio gate per part: **maxEdge/medianEdge <= 12** (MVP), tighten to <= 10 in production.
- Minimum area gate: no triangles below configured epsilon (projection-space + world-space checks).
- LOD triangle budget compliance: **100% pass**.
- Transfer budget compliance (gzip/brotli): **100% pass**.
- Deterministic output hash unchanged for same source + same toolchain: **100% pass**.
- Canonical topology consistency across neighbors (no unintended gaps/overlaps): **100% pass**.
- Dateline/polar seam continuity checks: **100% pass**.
- Border/fill topology parity checks: **100% pass**.
- Index/vertex format safety (`uint16`/`uint32` bounds respected): **100% pass**.

### 6.2 Warning Gates (non-blocking at MVP, blocking in production)
- Parts with high triangle anisotropy concentration.
- Per-country triangle count explosion versus previous bake baseline.
- Dateline-partition count delta above threshold.
- Decode-time regression above threshold on baseline low-tier test device profile.
- Cross-LOD shape drift above warning thresholds (area, perimeter, centroid deltas).

### 6.3 Global Topology Invariants (Publish Blocking)
- **Coverage invariant:** global fill union must not introduce unintended voids.
- **Neighbor invariant:** neighboring country boundaries must share the same canonical arcs.
- **No-crack invariant:** rendered adjacency at each LOD must have no visible seam cracks.
- **No-overlap invariant:** overlapping fills are only permitted where policy layer marks explicit disputed overlays.
- **Ring invariant:** shell/hole orientation and containment rules must hold after every transform stage.
- **Survivability invariant:** microstates and designated tiny islands must survive all simplification passes.

### 6.4 Failure Mode Matrix (Required)

Every bake release must include this matrix in QA output with pass/fail per row.

| Failure mode | Detector | Blocking threshold | Auto-remediation |
|---|---|---|---|
| Neighbor crack/gap | Topology graph adjacency diff + render seam probe | Any gap above epsilon | Rebuild from canonical shared arcs |
| Cross-country overlap (non-disputed) | Polygon intersection scan | Any non-disputed overlap | Snap/clean + conflict resolver |
| Dateline bridge artifact | Seam continuity + long-edge detector near ±180° | Any bridge flagged | Repartition polygon domain + retriangulate |
| Polar fan degeneration | Triangle area/angle checks in polar bins | Any degenerate triangle | Polar-local projection fallback |
| Microstate disappearance | Feature survivability list check | Any missing required feature | Exempt from simplification or force LOD floor |
| Hole inversion/fill leak | Shell-hole containment/winding validator | Any invalid ring relation | Rewind + topology repair |
| LOD pop drift | Cross-LOD area/perimeter/centroid deltas | Above configured thresholds | Adaptive simplification per offender |
| Index overflow | Vertex/index format validator | Any overflow | Split part/chunk and re-index |
| Border/fill mismatch | Shared-arc identity check | Any mismatch | Regenerate borders from canonical arcs |
| Decode stutter on low-tier profile | Decode+upload benchmark | Over LOD budget | Increase quantization/compression or reduce triangles |

### 6.5 Golden Offender Regression Set (Required)

Maintain and run a fixed global offender set each release, including:
- Dateline-crossing geometries
- Near-polar geometries
- Large multi-part countries with exclaves
- Microstates and tiny islands
- Known disputed boundary regions
- High-fragment archipelagos

A release fails if any offender has a new blocking issue versus previous accepted bake.

---

## 7) Determinism and Reproducibility

- Pin tool versions via `requirements.txt` / lock files.
- Pin source dataset version + checksum in manifest.
- Ensure stable sort order for countries, parts, rings, and vertices.
- Avoid nondeterministic floating output by fixed precision and deterministic index ordering.
- Pin canonical topology build parameters and hash the topology graph independently of mesh outputs.

---

## 8) Build Scripts and CI

## 8.1 Proposed Scripts
- `scripts/geopolitical/bake_territories.py`
- `scripts/geopolitical/bake_borders.py`
- `scripts/geopolitical/qa_territories.py`
- `scripts/geopolitical/generate_manifest.py`
- `scripts/geopolitical/profile_decode.py` (or TS equivalent) for payload/decode budget checks

## 8.2 NPM Script Hooks
- `npm run geo:bake` -> full bake (all LODs)
- `npm run geo:qa` -> run QA gates on baked output
- `npm run geo:publish` -> move validated artifacts to `public/geopolitical/*-baked`

## 8.3 CI Policy
- PR check runs `geo:qa` against committed artifacts.
- Release pipeline runs full `geo:bake && geo:qa` and stores reports as artifacts.
- Fail build on mandatory gate violations.
- Fail build if any LOD exceeds transfer/triangle/decode budget.
- Fail build if any Global Topology Invariant fails.
- Fail build if any Golden Offender Regression case regresses.

---

## 9) Runtime Integration Contract

- Update territory loading service to prefer baked assets:
  - First: `public/geopolitical/territories-baked/manifest.json`
  - No runtime triangulation fallback in production
- Add feature flag:
  - `geoUseBakedTerritories=1` default on after acceptance.
- Keep rollback only to previous baked artifact version.

### 9.1 Device Tier Policy
- Tier A (low-tier CPU / older integrated GPUs): default LOD0
- Tier B (mid-tier): default LOD1
- Tier C (high-tier): allow LOD2
- Dynamic downshift allowed when frame time exceeds threshold.

### 9.2 Runtime Safety Rules
- Never mix borders from one bake version with fills from another.
- Reject manifest at load if topology graph hash and mesh hash set are inconsistent.
- If a baked package is invalid, rollback to last known-good baked package only.

---

## 10) Rollout Plan

### Phase A (MVP, 3–6 days)
- Implement clean-room offline bake for one LOD (LOD1) from new source.
- Add mandatory QA checks and manifest.
- Integrate runtime loader for baked LOD1.
- Validate with known offender countries (e.g., RUS, MEX, CAN parts).
- Add first pass of Global Topology Invariant checks.

### Phase B (Production Hardening, +1–3 weeks)
- Add LOD0 and LOD2 outputs.
- Add CI enforcement + baseline comparison reports.
- Tighten thresholds and remove warning debt.
- Add deterministic regression snapshots.
- Add low-tier decode/frame-time benchmark gate.
- Complete Failure Mode Matrix automation and Golden Offender Regression suite.

### Phase C (Cleanup)
- Ship baked-only runtime path for national fills.
- Keep only loader + mesh material/render logic in client.

---

## 11) Effort Estimate

- **MVP:** 4–7 engineering days.
- **Production-ready:** 3–5 weeks total.
- **Optional advanced fallback (H3/S2 hybrid):** +1–2 weeks.

Assumes one engineer familiar with current geopolitical pipeline and globe rendering paths.

---

## 12) Risks and Mitigations

- **Risk:** Source boundary updates break assumptions.
  - **Mitigation:** dataset checksum pinning + automated QA diff gates.
- **Risk:** New source licensing/attribution drift.
  - **Mitigation:** enforce provider + license metadata in manifest and release checklist.
- **Risk:** LOD simplification introduces topology defects.
  - **Mitigation:** simplify with topology-preserving operations only and revalidate post-simplification.
- **Risk:** Runtime memory increase from baked meshes.
  - **Mitigation:** chunk by country/region, lazy-load by LOD, and compress artifacts.
- **Risk:** Older hardware jank despite valid geometry.
  - **Mitigation:** hard decode/frame budgets + tiered default LOD + automatic downshift.

---

## 13) Acceptance Criteria

- No visually obvious cross-country fill bridges on target offender set.
- QA mandatory gates pass for all parts and all shipped LODs.
- Global Topology Invariants pass for every shipped LOD.
- Runtime loads baked territories by default with no runtime triangulation fallback.
- Build/CI includes reproducible geometry reports for each bake.
- Low-tier benchmark profile sustains >=30 FPS during normal globe interaction.
- Golden Offender Regression suite has zero new blocking failures.

---

## 14) Immediate Next Actions

1. Approve clean-room source decision (Overture primary, NE 10m fallback).
2. Scaffold source-ingest module with checksum/version pinning.
3. Implement LOD1 baked pipeline with quantized/binary artifact output.
4. Implement canonical shared-topology graph builder and border/fill parity checks.
5. Add QA + budget gates (triangle/bytes/decode) plus Global Topology Invariants.
6. Implement Failure Mode Matrix reporting and Golden Offender Regression suite.
7. Run offender-country validation + low-tier device performance pass.

---

## 15) No-Publish Checklist (Release Blocking)

A bake cannot be published unless all items below are true:

- Source provider/version/checksum are pinned and match manifest.
- Canonical topology graph hash is present and reproducible.
- Mandatory QA gates pass.
- Global Topology Invariants pass.
- Failure Mode Matrix has no blocking failures.
- Golden Offender Regression suite shows no blocking regressions.
- LOD triangle/transfer/decode budgets pass.
- Low-tier runtime benchmark meets minimum frame target.
- Border/fill parity check passes for shipped artifact set.
