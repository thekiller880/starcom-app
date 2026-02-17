# 09 - Gate-to-File Map and PR Chunk Plan (Final Audit)

## Purpose
Translate the approved gate model (`G0`, `G1`, `P1`..`P7`) into concrete file scopes and recommended PR chunk boundaries.

This is audit-only planning guidance.

## Usage
- Treat each PR chunk as a merge unit.
- Do not advance to the next chunk until the listed gate check is satisfied.
- Keep diffs narrowly scoped to the listed files.

---

## Chunk 0 — Contract Freeze (`G0`, `G1`)

### Goal
Freeze naming/vocabulary and embedded acceptance baseline before UI edits.

### Primary files to update (docs/config only)
- `docs/cybercommand/sidebar-rebuild/audit/03-rebuild-rails-target-map.md`
- `docs/cybercommand/sidebar-rebuild/audit/04-rail-naming-and-button-conventions.md`
- `docs/cybercommand/sidebar-rebuild/audit/08-implementation-sequence-and-deletion-gates.md`

### Gate checks
- `G0`: one canonical term for CyberCommand secondary mode #4 across docs.
- `G1`: explicit statement of embedded-only vs embedded+standalone acceptance.

---

## Chunk 1 — New Rails Introduction (`P1`)

### Goal
Introduce new rails while keeping legacy modules available for fallback.

### Primary runtime files
- `src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx`
- `src/components/HUD/Common/VisualizationModeInterface/VisualizationModeInterface.tsx`
- `src/components/HUD/Common/VisualizationModeInterface/PrimaryModeSelector.tsx`
- `src/components/HUD/Common/VisualizationModeInterface/SecondaryModeSelector.tsx`
- `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx`

### Supporting contract files
- `src/context/VisualizationModeContext.tsx`
- `src/context/RightSideBarContext.tsx`

### Gate checks
- `P1`: primary/secondary/tertiary selection works via new rail ownership model.
- `P1`: no active dependence on legacy mode-control components.

---

## Chunk 2 — Popup Migration (`P2`)

### Goal
Move dense controls/workflows into popup surfaces.

### Popup infrastructure and launch points
- `src/components/Popup/PopupManager.tsx`
- `src/components/SpaceWeather/SpaceWeatherControlSurface.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx`

### Legacy behavior sources to migrate
- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx`
- `src/components/HUD/Bars/CyberCommandLeftSideBar/DeepSettingsPanel.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx`
- `src/components/HUD/Bars/CyberCommandLeftSideBar/CompactNOAAControls.tsx` (bridge-only)

### Gate checks
- `P2`: dense workflows reachable through popup entry points.
- `P2`: no new persistent wide side-panel content.

---

## Chunk 3 — Right Rail Placeholder Retirement (`P3`)

### Goal
Remove placeholder-only right-side tab behavior and align to final rail IA.

### Primary files
- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx`
- `src/context/RightSideBarContext.tsx`

### Gate checks
- `P3`: placeholder tab bodies replaced with real content or popup launch affordances.
- `P3`: right rail scope limited to primary aesthetic ownership.

---

## Chunk 4 — Deletion Wave 1 (Safe/Empty) (`P4`)

### Goal
Delete empty and obsolete artifacts first.

### Target deletions
- `src/components/HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx`
- `src/components/HUD/MiniMap/MiniMap.tsx`
- `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx`
- `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt`

### Gate checks
- `P4`: no import references remain.
- `P4`: type/build checks remain clean.

---

## Chunk 5 — Deletion Wave 2 (Behavioral) (`P5`)

### Goal
Retire legacy behavioral modules only after replacements are verified.

### Target deletions/retirements
- `src/components/HUD/Panels/MegaCategoryPanel.tsx`
- `src/components/HUD/Popups/NOAAPopup.tsx`
- `src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx`
- `src/components/HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx`
- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx` (if fully replaced)

### Gate checks
- `P5`: each retired module has a validated replacement path.
- `P5`: no user-visible regression for primary CyberCommand flows.

---

## Chunk 6 — TinyGlobe Retirement (`P6`)

### Goal
Remove TinyGlobe from rail composition.

### Primary files
- `src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx`
- `src/components/TinyGlobe/TinyGlobe.tsx` (and related style/tests as needed)

### Gate checks
- `P6`: left rail remains fully usable without TinyGlobe.
- `P6`: no regression in mode switching or status affordances.

---

## Chunk 7 — Hardening and Type Cleanup (`P7`)

### Goal
Eliminate active-path legacy type bypasses and stale naming drift.

### Priority files
- `src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx` (if still present)
- `src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx` (if still present)
- `src/components/HUD/Common/VisualizationModeInterface/SecondaryModeSelector.tsx`
- `src/context/VisualizationModeContext.tsx`
- `src/types/CyberCommandVisualization.ts`

### Gate checks
- `P7`: active rebuild path free of legacy `@ts-nocheck` dependencies.
- `P7`: UI vocabulary no longer split between `Satellites` and `NetworkInfrastructure`.

---

## Recommended Merge Order
1. Chunk 0 (contracts)
2. Chunk 1 (rails baseline)
3. Chunk 2 (popup migration)
4. Chunk 3 (right rail cleanup)
5. Chunk 4 (safe deletions)
6. Chunk 5 (behavioral deletions)
7. Chunk 6 (TinyGlobe retirement)
8. Chunk 7 (hardening)

## Final Program Exit
The rebuild is considered complete when all gate checks (`G0`, `G1`, `P1`..`P7`) are closed and the active CyberCommand embedded route passes acceptance without legacy sidebar fallbacks.