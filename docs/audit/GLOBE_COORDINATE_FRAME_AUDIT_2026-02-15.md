# Globe Coordinate Frame Audit — 2026-02-15

## Scope
Cross-mode audit of 3D globe coordinate consistency and toggle behavior, with emphasis on:
- CyberCommand Intel Reports
- Cursor Trail Indicator
- National Territories
- Space Weather boundary overlays

Constraint: no texture asset edits during audit phase.

## Executive Summary
- The globe geometry coordinate system is internally consistent in core utilities (`latLngToGlobeVector3`, `vector3ToLatLng`).
- Texture normalization currently applies **no UV longitude shift** (`offset.x = 0`), so there is no hidden code-side texture offset.
- National Territories intentionally uses a **separate geopolitical projection path** and then applies a **-90° scene counter-offset**, indicating an explicit frame compensation layer.
- CyberCommand Intel Reports and cursor-trail interactions primarily rely on world/mesh intersections and shared globe mapping utilities, not texture UV assumptions.
- Because one subsystem (National Territories) has explicit scene compensation, applying a global texture shift first would likely introduce cross-mode regressions.

## Findings by System

### 1) Core globe geometry and texture pipeline
- Texture loader keeps native alignment (no programmatic longitudinal shift):
  - `texture.offset.x = 0`
  - `wrapS = RepeatWrapping`, `wrapT = ClampToEdgeWrapping`
- Files:
  - `src/globe-engine/GlobeTextureLoader.ts`
  - `src/utils/globeCoordinates.ts`
  - `src/utils/globeCoordinates.test.ts`

Interpretation:
- If a 90° mismatch exists, it is more likely due to **asset-native orientation and/or subsystem-specific projection math**, not a hidden texture offset in loader code.

### 2) Globe mode/material usage (all primary modes)
- One GlobeEngine material pipeline is used for mode shader selection.
- Mode mapping:
  - CyberCommand → hologram + `earthDark`
  - EcoNatural → day/night + `earthDay` / night blend path
  - GeoPolitical → blue marble
- Files:
  - `src/globe-engine/GlobeModeMapping.ts`
  - `src/globe-engine/GlobeEngine.ts`
  - `src/globe-engine/GlobeMaterialManager.ts`

Implication:
- Any texture UV offset policy is globally consequential.

### 3) CyberCommand Intel Reports
- Intel report placement uses either globe API `getCoords(...)` or shared `latLngToGlobeVector3(...)`, then world transform against resolved globe mesh.
- File:
  - `src/hooks/useIntelReport3DMarkers.ts`

Risk under global texture shift:
- Geometry positions stay mathematically consistent in world space, but visual land alignment would shift relative to texture if texture were altered globally without recalibrating all geospatial overlays.

### 4) Cursor Trail Indicator
- Cursor trail uses raycast intersection on actual globe mesh (`worldPointToGeoOnGlobe`) and updates local visual indicator from world intersection normals.
- File:
  - `src/components/Globe/Enhanced3DGlobeInteractivity.tsx`
  - helper: `src/utils/globeSurfaceMapping.ts`

Risk under global texture shift:
- Trail geometry remains correct to globe mesh; perceived mismatch would be texture-facing if texture orientation is wrong.

### 5) National Territories (high-risk subsystem)
- Uses geopolitical projection utils distinct from global utility:
  - `latLonToVector3` with `invertX = true` by default.
- Applies explicit scene compensation:
  - `GEOPOLITICAL_SCENE_COUNTER_OFFSET_RAD = -Math.PI / 2`
  - group `rotation.y = -π/2`
- Files:
  - `src/geopolitical/utils/latLonToVector3.ts`
  - `src/geopolitical/utils/vector3ToLatLon.ts`
  - `src/geopolitical/hooks/useNationalTerritories3D.ts`
  - `src/geopolitical/__tests__/useNationalTerritories3D.offset.test.ts`

Interpretation:
- This path already includes hard compensation and is the strongest indicator of mixed coordinate conventions.
- A global texture shift now could force re-tuning geopolitical offsets and related tests.

### 6) Toggle behavior audit
- Cursor trail toggle is fully mutable via overlay context.
- National Territories toggle is effectively locked ON in provider (`set...` and toggle force true).
- Files:
  - `src/context/VisualizationOverlayContext.tsx`
  - `src/context/VisualizationOverlayContextStore.ts`
  - `src/components/HUD/Bars/CyberCommandRails/CyberCommandRightSideRail.tsx`

Implication:
- "Toggle features" behavior is not symmetric: National Territories is intentionally always-on regardless of UI interaction.

## Audit Verdict (before calibration)
Do **not** apply a global texture 90° shift yet.

Reason:
- Evidence shows at least one subsystem (National Territories) has explicit frame compensation and independent projection math.
- Applying a global shift now risks broad regressions across GeoPolitical and potentially any overlay with implicit assumptions.

## Recommended Next Step (safe)
1. Perform visual audit pass with the existing non-destructive audit overlay (`?geoDebugOverlay=audit`).
2. Record observed angular delta between expected prime meridian landmarks and texture meridians.
3. Build a small "frame diagnostic matrix" for each subsystem:
   - uses shared globeCoordinates vs custom projection
   - has explicit rotation/offset compensation
   - expected impact if texture shifted.
4. Only then choose one of two strategies:
   - Strategy A: canonical geometry frame + per-subsystem adapter cleanup (preferred long-term).
   - Strategy B: global texture offset and refit all compensated subsystems (faster but riskier).

## Refactor Size Estimate if Strategy A (preferred)
- Medium-high: ~8–12 files touching geopolitics + globe mapping adapters + tests.
- Benefit: one canonical frame, fewer hidden offsets.

## Refactor Size Estimate if Strategy B (texture-first)
- Medium: ~6–10 files immediately, but high regression risk and follow-up tuning.
- Likely additional rework in geopolitical layers.

## Tracking
- This audit intentionally avoids calibration or texture edits.
- Calibration should only proceed after subsystem frame matrix is completed.

## Linked Deliverables
- Canonical frame contract:
  - `docs/audit/GLOBE_CANONICAL_FRAME_CONTRACT_2026-02-15.md`
- Frame diagnostic matrix:
  - `docs/audit/GLOBE_FRAME_DIAGNOSTIC_MATRIX_2026-02-15.md`
- Expanded post-audit phases:
  - `docs/audit/GLOBE_COORDINATE_REFACTOR_PHASES_2026-02-15.md`
