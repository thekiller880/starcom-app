# 08 Layout and CSS Migration Plan

## Purpose
Control layout and styling migration from wide sidebars to compact rails.

## Migration Intent
- Replace width-heavy sidebar layout assumptions.
- Keep center globe area stable during transition.
- Move complexity from fixed side regions into popup overlays.

## Layout Workstreams
1. Rail shell placement and spacing
2. Sub-rail conditional docking
3. Right rail simplification
4. Legacy CSS retirement and cleanup

## CSS Strategy
- Isolate new rail styles from legacy sidebar styles.
- Keep rail styles minimal and state-driven.
- Remove dead class families after deletion gates close.

## Constraints
- Do not hardcode new broad widths that reintroduce panel behavior.
- Preserve touch-safe hit targets.
- Preserve z-index harmony with popup and floating layers.

## Regression Watchlist
- Overlap with top bar or center surface
- Incorrect rail stacking in portrait
- Popup layering under/over rail incorrectly
- Residual legacy classes still affecting new rails

## Completion Signals
- New rails render correctly across target viewport classes
- No required UI depends on legacy sidebar stylesheet blocks
- Layout remains stable through mode and popup transitions

## Phased Styling Strategy

### Phase L1
- Introduce isolated rail style modules.
- Keep legacy styles active but non-authoritative for new rails.

### Phase L2
- Migrate active layout offsets to rail-centric spacing contracts.
- Remove style collisions and duplicate selectors.

### Phase L3
- Retire dead legacy classes after deletion waves close.
- Finalize style contracts with only active rail and popup dependencies.

## CSS Verification Checklist
- No hard-coded wide sidebar assumptions in active styles.
- Rail widths and spacing remain consistent across mode transitions.
- Popup z-order and backdrop layering do not conflict with rails.
- Focus/active/disabled states are visibly distinct.

## Visual Regression Anchors
- Primary/secondary/tertiary controls in portrait
- Popup launch from each rail role
- Mode switch while popup open
- Collapse/expand behavior for any temporary bridge state
