# Space Weather Visualization Audit (2026-02-15)

## Scope

Audit goal: verify what Space Weather capabilities are truly connected from UI selection -> context state -> 3D globe rendering.

Primary path reviewed:

- Layer selection UI and capability registry
- SpaceWeather context/provider and data hooks
- Globe integration and GlobeEngine overlays
- Per-layer settings/control surfaces

## Executive Summary

Only a subset of advertised Space Weather capabilities currently render as true 3D globe overlays.

- **Actually rendering on globe now**:
  - Electric field vectors/markers (`spaceWeather` markers)
  - Magnetopause shell (`spaceWeatherMagnetopause`)
  - Bow shock shell (`spaceWeatherBowShock`)
  - Aurora lines + blackout band (`spaceWeatherAurora`)
- **UI/HUD only or placeholders (no globe overlay path)**:
  - Geomagnetic Index layer (HUD/stub data)
  - Solar Wind layer (HUD/stub data; bow shock toggle only)
  - Magnetosphere layer (control wrapper around magnetopause toggle)
  - Radiation layer (control wrapper around `showMagneticField`/`showRadiation`)
  - Ionosphere, Solar Activity, Cosmic Rays (planned placeholders)

Key disconnect: selecting a layer button does **not** guarantee an associated overlay is enabled or implemented.

## Capability Matrix

| Layer ID | Registry Capability | Selectable in UI | Globe Overlay Implemented | Data Source Status | End-to-End Status |
|---|---|---:|---:|---|---|
| `electricFields` | overlay | Yes | Yes (`spaceWeather` markers) | InterMag/US-Canada (+pipeline optional) | ✅ Connected |
| `geomagneticIndex` | hud | Yes | No | Stub hook (`kp: 3`) + telemetry only | ⚠️ Partial (HUD only) |
| `solarWind` | hud | Yes | Indirect only (`showSolarWind` -> bow shock) | Stub hook for panel; boundary uses live/fallback NOAA service | ⚠️ Partial |
| `magnetosphere` | hud | Yes | Indirect only (`showMagnetopause`) | Derived from live/fallback solar wind in engine | ⚠️ Partial |
| `radiation` | hud | Yes | No dedicated overlay | Stub/flags only | ⚠️ Partial (no 3D layer) |
| `aurora` | hud | Yes | Yes (`spaceWeatherAurora`) when toggle enabled | Derived from Kp live/fallback in engine | ⚠️ Partial (toggle-gated) |
| `ionosphere` | planned | No (disabled) | No | Not implemented | ❌ Not connected |
| `solarActivity` | planned | No (disabled) | No | Not implemented | ❌ Not connected |
| `cosmicRays` | planned | No (disabled) | No | Not implemented | ❌ Not connected |

## Verified Wiring Findings

### 1) Layer selection is decoupled from overlay activation

`activeLayer` changes in selector, but overlay visibility is controlled by separate booleans:

- `showMagnetopause`
- `showSolarWind` (drives bow shock overlay)
- `showAuroralOval`

This means clicking a layer can appear to “do nothing” unless the matching toggle is already ON.

### 2) Electric-field rendering ignores activeLayer gating

Electric vectors are rendered whenever:

- mode is `EcoNatural/SpaceWeather`
- vectors exist
- electric fields are enabled

Notably, current vector generation does **not** stop when `activeLayer` is switched away from `electricFields`; only telemetry marks `inactiveLayer`.

Net effect: user-selected non-electric layers can still show electric vectors, while those selected layers may have no distinct overlay.

### 3) Several per-layer hooks are explicit stubs

The tertiary hooks return mocked values (e.g., fixed Kp/speed/sample counts) and are used for telemetry/HUD surface state, not globe geometry.

### 4) Mode components are placeholders

`SpaceWeatherModeLayers` mounts mode layer components, but each currently returns hidden placeholder DOM only (`display:none`) and does not create globe objects.

### 5) Registry already advertises limitations

Layer registry capability/status hints correctly mark many entries as `hud` or `planned`; user-facing expectation mismatch arises because selection UX still resembles full visual layer switching.

## Root Causes for “button selected but no 3D visualization”

1. **Capability mismatch**: selected layer is `hud`/`planned`, not overlay-capable.
2. **Toggle-gated overlays**: overlay booleans are independent from selected layer.
3. **No per-layer auto-enable behavior** on selection.
4. **Stub mode hooks** provide telemetry but no geometry path.

## Files Audited (key evidence)

- `src/components/SpaceWeather/SpaceWeatherLayerRegistry.ts`
- `src/components/SpaceWeather/SpaceWeatherLayerSelector.tsx`
- `src/components/SpaceWeather/SpaceWeatherControlSurface.tsx`
- `src/components/SpaceWeather/SpaceWeatherModeLayers.tsx`
- `src/components/SpaceWeather/modes/GeomagneticIndexLayer.tsx`
- `src/components/SpaceWeather/modes/AuroralOvalLayer.tsx`
- `src/components/SpaceWeather/modes/SolarWindLayer.tsx`
- `src/components/SpaceWeather/modes/MagnetopauseLayer.tsx`
- `src/components/SpaceWeather/modes/MagneticFieldLayer.tsx`
- `src/context/SpaceWeatherContext.tsx`
- `src/context/spaceWeather/useSpaceWeatherVisualization.ts`
- `src/components/Globe/Globe.tsx`
- `src/globe-engine/GlobeEngine.ts`
- `src/hooks/useGeomagneticData.ts`
- `src/hooks/useAuroralOvalData.ts`
- `src/hooks/useSolarWindData.ts`
- `src/hooks/useMagnetopauseData.ts`
- `src/hooks/useMagneticFieldData.ts`
- `src/hooks/useEcoNaturalSettings.ts`

## Recommended Fix Priority (minimal-intrusion)

1. **Add explicit capability badges in selector/tooltips** (`Overlay`, `HUD only`, `Planned`) and style `HUD only` distinctly.
2. **Auto-enable mapped overlay toggles on layer select** for `aurora`, `magnetosphere`, and `solarWind` selections.
3. **Gate electric marker rendering by `activeLayer === 'electricFields'`** (or provide explicit multi-layer rendering policy).
4. **Add a live “render path status” panel** showing: selected layer, capability, toggle state, overlay object present.
5. **Convert one HUD-only layer to true overlay next** (best candidate: geomagnetic index heat band or Kp-derived shell) to reduce expectation gap.

## Bottom Line

Your observation is correct: multiple Space Weather features are currently represented in UI and telemetry, but only a smaller core is truly connected to 3D globe rendering. The main issue is not missing stats; it is the selector-to-overlay contract being incomplete for non-electric modes.
