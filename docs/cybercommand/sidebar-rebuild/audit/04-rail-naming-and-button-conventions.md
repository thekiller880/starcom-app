# 04 - Rail Naming and Button Conventions (Audit Contract)

## Purpose
This document locks naming and UI conventions for the CyberCommand sidebar rebuild before implementation.

This is audit-only guidance, not implementation code.

## Required Component Names
Use these exact names for new rail components:

- `CyberCommandLeftSideRail`
- `CyberCommandLeftSideSubRail`
- `CyberCommandRightSideRail`

These names are the canonical architecture labels in all rebuild docs and implementation tasks.

## Ownership Contract by Rail

### `CyberCommandRightSideRail` (Primary Aesthetic Mode Rail)
Owns only primary mode selection:
- `CyberCommand`
- `GeoPolitical`
- `EcoNatural`

Do not place dense tab panels or long-form status stacks in this rail.
Dense controls launch popups.

### `CyberCommandLeftSideRail` (Secondary Functional Mode Rail)
Owns secondary mode selection and quick functional actions for the active primary mode.

This is the primary operational rail for tool switching.

### `CyberCommandLeftSideSubRail` (Contextual Tertiary Rail)
Owns tertiary depth only when needed for the active secondary mode.

Initial high-confidence use case from audit:
- `EcoNatural -> SpaceWeather` layer controls

This rail should collapse/hide when no tertiary model exists.

## Button System Convention (Future-Proof)

### Current visual strategy
Use emoji-first icon buttons for immediate low-friction implementation.

### Future replacement strategy
Every button must be defined by stable metadata so emoji can be replaced by image assets without behavior changes:
- stable key/id
- accessible label
- tooltip label
- icon slot (currently emoji; later image source)

The rail should treat icon rendering as a presentation detail, not as identity.

## Accessibility Baseline
Each icon button must have:
- clear `aria-label`
- keyboard focus support
- deterministic selected/active state indication

These constraints are mandatory for both emoji and future image icon sets.

## Anti-Drift Rules
To prevent regression back to old sidebars:
- Do not reintroduce fixed-width panel stacks into the rails.
- Do not mount TinyGlobe/MiniMap derivatives in either left rail.
- Do not place large NOAA deep-settings forms directly inside rails.

If content is dense, use popup/sheet surfaces.

## Implementation Sequencing Guidance (for next phase)
1. Build `CyberCommandRightSideRail` with primary mode switching only.
2. Build `CyberCommandLeftSideRail` with secondary mode switching.
3. Add `CyberCommandLeftSideSubRail` only for secondary modes that expose tertiary depth.
4. Wire popup launch points for dense controls instead of embedding large panels.
