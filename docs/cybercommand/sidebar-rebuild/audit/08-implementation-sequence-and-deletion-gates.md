# 08 - Implementation Sequence and Deletion Gates (Audit-Only)

## Purpose
Define a strict, low-risk execution order for the Cyber Command rail rebuild based on the exhaustive review.

This is planning-only guidance. No runtime behavior is changed by this document.

## Guardrail 0: Canonical Contracts (must freeze before UI work)

### 0.1 Canonical naming (already agreed)
- `CyberCommandLeftSideRail`
- `CyberCommandLeftSideSubRail`
- `CyberCommandRightSideRail`

### 0.2 Canonical mode vocabulary (must resolve first)
Current code contains mixed naming across legacy and active surfaces:
- active mode context uses `Satellites`
- legacy surfaces/types still reference `NetworkInfrastructure`

**Decision Gate G0**
- Choose one canonical label for CyberCommand secondary mode #4.
- Update audit artifacts to that single term.
- Block implementation if vocabulary remains split.

### 0.3 Embedded behavior baseline
CyberCommand active route is embedded-first (`isEmbedded=true`), which disables several side systems.

**Decision Gate G1**
- Confirm whether rebuild acceptance is validated in embedded mode only, or in both embedded + standalone harnesses.

---

## Phase 1: Introduce Rails Without Deleting Legacy

Goal:
- Stand up new rail skeletons while preserving existing behavior for fallback.

Scope:
- Introduce new rail components by contract name.
- Right rail handles primary mode only.
- Left rail handles secondary mode only.
- Left sub-rail appears only for tertiary-capable contexts (initially SpaceWeather).

Must reuse:
- Existing `VisualizationModeContext`
- Existing `SpaceWeatherSidebarLayout` and layer selector/control surfaces

**Exit Gate P1**
- Primary/secondary/tertiary switching works via new rails.
- No dependency on legacy `VisualizationModeControls` or `ModeSettingsPanel` for active switching.

---

## Phase 2: Popup Migration of Dense Legacy Functionality

Goal:
- Move dense controls/workflows to popup surfaces, not rail width.

High-priority popup salvage targets:
- `CyberInvestigationHub` behavior
- `DeepSettingsPanel` behavior
- `NOAAVisualizationStatus` / `GlobeStatus` informational surfaces (as on-demand cards)

Bridge allowance:
- `CompactNOAAControls` may be used temporarily as a compatibility adapter.

**Exit Gate P2**
- Dense NOAA/investigation workflows are reachable via popup entry points from new rails.
- No new persistent wide panels added to rails.

---

## Phase 3: Right Rail Placeholder Retirement

Goal:
- Remove placeholder-only right-rail tab behavior and align to rebuild IA.

Current issue:
- Active right sidebar has multiple placeholder sections (`Status Content`, `Intel Content`, etc.).

Required outcome:
- Right rail limited to primary-mode aesthetic ownership.
- Detail/status/intel depth exposed via popup modules, not placeholder tab stack.

**Exit Gate P3**
- Placeholder-only tab bodies are removed or replaced by explicit popup launch points.
- Right rail scope matches architecture contract.

---

## Phase 4: Legacy Surface Deletion Wave 1 (Safe/Empty)

Delete first (lowest risk):
- Empty files:
  - `HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx`
  - `HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx`
  - `HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx`
  - `HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx`
  - `HUD/MiniMap/MiniMap.tsx`
- Obsolete layout artifacts:
  - `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx`
  - `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt`

**Exit Gate P4**
- No imports/usages remain for the deleted files.
- Build/type check unaffected by these deletions.

---

## Phase 5: Legacy Surface Deletion Wave 2 (Behavioral)

Delete/retire after popup migration is verified:
- `HUD/Panels/MegaCategoryPanel.tsx`
- `HUD/Popups/NOAAPopup.tsx`
- `HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx`
- `HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx`
- `HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx`
- `HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx`
- `HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx`
- `HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx` (only if fully replaced by popup-era equivalent)

**Exit Gate P5**
- Every removed behavioral module has a verified replacement path.
- No user-facing workflow regression in CyberCommand primary usage scenarios.

---

## Phase 6: TinyGlobe Retirement

Goal:
- Remove `TinyGlobe` from left rail composition.

Rationale:
- Redundant with center globe and consumes critical rail width budget.

**Exit Gate P6**
- Left rail remains functionally complete without mini-globe.
- No mode-switching or status visibility regression after removal.

---

## Phase 7: Hardening and Type-Safety Recovery

Goal:
- Eliminate reliance on legacy `@ts-nocheck` migration surfaces from the active path.

Priority:
- Any modules still in active runtime composition after rebuild must be typed and contract-clean.

**Exit Gate P7**
- Active rail path is free of legacy `@ts-nocheck` dependencies introduced by old sidebars.

---

## Acceptance Checklist (Program-Level)
- New rails are sole owners of primary/secondary/tertiary navigation.
- Dense controls are popup-based, not persistent wide side panels.
- TinyGlobe and MiniMap legacy surfaces are retired.
- Legacy panel files are removed in two controlled deletion waves.
- Embedded-mode behavior is explicitly validated as the production baseline.
- Mode vocabulary is canonicalized (no split between `Satellites` and `NetworkInfrastructure` in UI contracts).

## Recommended Tracking Method
For implementation phase execution, track each gate (`G0`, `G1`, `P1`..`P7`) as explicit checklist items and block phase transitions until each gate is closed.