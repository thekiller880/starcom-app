# 05 - Legacy Panels: Popup vs Retire Map

## Purpose
Classify legacy sidebar/panel modules into:
- **Popup** (salvage behavior via popup/sheet surface)
- **Retire** (remove from rebuild path)
- **Fence** (short bridge only, then remove)

This is audit-only disposition guidance aligned to the rail architecture.

## Decision Criteria

### Popup
Use popup when module contains valuable dense controls or workflows that do not fit rail width.

### Retire
Retire when module is empty, unmounted, duplicated, or superseded by newer compact/registry-driven controls.

### Fence
Fence only when short-term compatibility is required during migration sequencing.

## Panel-by-Panel Disposition

| Module | Current State (Audit) | Disposition | Rationale |
|---|---|---|---|
| `CyberInvestigationHub.tsx` | Implemented, popup-oriented workflow manager with investigation/team/package controls | **Popup** | Rich workflow depth is valuable; too dense for rail, already conceptually popup-compatible |
| `GlobeStatus.tsx` | Implemented status block combining NOAA + mode stats | **Popup** | Status density better as on-demand popup card, not persistent rail width |
| `NOAAVisualizationStatus.tsx` | Implemented status/details tied to NOAA visualization manager hooks | **Popup** | Useful diagnostics/status detail; should be callable on demand |
| `DeepSettingsPanel.tsx` | Large advanced NOAA settings with tabbed density | **Popup** | High-value expert controls; rail-incompatible form density |
| `CompactNOAAControls.tsx` | Compact control module used by legacy popup/panel surfaces | **Fence** | Keep as temporary compatibility adapter while rail-era popup controls are normalized |
| `GlobeControls.tsx` | Small overlay/action controls module | **Fence** | Some actions still useful; evaluate merge into modern quick-action popup and then retire |
| `NOAAPopup.tsx` | Legacy popup wrapper with limited/no active mounting evidence in primary flow | **Retire** | Wrapper is redundant once popup manager-driven surfaces are formalized |
| `MegaCategoryPanel.tsx` | Legacy large container, weak mounting evidence in current runtime | **Retire** | Contradicts narrow-rail architecture and duplicates modern mode flow |
| `DetailedNOAAControls.tsx` | Empty placeholder | **Retire** | No implementation value |
| `EnhancedVisualizationModeControls.tsx` | Empty placeholder | **Retire** | No implementation value |
| `MiniMap.tsx` | Empty/unused surface | **Retire** | No implementation value; outside target IA |
| `TinyGlobe.tsx` | Mounted legacy mini-globe visual | **Retire** | Redundant with main globe; consumes valuable rail space with low interaction value |

## Additional Notes on Dependencies
- `CompactNOAAControls` currently composes `DeepSettingsPanel`; this is a key bridge dependency during migration.
- `NOAAVisualizationStatus` depends on NOAA visualization manager hooks and can remain as popup content without rail embedding.
- `CyberInvestigationHub` already has modal-style interaction semantics and is a low-risk popup salvage target.

## Migration Guardrails
- No legacy panel should be re-homed as a persistent rail-width panel.
- Popup salvage should preserve behavior, not legacy layout.
- Fence-class modules require explicit removal criteria and a deprecation checkpoint.

## Exit Criteria for Fence-Class Modules
`CompactNOAAControls.tsx` and `GlobeControls.tsx` can be retired once:
1. rail-triggered popup controls cover required NOAA and globe actions,
2. no production path imports the fence modules,
3. status and deep settings are reachable through modern popup entry points.
