# 03 - Rebuild Rails Target Map (Audit-Driven)

## Target Rail Model

### `CyberCommandLeftSideRail` (Functional Secondary Modes)
Purpose:
- Select functional interaction layer for the main globe
- One button per secondary mode (icon-first)

Data source:
- VisualizationModeContext secondary mode mappings

Behavior:
- Always visible in CyberCommand HUD
- Narrow, touch-safe buttons
- Selecting mode may open contextual popups (if dense controls are needed)

### `CyberCommandLeftSideSubRail` (Contextual Tertiary Modes)
Purpose:
- Show only when selected secondary mode has tertiary depth
- Initial target: EcoNatural -> SpaceWeather layers

Data source:
- SpaceWeatherLayerRegistry + SpaceWeatherSidebarLayout

Behavior:
- Appears immediately to the right of Left Rail #1
- Layer selection by icon button
- Optional long-press or info button opens detail popup

### `CyberCommandRightSideRail` (Primary Aesthetic Modes)
Purpose:
- Change baseline globe style/theme/lighting family
- Three primary buttons only: CyberCommand, GeoPolitical, EcoNatural

Data source:
- VisualizationModeContext setPrimaryMode

Behavior:
- Minimal width rail
- Does not host large tab content panels
- Any detailed controls launch popup modules

## Mobile-First Constraints from Audit
- Current 128px left + 120px right model does not fit portrait viewport well
- New rails should target strict narrow widths and avoid persistent text blocks
- Dense information (status/history/alerts) should move to popup sheets or floating panels

## Concrete Salvage Mapping
- Keep mode state and selectors:
  - VisualizationModeContext
  - PrimaryModeSelector + SecondaryModeSelector logic
- Keep tertiary implementation:
  - SpaceWeatherLayerSelector + ControlSurface + SettingsContainer + status cards
- Keep popup shell:
  - PopupManager

## Concrete Wipe Mapping
- Remove TinyGlobe from left sidebar composition
- Remove dead MiniMap surface
- Remove or archive legacy non-mounted sidebar modules after migration

## Outstanding Questions to Resolve in next audit pass
1. Which non-space-weather secondary modes need tertiary rails next (if any)?
2. Which right-sidebar status/intel cards should become popup cards vs floating panels?
3. Which legacy NOAA modules are retained for short-term compatibility versus rebuilt now?
4. Should RightSideBarContext be replaced immediately or bridged during transition?

## Suggested Next Audit Pass
- Map each secondary mode to:
  - required globe interaction primitives
  - required tertiary controls
  - required popup panels
- Produce button-level IA spec for new rails with icon + accessibility labels
