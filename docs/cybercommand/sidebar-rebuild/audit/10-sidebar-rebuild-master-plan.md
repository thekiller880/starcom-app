# 10 - Sidebar Rebuild Master Plan

## Purpose
Provide a single comprehensive execution plan for rebuilding the CyberCommand sidebars using the completed audit package.

This plan is implementation-focused but documentation-only.

## Plan Outcomes
- Replace legacy sidebar model with three-rail architecture:
  - CyberCommandLeftSideRail
  - CyberCommandLeftSideSubRail
  - CyberCommandRightSideRail
- Preserve stable behavior from current active systems (mode context, space weather tertiary, popup infrastructure).
- Remove legacy and empty surfaces in controlled waves with explicit gate checks.
- Deliver a mobile-first, narrow-rail UX without reintroducing wide fixed panel stacks.

## Guiding Decisions (Program Constants)

### D1. Canonical Component Names
The rebuild must use these exact names:
- CyberCommandLeftSideRail
- CyberCommandLeftSideSubRail
- CyberCommandRightSideRail

### D2. Canonical Secondary Mode Vocabulary
Use Satellites as the canonical CyberCommand secondary mode label in UI contracts.

Reason:
- Active context and live globe integrations already use Satellites.
- Legacy NetworkInfrastructure naming remains in older modules and type artifacts and should be migrated/retired.

### D3. Runtime Acceptance Baseline
Primary acceptance baseline is embedded CyberCommand runtime, since active routes mount HUD layout with isEmbedded=true.

Secondary acceptance (optional but recommended):
- standalone harness parity checks for any retained non-embedded flows.

## Scope Boundaries

### In Scope
- Left and right sidebar runtime shells
- Rail state and rendering ownership
- Mode selection presentation and interaction in rails
- SpaceWeather tertiary integration in left sub-rail
- Popup migration for dense legacy controls
- Deletion/retirement of legacy and empty sidebar modules

### Out of Scope
- Globe rendering subsystem rewrite
- Top bar feature redesign (except hook-up points impacted by rail changes)
- Non-CyberCommand applications
- New thematic design system invention

## Target Architecture

### CyberCommandRightSideRail (Primary Aesthetic)
- Owns only primary mode switching:
  - CyberCommand
  - GeoPolitical
  - EcoNatural
- Hosts compact icon controls only.
- Must not host dense tabbed content bodies.
- Any deep controls launch popup modules.

### CyberCommandLeftSideRail (Secondary Functional)
- Owns secondary mode switching for active primary mode.
- Uses compact icon-first controls.
- Provides launch points to dense feature popups where needed.

### CyberCommandLeftSideSubRail (Contextual Tertiary)
- Appears only when selected secondary mode exposes tertiary depth.
- Phase 1 target: EcoNatural -> SpaceWeather.
- Reuses SpaceWeather layer selector and bundle model.

## Reuse Strategy

### Preserve As-Is (core contracts)
- VisualizationModeContext
- PrimaryModeSelector and SecondaryModeSelector logic patterns
- SpaceWeatherSidebarLayout and layer registry ecosystem
- PopupManager

### Preserve With Adaptation
- SpaceWeatherControlSurface and settings container as sub-rail compatible modules
- Right-side status surfaces converted to popup cards
- CompactNOAAControls only as temporary bridge module

### Retire
- TinyGlobe and MiniMap surfaces
- non-mounted legacy side panel modules
- empty placeholder modules and obsolete layout artifacts

## Execution Plan by Phase

### Phase 0 - Contract Freeze
Deliverables:
- Lock component names and Satellites vocabulary across planning artifacts.
- Confirm embedded-only acceptance baseline and optional standalone parity policy.

Exit Criteria:
- No planning artifact references mixed secondary mode terms.
- Stakeholder sign-off on acceptance baseline.

### Phase 1 - Rail Shell Introduction
Deliverables:
- Introduce CyberCommandRightSideRail with primary mode ownership only.
- Introduce CyberCommandLeftSideRail with secondary mode ownership only.
- Introduce CyberCommandLeftSideSubRail for SpaceWeather tertiary context.

Exit Criteria:
- Primary, secondary, tertiary switching fully functional through new rails.
- Active path does not depend on legacy mode control components.

### Phase 2 - Dense Control Popup Migration
Deliverables:
- Migrate dense NOAA and investigation/status experiences into popup surfaces.
- Keep bridge adapters only where needed for transition continuity.

Exit Criteria:
- No dense controls are embedded in narrow rails.
- Required workflows are reachable from rail launch points.

### Phase 3 - Right Rail Placeholder Retirement
Deliverables:
- Remove placeholder-only tab body behavior from current right sidebar model.
- Align right rail strictly to primary aesthetic ownership and popup launch controls.

