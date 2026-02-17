# CyberCommand Sidebar Rebuild Audit

## Scope
This audit reviews the current CyberCommand left/right sidebars, visualization mode plumbing, mini-globe usage, and related popup/space-weather tertiary controls.

Goal: decide what to salvage, what to remove, and what is uncertain for the rebuild to:
- Two new left side bars (primary secondary-mode rail + contextual tertiary rail)
- One new right side bar (primary aesthetic mode rail)
- Mobile-first behavior without losing desktop usability

## Key Findings (High Signal)
1. The current left and right side bars are tightly coupled to fixed desktop widths and consume too much horizontal space for portrait mobile.
2. The TinyGlobe is currently mounted in the left sidebar and has no practical interaction value relative to the main globe.
3. Visualization mode model already supports the core rebuild split:
   - Primary mode: CyberCommand, GeoPolitical, EcoNatural
   - Secondary mode: subMode per primary mode
4. Space Weather already has a strong tertiary layer system that can map directly to the proposed contextual second-left rail.
5. There is a significant amount of legacy/duplicate sidebar code that is not currently mounted and can be retired.

## Deliverables in this folder
- 01-current-architecture-inventory.md
- 02-salvage-remove-fence-matrix.md
- 03-rebuild-rails-target-map.md
- 04-rail-naming-and-button-conventions.md
- 05-legacy-panels-popup-vs-retire-map.md
- 06-exhaustive-cybercommand-interface-review.md
- 07-cybercommand-functionality-status-matrix.md
- 08-implementation-sequence-and-deletion-gates.md
- 09-gate-to-file-map-and-pr-chunks.md
- 10-sidebar-rebuild-master-plan.md

## Recommended Immediate Direction
- Keep the existing visualization mode context contract and split control ownership by rail:
  - Right rail: primary mode (aesthetic baseline)
  - Left rail #1: secondary mode (functional tools)
  - Left rail #2: tertiary mode (contextual, e.g., Space Weather layers)
- Remove TinyGlobe and all MiniMap remnants from the rebuild path.
- Use popup conversion for dense panels (NOAA controls, investigation panels, deep settings) rather than restoring wide sidebars.
