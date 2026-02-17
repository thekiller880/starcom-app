# 03 Target Architecture

## Purpose
Define the intended end-state architecture for sidebar rebuild.

## Three-Rail Model

### CyberCommandRightSideRail
- Responsibility: primary mode switching only
- Controls: CyberCommand, GeoPolitical, EcoNatural
- Constraints: no dense tab stacks; popup launch only for deep controls

### CyberCommandLeftSideRail
- Responsibility: secondary mode switching
- Controls: context-aware secondary buttons for active primary mode
- Constraints: compact, icon-first, touch-safe layout

### CyberCommandLeftSideSubRail
- Responsibility: contextual tertiary controls
- Initial domain: EcoNatural -> SpaceWeather layers
- Visibility: present only when tertiary model exists

## State Ownership Model
- Mode truth source: VisualizationMode context
- Right rail writes primary mode
- Left rail writes secondary mode
- Left sub-rail writes tertiary layer context when applicable
- Popup state managed by global popup manager

## Interaction Model
- Primary change updates visual baseline and preserves last secondary for that primary.
- Secondary change updates operational overlays/tooling.
- Tertiary change updates contextual controls and details surfaces.

## Dense Flow Policy
- Dense forms, status stacks, and investigative workflows open in popup modules.
- Rails remain control rails, not panel canvases.

## Architectural Anti-Patterns
- Reintroducing TinyGlobe/MiniMap into rails
- Reintroducing wide fixed tabbed side panels
- Duplicating ownership of primary/secondary controls across rails

## Extension Path
After SpaceWeather tertiary stabilization, additional tertiary-capable domains may be introduced via the same sub-rail contract without altering right/left ownership boundaries.

## Ownership Matrix (Detailed)

### Write responsibilities
- Right rail: primary mode writes only
- Left rail: secondary mode writes only
- Left sub-rail: tertiary layer writes only
- Popup modules: dense workflow state writes scoped to popup lifecycle

### Read responsibilities
- All rails may read active mode state for display/active-state rendering
- Popups may read mode and context state but must not bypass ownership rules

## State Transition Rules
- Primary mode change must restore last selected secondary mode for that primary.
- Secondary mode change may conditionally mount/unmount sub-rail.
- Tertiary change must not alter primary/secondary state directly.

## Failure Handling
- Invalid mode transitions should no-op with telemetry/log note.
- Missing tertiary definitions should hide sub-rail without error UI noise.
- Popup launch failure should preserve rail operability and surface a non-blocking error state.

## Extension Guardrails
- New tertiary domains must declare:
	- eligibility condition
	- layer registry contract
	- popup/dense-flow strategy
- New rail controls must include accessibility metadata from day one.
