# 05 IA and UX Spec

## Purpose
Define interaction and information architecture for the rebuilt rails.

## IA Overview
- Right rail: primary aesthetic mode controls
- Left rail: secondary functional controls
- Left sub-rail: contextual tertiary controls
- Popup layer: dense workflows and deep status/control content

## Right Rail Spec
### Button Set
- CyberCommand
- GeoPolitical
- EcoNatural

### Behavior
- Single-select group
- Active state always visible
- Keyboard navigable

## Left Rail Spec
### CyberCommand Secondary Buttons
- IntelReports
- CyberThreats
- CyberAttacks
- Satellites
- CommHubs

### GeoPolitical Secondary Buttons
- NationalTerritories
- DiplomaticEvents
- ResourceZones

### EcoNatural Secondary Buttons
- SpaceWeather
- EcologicalDisasters
- EarthWeather

### Behavior
- Changes based on active primary mode
- Preserves selected state per active mode contract
- Optional popup launch for dense secondary workflows

## Left Sub-Rail Spec
### Initial Scope
- SpaceWeather layers only

### Behavior
- Hidden when tertiary model does not exist
- Visible for EcoNatural -> SpaceWeather
- Layer change reflects immediately in tertiary control surface

## Accessibility Requirements
- Every control has aria-label
- Every selected control exposes deterministic selected state
- Keyboard navigation order is right rail -> left rail -> sub-rail -> popups
- Escape closes active popup

## Mobile Constraints
- Rails must remain narrow and touch-target safe
- Persistent text blocks avoided in rails
- Dense content opens in popups

## UX No-Regressions
- No wide tabbed panel restoration
- No TinyGlobe-dependent interaction
- No hidden critical mode action behind non-obvious affordances

## Interaction Sequences

### Primary mode switch
1. User selects primary mode on right rail.
2. Left rail updates available secondary controls.
3. Last valid secondary mode for selected primary is restored.
4. Sub-rail visibility recalculates.

### Secondary mode switch
1. User selects secondary mode on left rail.
2. Active visualization behavior updates.
3. Optional popup actions become available based on mode.

### Tertiary layer switch
1. User selects tertiary layer on sub-rail.
2. Contextual controls and passive cards update.
3. Optional details popup remains accessible.

## Disabled/Unavailable State Rules
- Controls unavailable in current context must show disabled visual state.
- Disabled controls must remain keyboard-focusable only if explanatory tooltip/help text is present.
- No hidden controls without discoverable explanation.

## Acceptance Scenarios
- Portrait viewport with all three rails active in eligible mode.
- Rapid mode switching without stale active-state artifacts.
- Keyboard-only navigation across rails and popup launch/close cycles.
- Screen reader announces selected states correctly.
