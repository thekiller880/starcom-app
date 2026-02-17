# 09 Phase Plan and Gates

## Purpose
Define execution phases, gate criteria, and phase sequencing.

## Gate Keys
- G0: canonical terminology freeze
- G1: runtime baseline freeze
- P1-P7: delivery phases

## Phase Sequence
### Phase P1: Rail shell introduction
- Deliver right, left, and sub-rail structure
- Keep legacy modules available for fallback
- Exit: core mode switching operates through new rail ownership

### Phase P2: Popup migration
- Move dense controls to popup surfaces
- Exit: dense workflows reachable without wide rail panels

### Phase P3: Right rail cleanup
- Remove placeholder-heavy right tab behaviors
- Exit: right rail role-pure for primary mode ownership

### Phase P4: Deletion wave 1 (safe/empty)
- Delete empty and obsolete artifacts
- Exit: no references, build/type health unchanged

### Phase P5: Deletion wave 2 (behavioral)
- Retire legacy behavioral modules with validated replacements
- Exit: no primary workflow regression

### Phase P6: TinyGlobe retirement
- Remove TinyGlobe from active left composition
- Exit: rails complete without mini-globe dependency

### Phase P7: Hardening
- Remove active-path drift and legacy bypasses
- Exit: clean contracts and stable acceptance

## Gate Closure Requirements
- Requirements mapping updated
- Validation evidence recorded
- Risk review complete for phase scope
- Decision log updated for any deviations

## Gate Evidence Package
Each gate closure must include:
- In-scope requirement IDs and final status
- Validation artifact links
- Regression summary
- Open issues list with severity and owner

## Phase Dependency Rules
- P2 cannot start before P1 ownership boundaries are stable.
- P4 deletion wave cannot start before P2/P3 replacement validation.
- P6 TinyGlobe retirement cannot start before P1-P3 interaction parity.
- P7 hardening cannot close with unresolved naming drift in active path.

## Blocker Classification
- Blocker: breaks gate-required functionality or acceptance baseline
- Major: significant regression with workaround; gate owner decision required
- Minor: non-blocking defect with planned follow-up

## Gate Review Roles
- Engineering lead: implementation and risk sign-off
- QA lead: validation evidence sign-off
- Architecture owner: ownership-boundary and contract sign-off

## Gate Closure Records

### G0 - Canonical Terminology Freeze
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-009`
- Evidence:
	- Canonical term decision captured in `DEC-001` (`docs/sidebar-rebuild/15-change-control-and-decision-log.md`).
	- Active UI contracts use canonical `Satellites` wording in rail/selector surfaces.
- Regression summary:
	- No active-path split terminology remains in tracked UI contracts.
- Open issues:
	- None.

### G1 - Runtime Baseline Freeze
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-008`
- Evidence:
	- Embedded-primary baseline decision captured in `DEC-002` (`docs/sidebar-rebuild/15-change-control-and-decision-log.md`).
	- Validation plan and cutover guidance continue to enforce embedded acceptance as gate baseline.
- Regression summary:
	- Baseline policy remained stable throughout P1-P7 execution.
- Open issues:
	- None.

### P1 - Rail Architecture Implementation
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-001`, `R-002`, `R-003`, `R-010`
- Evidence:
	- `src/components/HUD/Bars/CyberCommandRails/CyberCommandRightSideRail.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/CyberCommandLeftSideRail.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/CyberCommandLeftSideSubRail.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/__tests__/CyberCommandRightSideRail.test.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/__tests__/CyberCommandLeftSideRail.test.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/__tests__/CyberCommandLeftSideSubRail.test.tsx`
	- `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0)
- Regression summary:
	- Rail ownership boundaries validated with interaction tests.
	- Keyboard navigation and `aria` state coverage added for right/left rails.
	- Sub-rail phantom-width regression fixed with conditional layout slot mounting.
- Open issues:
	- No P1 blockers.
	- P2/P3 work (dense workflow popup migration and right rail placeholder retirement) remains planned.