Exit Criteria:
- Placeholder text bodies are removed or replaced with real launchable behavior.
- Right rail remains compact and role-pure.

### Phase 4 - Deletion Wave 1 (Safe/Empty)
Deliverables:
- Delete empty files and obsolete layout artifacts.

Exit Criteria:
- No imports remain.
- Build/type checks unchanged in health.

### Phase 5 - Deletion Wave 2 (Behavioral Legacy)
Deliverables:
- Delete retired behavioral modules after validated replacement path coverage.

Exit Criteria:
- Every retired module has equivalent or intentionally removed user path documented.
- No regression in primary CyberCommand user workflows.

### Phase 6 - TinyGlobe Retirement
Deliverables:
- Remove TinyGlobe from left rail composition.

Exit Criteria:
- No UX dependency remains on mini-globe.
- Left rail remains complete and usable.

### Phase 7 - Hardening and Type Recovery
Deliverables:
- Eliminate active-path reliance on legacy ts-nocheck modules.
- Complete naming drift cleanup for retired vocabulary references.

Exit Criteria:
- Active rail path is type-safe and vocabulary-consistent.

## File-Level Work Packages

### Core Runtime Shells
- src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx

### Mode and Context Contracts
- src/context/VisualizationModeContext.tsx
- src/context/RightSideBarContext.tsx
- src/components/HUD/Common/VisualizationModeInterface/PrimaryModeSelector.tsx
- src/components/HUD/Common/VisualizationModeInterface/SecondaryModeSelector.tsx
- src/components/HUD/Common/VisualizationModeInterface/VisualizationModeInterface.tsx

### Tertiary SpaceWeather System
- src/components/SpaceWeather/SpaceWeatherSidebarLayout.ts
- src/components/SpaceWeather/SpaceWeatherLayerSelector.tsx
- src/components/SpaceWeather/SpaceWeatherControlSurface.tsx
- src/components/SpaceWeather/SpaceWeatherSettingsContainer.tsx

### Popup and Dense Workflow Migration
- src/components/Popup/PopupManager.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/CompactNOAAControls.tsx (bridge)
- src/components/HUD/Bars/CyberCommandLeftSideBar/DeepSettingsPanel.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx

### Retirement Targets
- src/components/TinyGlobe/TinyGlobe.tsx
- src/components/HUD/MiniMap/MiniMap.tsx
- src/components/HUD/Panels/MegaCategoryPanel.tsx
- src/components/HUD/Popups/NOAAPopup.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx
- src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx
- src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt

## Acceptance and Validation Matrix

### Functional Acceptance
1. Primary mode switching works from right rail only.
2. Secondary mode switching works from left rail only.
3. Tertiary rail appears only for eligible secondary modes.
4. Dense controls open in popup surfaces, not rail body panes.
5. SpaceWeather tertiary flows remain functional end-to-end.

### UX Acceptance
1. Portrait-width layout remains usable with all three rails.
2. No fixed-width legacy panel stacks are present.
3. Icon buttons include accessible labels and active states.

### Technical Acceptance
1. No references to retired legacy files after deletion phases.
2. Build and type-check pass after each chunk.
3. Active runtime path is free of legacy ts-nocheck dependencies for sidebar behavior.

## Risk Register and Mitigations

### R1. Vocabulary Drift (Satellites vs NetworkInfrastructure)
Risk:
- Inconsistent behavior and type confusion during migration.

Mitigation:
- Enforce Satellites in UI contracts and migrate residual references during hardening phase.

### R2. Embedded-Only Blind Spots
Risk:
- Features gated behind non-embedded paths regress unnoticed.

Mitigation:
- Explicitly track embedded baseline and run optional standalone parity checks before deleting bridge modules.

### R3. Legacy Module Hidden Dependencies
Risk:
- Deleting legacy files breaks rarely used paths.

Mitigation:
- Two-wave deletion strategy with reference scans and gate checks before each deletion merge.

### R4. Overloading Rails With Dense Content
Risk:
- Rebuild drifts back to wide side panels.

Mitigation:
- Enforce anti-drift rule: dense content must be popup-based.

## Rollback Strategy
- Keep each phase in separate PR chunk.
- If regression appears, revert only the latest chunk.
- Do not combine deletion waves with rail introduction in a single merge.

## Delivery Cadence Recommendation
- Execute in the merge order defined in document 09.
- Require gate sign-off at the end of each chunk.
- Maintain a running change log in this audit folder for every merged chunk.

## Definition of Done
Sidebar rebuild is complete when:
- All gates G0, G1, P1 through P7 are closed.
- Embedded CyberCommand runtime passes functional and UX acceptance.
- Legacy sidebar architecture is fully retired or explicitly fenced with dated removal commitments.