# Globe Frame Diagnostic Matrix — 2026-02-15

## Purpose
Provide subsystem-by-subsystem coordinate frame diagnostics before any calibration or texture-offset action.

## Legend
- Coordinate Source:
  - Shared: uses `src/utils/globeCoordinates.ts`
  - Custom: uses subsystem-specific projection math
- Compensation:
  - None: no explicit frame compensation
  - Explicit: hardcoded rotation/offset compensation in scene/object space
- Texture Coupling:
  - Low: geometry/world-space raycast driven
  - Medium: lat/lng + world transform, visually compared against texture
  - High: visual trust depends heavily on texture alignment

## Matrix

| Subsystem | Primary Files | Coordinate Source | Compensation | Texture Coupling | Risk if Global Texture Shift | Notes |
|---|---|---|---|---|---|---|
| Core Globe Geometry | `src/utils/globeCoordinates.ts` | Shared | None | Medium | Medium | Canonical mapping: (0,0) → +X, (0,90E) → -Z |
| Texture Loading | `src/globe-engine/GlobeTextureLoader.ts` | N/A | None | High | High | Currently `offset.x = 0`, no code-side longitude shift |
| Globe Mode Materials | `src/globe-engine/GlobeMaterialManager.ts`, `src/globe-engine/GlobeModeMapping.ts` | Shared + shader UV | None | High | High | One material strategy fans out to all primary modes |
| Space Weather Boundaries | `src/globe-engine/SpaceWeatherGeometry.ts`, `src/components/Globe/Globe.tsx` | Shared + solar orientation | Explicit (solar quaternion alignment) | Medium | Medium | Now oriented by sun vector; texture shift alone won’t fix frame mismatch if geometry frame differs |
| CyberCommand Intel Reports | `src/hooks/useIntelReport3DMarkers.ts` | Shared / Globe API `getCoords` | None | Medium | Medium | Uses world transforms; mostly frame-robust but visually judged against texture |
| Cursor Trail Indicator | `src/components/Globe/Enhanced3DGlobeInteractivity.tsx` | World raycast + shared helpers | None | Low | Low-Medium | Follows mesh intersections, not texture UV directly |
| National Territories | `src/geopolitical/hooks/useNationalTerritories3D.ts`, `src/geopolitical/utils/latLonToVector3.ts` | Custom | Explicit (`rotation.y = -π/2`) | High | Very High | Strongest mismatch signal; global texture shift likely forces re-tuning here |
| Geo vector inverse mapping | `src/geopolitical/utils/vector3ToLatLon.ts` | Custom | Optional (`flipZ`) | Medium | High | Indicates subsystem-specific frame assumptions |
| Globe Surface Mapping | `src/utils/globeSurfaceMapping.ts` | Shared + mesh world matrix | None | Low-Medium | Low-Medium | Good canonical bridge for world↔geo conversion |
| Overlay toggles (context) | `src/context/VisualizationOverlayContext.tsx` | N/A | Behavior lock | N/A | N/A | National territories effectively locked ON; cursor trail mutable |

## Findings
1. There is a mixed-frame ecosystem: most systems use shared globe coordinates, while geopolitical uses custom math + explicit scene compensation.
2. A global texture shift is not a local fix; it changes perceived alignment for all modes simultaneously.
3. National Territories is the highest regression hotspot for any global shift because it already compensates independently.

## Decision Guardrails (Before Calibration)
A global texture offset can only be approved if all are true:
- [ ] Visual audit overlay (`?geoDebugOverlay=audit`) confirms uniform angular mismatch across modes.
- [ ] National Territories compensation path is either disabled in test branch or re-derived from canonical frame.
- [ ] Intel report anchors and cursor trail retain expected world/geo behavior in cross-mode checks.
- [ ] Space weather boundaries remain sun-aligned and geospatially coherent after candidate offset.

## Go/No-Go Recommendation (Current)
- Current recommendation: **No-Go** for immediate global texture shift.
- Next recommended action: run canonical frame reconciliation plan (see phased roadmap) before any texture offset decision.
