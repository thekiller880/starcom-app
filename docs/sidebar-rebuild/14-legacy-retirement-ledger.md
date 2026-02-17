# 14 Legacy Retirement Ledger

## Purpose
Track retirement status of legacy modules with proof of safe replacement.

## Retirement Record Template
| Module | Category | Retirement Phase | Replacement Path | Evidence | Status |
|---|---|---|---|---|---|
| ExampleModule.tsx | Empty/Legacy/Behavioral | P4/P5/P6 | New rail/popup path | Test + reference scan | Planned |
| `src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx` | Placeholder Legacy Right-Tab Bodies | P3 | `CyberCommandRightSideRail.tsx` mode rail + popup launch paths (`InvestigationWorkflowPopup`, `NOAAStatusPopup`, `NOAADeepControlsPopup`) | Placeholder-only `status/intel/controls/chat/apps/developer` bodies retired; `status/intel/controls` now map to explicit popup launch affordances + test coverage in `CyberCommandRightSideBar.test.tsx` | Retired |
| `src/components/HUD/Bars/CyberCommandLeftSideBar/CompactNOAAControls.tsx` | Fence (Bridge) | P5 | `NOAADeepControlsPopup` -> modular NOAA popup controls | `src/components/HUD/Popups/NOAADeepControlsPopup.tsx` + rail/status popup launch wiring | In Migration |
| `src/components/HUD/Bars/CyberCommandLeftSideBar/DeepSettingsPanel.tsx` | Fence Dependency | P5 | Target modular NOAA popup control cards (post-bridge) | Bridge currently reachable only via `CompactNOAAControls` in `NOAADeepControlsPopup` | In Migration |
| `src/components/HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx` | Empty Placeholder | P4 | None (intentional removal) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx` | Empty Placeholder | P4 | None (intentional removal) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx` | Empty Placeholder | P4 | None (intentional removal) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx` | Empty Placeholder | P4 | None (intentional removal) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/components/HUD/MiniMap/MiniMap.tsx` | Empty Placeholder | P4 | None (intentional removal) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx` | Obsolete Layout Artifact | P4 | `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx` | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt` | Obsolete Backup Artifact | P4 | None (backup removed) | Reference scan clear + TypeScript/build validation pass after deletion | Retired |
| `src/components/HUD/Panels/MegaCategoryPanel.tsx` | Behavioral Legacy Panel | P5 | Unified command + rail/popup-driven layout model | Source existence scan confirms removal (`MISSING`) + replacement-path validation bundle pass + TypeScript/build pass | Retired |
| `src/components/HUD/Popups/NOAAPopup.tsx` | Legacy Popup Wrapper | P5 | `NOAAStatusPopup.tsx` + `NOAADeepControlsPopup.tsx` via popup manager | Source existence scan confirms removal (`MISSING`) + NOAA popup route tests pass + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx` | Legacy Left Sidebar Behavioral Control | P5 | Left rail/sub-rail + popup-era settings flows | Source existence scan confirms removal (`MISSING`) + right-rail/popup integration tests pass + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx` | Legacy Left Sidebar Behavioral Control | P5 | `CyberCommandLeftSideRail.tsx` + `CyberCommandLeftSideSubRail.tsx` | Source existence scan confirms removal (`MISSING`) + rail ownership tests pass + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx` | Legacy Right Sidebar Behavioral Control | P5 | `CyberCommandRightSideRail.tsx` ownership + popup launch affordances | Source existence scan confirms removal (`MISSING`) + right-rail role-purity tests pass + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx` | Legacy Right Sidebar Status Surface | P5 | `NOAAStatusPopup.tsx` status card flow | Source existence scan confirms removal (`MISSING`) + NOAA status popup test coverage + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx` | Legacy Right Sidebar Status Surface | P5 | `NOAAStatusPopup.tsx` + `NOAADeepControlsPopup.tsx` | Source existence scan confirms removal (`MISSING`) + popup-route tests pass + TypeScript/build pass | Retired |
| `src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx` | Legacy Investigation Workflow Surface | P5 | `InvestigationWorkflowPopup.tsx` launched from rail/right-sidebar affordances | Source existence scan confirms removal (`MISSING`) + investigation popup route coverage in right-rail/right-sidebar tests + TypeScript/build pass | Retired |
| `src/components/TinyGlobe/TinyGlobe.tsx` | Legacy Left-Rail Mini-Globe Surface | P6 | Active rails + center globe composition (`CyberCommandLeftSideRail`/`CyberCommandLeftSideSubRail` + main globe) | TinyGlobe mount removed from `CyberCommandLeftSideBar.tsx`; TinyGlobe-specific left-sidebar styles retired; source scan shows no active-path TinyGlobe imports/mounts; TypeScript/build validation pass | Retired |

## Planned Wave 1 Targets
- Empty placeholders
- Obsolete fixed/backup layout artifacts

## Planned Wave 2 Targets
- Non-mounted behavioral legacy modules
- Legacy popup wrappers superseded by popup manager flows

## Ledger Rules
- No module is marked Retired without replacement evidence or intentional removal rationale.
- Any fence module must include explicit retirement trigger.
- Ledger is updated in same PR as retirement change.

## Retirement Proof Checklist
For each retired module, capture:
- Last known runtime status (active/legacy/empty)
- Replacement path (or explicit removal intent)
- Reference scan result showing zero remaining imports
- Validation summary proving no critical workflow loss

## Fence Governance
- Fence modules must include owner and target retirement phase.
- Fence modules cannot accept feature expansion.
- Fence module extensions require architecture decision log entry.

## Active Fence Triggers
- `CompactNOAAControls.tsx`
	- Owner: Sidebar rebuild lead
	- Target retirement phase: P5
	- Retirement trigger: NOAA deep controls are available through modular popup controls without direct `CompactNOAAControls` import, and reference scan shows no active-path imports.
- `DeepSettingsPanel.tsx`
	- Owner: Sidebar rebuild lead
	- Target retirement phase: P5
	- Retirement trigger: replacement NOAA deep-settings popup cards cover current preset/apply workflows and `CompactNOAAControls` bridge is retired.

## Retirement Status Labels
- Planned
- In Migration
- Awaiting Validation
- Retired
- Deferred (with reason)
