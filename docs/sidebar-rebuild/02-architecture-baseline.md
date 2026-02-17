# 02 Architecture Baseline

## Purpose
Capture the current runtime baseline before migration.

## Runtime Mount Chain
1. App providers include Popup, VisualizationMode, UnifiedGlobalCommand, RightSideBar.
2. Router mounts CyberCommand application.
3. CyberCommand mounts HUD layout in embedded mode.

## Active Composition
- Top: CyberCommandTopBar
- Left: CyberCommandLeftSideBar
- Right: CyberCommandRightSideBar
- Center: CyberCommandCenterManager -> Globe
- Floating manager and popup infrastructure are present

## Embedded Runtime Effects
In embedded mode:
- Quick-access keyboard overlay is disabled.
- NOAAFloatingIntegration is disabled.
- Some diagnostics/demo surfaces are disabled.

## Baseline Functional Reality
- Left sidebar contains active mode controls and TinyGlobe.
- Right sidebar is active but contains multiple placeholder regions.
- SpaceWeather tertiary system is mature and actively wired.
- Popup manager is production-ready and globally available.

## Legacy and Dead Surface Summary
### Non-mounted legacy modules
- Legacy mode controls, status cards, and panel wrappers in sidebar folders

### Empty placeholders
- SecondaryLeftSideBar, SpaceWeatherControls, DetailedNOAAControls, EnhancedVisualizationModeControls, MiniMap

### Obsolete artifacts
- Fixed/backup HUD layout variants not used by active route

## Baseline Risks
- Mixed legacy terminology (Satellites vs NetworkInfrastructure)
- Legacy ts-nocheck surfaces in adjacent flows
- Wide-layout CSS assumptions in old sidebar contracts

## Baseline Rule
All migration validation compares against this embedded runtime baseline unless phase policy explicitly adds standalone parity checks.

## Baseline Dependency Boundaries

### Must remain stable during early phases
- Visualization mode persistence semantics
- Popup provider availability at app root
- SpaceWeather context-to-rail data bundling

### Allowed to evolve by phase
- Sidebar shell component composition
- Rail-local CSS and layout docking
- Legacy module import paths (only with gate-approved retirement)

## Baseline Regression Anchors
- Primary mode switching remains responsive
- Secondary mode switching updates active visualization surface
- SpaceWeather tertiary controls appear only in eligible context
- Embedded runtime does not lose critical operational controls

## Observability Notes for Migration
- Record any regressions caused by embedded-only gating assumptions
- Track if retired modules had hidden dependencies discovered during deletion
- Track any context write conflicts introduced by rail ownership changes
