# 06 Component Contracts

## Purpose
Define implementation contracts for key rebuild components.

## CyberCommandRightSideRail Contract
### Inputs
- active primary mode
- primary mode setter

### Outputs
- primary mode change events

### Rules
- Must not render dense content panes
- Must not own secondary or tertiary writes

## CyberCommandLeftSideRail Contract
### Inputs
- active primary mode
- active secondary mode
- mode mapping data

### Outputs
- secondary mode change events
- optional popup launch events

### Rules
- Must not own primary writes
- Must remain compact/icon-first

## CyberCommandLeftSideSubRail Contract
### Inputs
- tertiary availability
- active tertiary layer
- tertiary layer list

### Outputs
- tertiary layer change events

### Rules
- Hidden when unavailable
- No independent mode ownership

## Popup Contract
### Inputs
- popup descriptor
- launch context

### Outputs
- close event
- optional completion/action events

### Rules
- Popup content owns dense interaction
- Rails only launch, not duplicate popup content

## Context Contracts
### VisualizationMode Context
- Source of truth for primary/secondary mode
- Maintains persisted submode behavior

### Right Sidebar Context
- Temporary bridge state only if required by phase
- Must not block final right rail ownership simplification

## Error/Fallback Contract
- Missing tertiary data: hide sub-rail gracefully
- Missing popup payload: show safe fallback message
- Invalid mode write: reject and preserve prior valid state

## Contract Compatibility Policy
- Contract-breaking changes require decision log entry and versioned migration note.
- Contract-additive changes must be backward compatible within the active phase.
- Temporary bridge contracts must include explicit retirement target phase.

## Validation Checklist by Contract
- Inputs are type-safe and documented.
- Outputs are deterministic and side-effect bounded.
- Ownership boundaries are not violated.
- Fallback behavior is defined and testable.

## Contract Test Expectations
- Right rail: verifies primary-only writes.
- Left rail: verifies secondary-only writes.
- Sub-rail: verifies contextual mount/write behavior.
- Popup: verifies launch/close lifecycle and focus behavior.