### P2/P3 - Popup Migration and Right Rail Cleanup
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-001`, `R-004`, `R-010`
- Evidence:
	- `src/components/HUD/Popups/InvestigationWorkflowPopup.tsx`
	- `src/components/HUD/Popups/NOAAStatusPopup.tsx`
	- `src/components/HUD/Popups/NOAADeepControlsPopup.tsx`
	- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/CyberCommandRightSideRail.tsx`
	- `src/components/HUD/Bars/CyberCommandRightSideBar/__tests__/CyberCommandRightSideBar.test.tsx`
	- `src/components/HUD/Bars/CyberCommandRails/__tests__/CyberCommandRightSideRail.test.tsx`
	- `src/components/HUD/Popups/__tests__/NOAAStatusPopup.test.tsx`
	- `src/components/HUD/Popups/__tests__/NOAADeepControlsPopup.test.tsx`
	- `src/components/Popup/__tests__/PopupManager.test.tsx`
	- P2/P3 validation bundle pass (`20/20`) + `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0)
- Regression summary:
	- Dense workflow/status surfaces are popup-routed and no longer depend on placeholder-only right-tab bodies.
	- Right rail role-purity contract is enforced with explicit regression assertions (no secondary/tertiary controls in right rail).
	- Popup lifecycle coverage includes Escape close, focus return, and repeated open/close stability.
- Open issues:
	- No P2/P3 blockers.
	- P4/P5 deletion waves remain planned for legacy module retirement.

### P4 - Deletion Wave 1 (Safe/Empty)
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-006`
- Evidence:
	- Deleted wave-1 empty placeholders:
		- `src/components/HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx`
		- `src/components/HUD/MiniMap/MiniMap.tsx`
	- Deleted obsolete layout artifacts:
		- `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx`
		- `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt`
	- Reference scan after deletion confirms no remaining source references for deleted targets.
	- `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0)
	- `npm run build` completes successfully (no build blockers).
- Regression summary:
	- Safe/empty artifact removal introduces no compile/build regressions.
	- Active embedded runtime composition remains on `CyberCommandHUDLayout.tsx` and unaffected by obsolete artifact retirement.
- Open issues:
	- No P4 blockers.
	- P5 behavioral-module retirement was completed in a subsequent closure slice.

### P5 - Deletion Wave 2 (Behavioral)
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-007`
- Evidence:
	- Behavioral retirement targets are removed from source tree:
		- `src/components/HUD/Panels/MegaCategoryPanel.tsx`
		- `src/components/HUD/Popups/NOAAPopup.tsx`
		- `src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx`
		- `src/components/HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx`
		- `src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx`
	- Terminal existence scan confirms all listed modules are `MISSING`.
	- Targeted replacement-path validation passes via terminal Jest run:
		- `src/components/HUD/Bars/CyberCommandRightSideBar/__tests__/CyberCommandRightSideBar.test.tsx`
		- `src/components/HUD/Bars/CyberCommandRails/__tests__/CyberCommandRightSideRail.test.tsx`
		- `src/components/HUD/Popups/__tests__/NOAAStatusPopup.test.tsx`
		- `src/components/HUD/Popups/__tests__/NOAADeepControlsPopup.test.tsx`
		- `src/components/Popup/__tests__/PopupManager.test.tsx`
	- Validation bundle result: `5/5` suites, `12/12` tests passing.
	- `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0)
	- `npm run build` completes successfully (no build blockers).
- Regression summary:
	- Legacy behavioral surfaces are retired while popup-era replacement workflows remain active for status/intel/deep-controls paths.
	- No user-facing regressions were detected in primary CyberCommand workflows covered by targeted rail/popup tests.
	- Compile/build health remains stable after behavioral retirement wave closure.
- Open issues:
	- No P5 blockers.
	- Follow-on hardening work was completed and closed in P7.

### P6 - TinyGlobe Retirement
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-005`
- Evidence:
	- `src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx` removes TinyGlobe mount from left sidebar composition.
	- `src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.module.css` removes TinyGlobe-specific style blocks tied to legacy mount container.
	- Active layout remains rail-based via `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx` (no legacy left-sidebar runtime mount).
	- Source scan: `TinyGlobe` references are limited to TinyGlobe-local component/test and legacy documentation artifacts; no active-path import/mount.
	- `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0)
	- `npm run build` completes successfully (no build blockers).
- Regression summary:
	- Left rail composition remains functionally complete without mini-globe surface.
	- Primary/secondary/tertiary discoverability remains on compact rails and popup launch points.
	- No compile/build regressions introduced by TinyGlobe retirement slice.
- Open issues:
	- No P6 blockers.
	- P7 terminology/type cleanup was completed in subsequent hardening slices.

### P7 - Hardening and Type Cleanup
- Date: 2026-02-13
- Status: Closed
- In-scope requirements: `R-008`, `R-009`
- Evidence:
	- Active-path hardening removes `@ts-nocheck` reliance in `src/context/SpaceWeatherContext.tsx` and `src/components/SpaceWeather/SpaceWeatherControlSurface.tsx`.
	- CyberCommand terminology/type contract hardening applies canonical `Satellites` naming in `src/types/CyberCommandVisualization.ts` and aligned data-service generation path (`src/services/CyberCommandDataService.ts`, `src/services/cyberCommand/MockDataGenerator.ts`).
	- Monolithic service split keeps touched implementation modular: `CyberCommandDataService.ts` (`428` lines) + extracted `cyberCommand/MockDataGenerator.ts` (`131` lines).
	- Embedded acceptance matrix passes in terminal (`npx jest` bundle across rail/popup suites => `7/7` suites, `20/20` tests).
	- Focused hardening suite passes in terminal (`npx vitest run src/services/__tests__/CyberCommandDataService.test.ts` => `1/1` file, `15/15` tests).
	- `npx tsc --noEmit --project tsconfig.starcom.json` (exit code 0).
	- `npm run build` completes successfully (no build blockers).
- Regression summary:
	- Active rail/popup ownership behavior remains stable after hardening and modularization slices.
	- UI-contract terminology drift is resolved for tracked P7 surfaces with canonical `Satellites` labels.
	- Compile/build and targeted acceptance suites indicate no blocker regressions in embedded baseline scope.
- Open issues:
	- No P7 blockers.
	- Program closeout documentation tasks remain in Stage 5.2.

## Hardening Backlog - Terminology Drift Inventory

Tracked legacy `NetworkInfrastructure` references to resolve during P7:
- No active UI-contract drift items remain in the tracked P7 target set.

P7 hardening slice status:
- Active-path SpaceWeather rail dependencies (`SpaceWeatherContext`, `SpaceWeatherControlSurface`) no longer rely on `@ts-nocheck`.
- Active UI selector terminology now uses canonical `Satellites` wording.
- Shared CyberCommand type/service contracts now use canonical `Satellites` terminology; legacy generator aliasing is internal compatibility-only and not part of active UI contracts.

Note: service/type references may remain internal where semantically valid, but active UI vocabulary must remain canonical (`Satellites`).
