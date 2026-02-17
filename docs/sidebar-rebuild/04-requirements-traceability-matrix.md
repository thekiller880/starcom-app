# 04 Requirements Traceability Matrix

## Purpose
Track every rebuild requirement from definition to implementation and validation.

## Status Legend
- Not Started
- In Progress
- Implemented
- Validated
- Closed

## Requirement Table
| ID | Requirement | Priority | Implementation Area | Validation Method | Status | Owner |
|---|---|---|---|---|---|---|
| R-001 | Right rail owns primary mode only | High | Right rail component | UI behavior + integration test | Validated | Sidebar rebuild lead |
| R-002 | Left rail owns secondary mode only | High | Left rail component | UI behavior + integration test | Validated | Sidebar rebuild lead |
| R-003 | Left sub-rail appears contextually | High | Sub-rail + SW layout | Mode switch scenario test | Validated | Sidebar rebuild lead |
| R-004 | Dense controls are popup-based | High | Popup migration | Popup launch + workflow smoke | Validated | Sidebar rebuild lead |
| R-005 | TinyGlobe retired | High | Left rail cleanup | No mount reference + UX smoke | Validated | Sidebar rebuild lead |
| R-006 | Empty placeholders removed | Medium | Deletion waves | Reference scan + build check | Validated | Sidebar rebuild lead |
| R-007 | Legacy behavioral modules retired safely | High | Deletion wave 2 | Replacement path checklist | Validated | Sidebar rebuild lead |
| R-008 | Embedded runtime baseline passes | High | End-to-end validation | Embedded acceptance suite | Validated | Sidebar rebuild lead |
| R-009 | Canonical terminology enforced | Medium | Context + UI labels | Lint/search + review | Validated | Sidebar rebuild lead |
| R-010 | Accessibility labels and active states complete | High | All rails | Accessibility checklist + keyboard test | Validated | Sidebar rebuild lead |

## Mapping Notes
- Requirement IDs must be referenced in PR descriptions.
- No requirement may be marked Closed without evidence link.
- Any new requirement must be added here before implementation begins.

## Evidence Log Template
| Requirement ID | Evidence Type | Link/Reference | Reviewer | Date |
|---|---|---|---|---|
| R-001 | Implementation + test | `CyberCommandRightSideRail.tsx` + `CyberCommandRightSideRail.test.tsx` | Engineering lead | 2026-02-13 |
| R-001 | P3 role-purity regression proof | `CyberCommandRightSideRail.test.tsx` verifies no secondary/tertiary controls in right rail and popup actions do not mutate primary mode | Engineering lead | 2026-02-13 |
| R-002 | Implementation + test | `CyberCommandLeftSideRail.tsx` + `CyberCommandLeftSideRail.test.tsx` | Engineering lead | 2026-02-13 |
| R-003 | Implementation + test | `CyberCommandLeftSideSubRail.tsx` + `CyberCommandLeftSideSubRail.test.tsx` | Engineering lead | 2026-02-13 |
| R-010 | Accessibility + keyboard tests | rail `aria-*` assertions + arrow-key navigation tests | QA lead | 2026-02-13 |
| R-004 | Migration slice + rail launch wiring | `InvestigationWorkflowPopup.tsx`, `NOAAStatusPopup.tsx`, `NOAADeepControlsPopup.tsx` + right-rail popup launch wiring + popup/rail tests | Engineering lead | 2026-02-13 |
| R-004 | Popup lifecycle/accessibility hardening | `PopupManager.tsx` Escape-close + focus-return behavior; `PopupManager.test.tsx` repeated open/close stability; `NOAAStatusPopup.test.tsx` unavailable-context affordance hiding | Engineering lead | 2026-02-13 |
| R-004 | Right-tab placeholder replacement with popup affordances (P3 slice) | `CyberCommandRightSideBar.tsx` removes placeholder-only tab bodies and maps status/intel/controls to popup launch workflows; `CyberCommandRightSideBar.test.tsx` verifies routing and retired placeholder-only controls | Engineering lead | 2026-02-13 |
| R-005 | P6 TinyGlobe retirement validation | `CyberCommandLeftSideBar.tsx` removes TinyGlobe mount + `CyberCommandLeftSideBar.module.css` TinyGlobe-style retirement; source scan confirms no active-path TinyGlobe imports/mounts; `npx tsc --noEmit --project tsconfig.starcom.json` + `npm run build` pass | Engineering lead | 2026-02-13 |
| R-006 | P4 safe/empty deletion wave | Deleted empty placeholder/obsolete layout artifacts + post-delete reference scan + `npx tsc --noEmit --project tsconfig.starcom.json` + `npm run build` | Engineering lead | 2026-02-13 |
| R-007 | P5 behavioral retirement wave validation | Behavioral legacy targets removed (`MegaCategoryPanel.tsx`, `NOAAPopup.tsx`, `ModeSettingsPanel.tsx`, `VisualizationModeButtons.tsx`, `VisualizationModeControls.tsx`, `GlobeStatus.tsx`, `NOAAVisualizationStatus.tsx`, `CyberInvestigationHub.tsx`) + source existence scan (`MISSING`) + targeted replacement-path Jest run (`5/5` suites, `12/12` tests) + `npx tsc --noEmit --project tsconfig.starcom.json` + `npm run build` | Engineering lead | 2026-02-13 |
| R-008 | P7 embedded acceptance matrix pass | Embedded matrix run passes in terminal (`7/7` suites, `20/20` tests) across rail ownership, tertiary visibility, popup workflow/lifecycle, plus baseline compile/build checks (`npx tsc --noEmit --project tsconfig.starcom.json`, `npm run build`) | Engineering lead | 2026-02-13 |
| R-009 | P7 active-UI terminology hardening slice | Active selector terminology normalized to `Satellites` in `SecondaryModeSelector.tsx`; active-path hardening pass includes `npx tsc --noEmit --project tsconfig.starcom.json`, `npm run build`, and focused rail ownership tests (`2/2` suites, `9/9` tests) | Engineering lead | 2026-02-13 |
| R-009 | P7 terminology/type contract completion | `CyberCommandVisualization.ts` and `CyberCommandDataService.ts` canonicalize `Satellites` contract naming (legacy generator alias retained for internal compatibility), with contract tests passing via `npx jest src/types/__tests__/CyberCommandVisualization.test.ts --runInBand` and `npx vitest run src/services/__tests__/CyberCommandDataService.test.ts` | Engineering lead | 2026-02-13 |

## Requirement Lifecycle Workflow
1. Define requirement with stable ID and priority.
2. Assign implementation area and owner.
3. Attach validation method before coding.
4. Mark Implemented only after code merge.
5. Mark Validated only after evidence review.
6. Mark Closed only when no open blocker references remain.

## Quality Gate Rules
- High-priority requirements cannot be deferred without decision log entry.
- A phase gate cannot close if any in-scope high-priority requirement is below Validated.
- Deferred requirements must include explicit target phase and owner.

## Suggested Requirement Categories
- Architecture contract
- Interaction ownership
- Accessibility
- Migration/retirement
- Regression prevention

## Reporting Snapshot Fields
- Total requirements
- Requirements by status
- High-priority open count
- Validation debt count
