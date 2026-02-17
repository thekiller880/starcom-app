# 07 Popup Migration Spec

## Purpose
Define how dense sidebar behaviors move into popup-driven flows.

## Migration Principles
- Preserve behavior, not legacy layout.
- Launch from rails, execute in popup.
- Keep rail content shallow and action-oriented.

## Priority Popup Migrations
### Investigation and workflow depth
- Source: CyberInvestigationHub
- Target: popup workflow module
- Entry points: left/right rail action buttons as assigned

### NOAA deep controls
- Source: DeepSettingsPanel and related controls
- Target: NOAA control popup surfaces
- Bridge allowed: CompactNOAAControls (temporary)

### Status detail cards
- Source: GlobeStatus + NOAAVisualizationStatus
- Target: status popups/cards
- Trigger: context-aware status action

## Bridge Policy
- Fence modules are allowed only with explicit retirement criteria.
- Bridge modules must be listed in legacy retirement ledger.
- No new bridge module may be introduced without decision log entry.

## Popup UX Rules
- Backdrop close enabled unless destructive workflow in progress
- Keyboard support required (Escape close, focus trap)
- Header includes title, status context, and close control

## Exit Criteria
- Required dense workflows reachable without legacy sidebar tabs
- Popup paths verified under embedded runtime baseline
- Bridge module count reduced per phase plan

## Per-Flow Migration Checklist
For each migrated flow, document:
- Source module and source trigger
- Target popup module and target trigger
- Required context dependencies
- Equivalent user outcomes preserved
- Validation evidence link

## Fence Module Retirement Controls
- Fence modules must be tagged in retirement ledger.
- Fence modules must have explicit removal phase.
- Fence modules cannot gain new features beyond compatibility scope.

## Popup Performance and Stability Notes
- Avoid mounting heavy popup content until opened.
- Ensure cleanup handlers run on close.
- Validate repeated open/close cycles for memory/state leakage.

## Accessibility Verification for Popups
- Focus trap enters and exits correctly.
- Escape close works in all popup categories.
- Popup heading and action controls are screen-reader discoverable.
