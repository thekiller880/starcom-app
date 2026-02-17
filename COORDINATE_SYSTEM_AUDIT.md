# Coordinate System Audit (Globe)

## Scope
This audit compares lat/lon <-> 3D conversions, texture orientation assumptions, and interaction inverse mappings across globe-related runtime paths.

## Canonical Runtime Convention (Observed Majority)
Most active CyberCommand / Intel marker paths use:

- Forward map:
  - `phi = (90 - lat) * DEG2RAD`
  - `theta = (lng + 180) * DEG2RAD`
  - `x = -(r * sin(phi) * cos(theta))`
  - `y =  r * cos(phi)`
  - `z =  r * sin(phi) * sin(theta)`

Representative files:
- `src/components/Globe/Globe.tsx`
- `src/hooks/useCyberAttacks3D.ts`
- `src/hooks/useCyberThreats3D.ts`
- `src/hooks/useIntelReport3DMarkers.ts`
- `src/services/intelligence/IntelGlobeService.ts`
- `src/components/Globe/Features/IntelReport3DMarker/IntelReport3DMarker.tsx`

## Mismatch Matrix

### 1) Inverse mapping drift (high-risk)
Two different inverse formulas are used for globe surface pick -> lat/lng, and neither is aligned as a single shared implementation:

- Variant A:
  - `lng = ((270 + atan2(x, z) * RAD2DEG) % 360) - 180`
  - Files:
    - `src/components/Globe/EnhancedGlobeInteractivity.tsx`
    - `src/components/Globe/Enhanced3DGlobeInteractivity.tsx`
    - `src/systems/interaction/Globe3DInputManager.ts`

- Variant B:
  - `lng = atan2(x, z) * RAD2DEG`
  - File:
    - `src/hooks/useGlobeRightClickInteraction.ts`

Impact:
- Click/hover-created coordinates can differ from marker placement conventions.
- Context-menu geolocation can be offset from what users visually target.

### 2) Forward mapping sign drift (high-risk)
A second forward convention exists with positive X:

- Drift formula:
  - `x = +(r * sin(phi) * cos(theta))`
  - `y =  r * cos(phi)`
  - `z =  r * sin(phi) * sin(theta)`

Files:
- `src/globe-engine/SpaceWeatherGeometry.ts`
- `src/services/Satellites/SatelliteDataManager.ts`
- `src/components/Globe/visualizations/CyberAttacksVisualization.tsx` (component appears not currently wired into main `Globe.tsx`)
- `src/components/HUD/FloatingPanels/FloatingPanelManager.tsx` (2D approximation helper)

Impact:
- Any runtime path using this convention will mirror longitudes relative to canonical paths.
- Mixed rendering layers can appear texture-misaligned or geographically mirrored.

### 3) Shared utility defaults conflict (medium-risk)
`src/geopolitical/utils/latLonToVector3.ts` and `src/geopolitical/utils/vector3ToLatLon.ts` use configurable flips (`invertX`, `flipZ`) with defaults that can diverge from runtime globe conventions if consumed without explicit options.

Impact:
- Potential silent convention changes when reused by new features.
- Hard-to-debug latent drift in geopolitical overlays.

### 4) Texture-orientation documentation mismatch (medium-risk)
`src/globe-engine/GlobeTextureLoader.ts` contains a normalization comment indicating a historical `-90°` U-shift (`offset.x = 0.75`) while the current code sets `texture.offset.x = 0`.

Impact:
- Team-level confusion about intended texture meridian alignment.
- Increases probability of reintroducing accidental 90° compensations elsewhere.

## Likely Cause of Reported 90° Offset
The app currently has competing coordinate conventions and at least two incompatible inverse formulas. A user-visible “90°” discrepancy can emerge when a point selected by one inverse path is rendered by a different forward path.

## Recommended Remediation Order
1. **Define one canonical transform module**
   - Add a single source of truth (e.g., `src/utils/globeCoordinates.ts`) with:
     - `latLngToVector3Canonical(...)`
     - `vector3ToLatLngCanonical(...)`
     - strict longitude normalization helper.

2. **Refactor all interaction pick paths first**
   - Replace inverse logic in:
     - `EnhancedGlobeInteractivity.tsx`
     - `Enhanced3DGlobeInteractivity.tsx`
     - `Globe3DInputManager.ts`
     - `useGlobeRightClickInteraction.ts`

3. **Refactor forward conversion drift paths**
   - Migrate positive-X paths to canonical where globe overlays are expected to align with CyberCommand markers.

4. **Lock behavior with tests**
   - Add round-trip tests (lat/lon -> xyz -> lat/lon) for anchor points:
     - `(0,0)`, `(0,90)`, `(0,-90)`, `(45,0)`, `(-45,180)`
   - Add one integration assertion for click-pick -> created marker position equivalence.

5. **Clean up texture docs/comments**
   - Update `GlobeTextureLoader` comments to reflect intended meridian and remove stale offset guidance.

## Confidence
High confidence in the presence of convention drift and mismatch risk.
Medium confidence on exact user-visible offset magnitude per subsystem until interaction and rendering paths are forced through one canonical module.
