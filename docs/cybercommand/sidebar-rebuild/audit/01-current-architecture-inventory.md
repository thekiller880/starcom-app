# 01 - Current Architecture Inventory

## Runtime Entry Points

### Layout composition
- src/layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx
  - Mounts CyberCommandLeftSideBar and CyberCommandRightSideBar inside fixed-position HUD regions
  - Uses fixed offsets in layout CSS (left ~128px, right ~120px assumptions)

### Global providers relevant to sidebar behavior
- src/App.tsx
  - RightSideBarProvider wraps the app root
  - VisualizationModeProvider and SpaceWeatherProvider are available globally
  - PopupProvider exists globally (important for modal conversion path)

## Left Sidebar (Current)
- src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx
  - Contains TinyGlobe
  - Contains VisualizationModeInterface (primary + secondary mode buttons)
  - Contains SpaceWeatherControlSurface + SpaceWeatherSettingsContainer when mode is EcoNatural/SpaceWeather
  - Shows SpaceWeatherLayerSelector as a second rail to the right of left bar

- src/components/HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.module.css
  - Fixed width: 128px
  - Full-height fixed dock
  - Adds secondary rail width (~56px) for space weather layers

## Right Sidebar (Current)
- src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx
  - Tab-based panel with sections: status/intel/controls/chat/apps/developer
  - Status tab mixes Space Weather cards + EcoNatural disaster status/legend
  - Intel tab currently mostly placeholder + alerts card
  - Heavy placeholder content remains in controls/chat/apps/developer

- src/context/RightSideBarContext.tsx
  - Dynamic width model by active section (40 collapsed, 120 default, 240 controls, 320 chat)
  - Writes CSS custom property --right-sidebar-width

- src/components/HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.module.css
  - Very large legacy stylesheet footprint
  - Fixed right dock behavior, dense visual styling, many legacy class families

## Visualization Modes (Core State)
- src/context/VisualizationModeContext.tsx
  - Primary modes: CyberCommand, GeoPolitical, EcoNatural
  - Secondary modes (subMode):
    - CyberCommand: IntelReports, CyberThreats, CyberAttacks, Satellites, CommHubs
    - GeoPolitical: NationalTerritories, DiplomaticEvents, ResourceZones
    - EcoNatural: SpaceWeather, EcologicalDisasters, EarthWeather
  - Supports setPrimaryMode with persisted last-selected submode per primary mode
  - Already suitable for right-rail primary + left-rail secondary split

## Visualization Controls UI Components
- src/components/HUD/Common/VisualizationModeInterface/VisualizationModeInterface.tsx
- src/components/HUD/Common/VisualizationModeInterface/PrimaryModeSelector.tsx
- src/components/HUD/Common/VisualizationModeInterface/SecondaryModeSelector.tsx

These are active and currently mounted through the left sidebar.

## Space Weather Tertiary System (Strong Candidate for Left Rail #2)
- src/components/SpaceWeather/SpaceWeatherSidebarLayout.ts
  - Produces interactive and passive bundles scoped to EcoNatural/SpaceWeather
- src/components/SpaceWeather/SpaceWeatherLayerRegistry.ts
  - Canonical tertiary layer registry (overlay/hud/planned capability)
- src/components/SpaceWeather/SpaceWeatherLayerSelector.tsx
  - Rail-style tertiary selector (emoji buttons)
- src/components/SpaceWeather/SpaceWeatherControlSurface.tsx
  - Layer-context controls + details popup integration
- src/components/SpaceWeather/SpaceWeatherSettingsContainer.tsx
  - Layer-specific settings loading

## Tiny/Mini Globe Surfaces
- src/components/TinyGlobe/TinyGlobe.tsx
  - Active in left sidebar
  - Maintains own GlobeEngine wiring and polling-style behavior
- src/components/HUD/MiniMap/MiniMap.tsx
  - Empty file (dead surface)

## Popup-Capable Surfaces (for modal conversion)
- src/components/Popup/PopupManager.tsx
  - Central popup manager with backdrop and z-layer support
- src/components/HUD/Popups/NOAAPopup.tsx
  - Existing popup shell around CompactNOAAControls
- src/components/HUD/Panels/MegaCategoryPanel.tsx
  - Already embeds legacy CompactNOAAControls in sectioned panel

## Legacy/Shadow Sidebar Modules (not currently mounted directly)
Left sidebar folder includes many old modules:
- CompactNOAAControls.tsx
- ModeSettingsPanel.tsx
- GlobeControls.tsx
- DeepSettingsPanel.tsx
- NOAAGlobeVisualizationManager.ts
- VisualizationModeButtons.tsx
- SecondaryLeftSideBar.tsx (empty)

Right sidebar folder includes old/alternate modules:
- VisualizationModeControls.tsx
- GlobeStatus.tsx
- NOAAVisualizationStatus.tsx
- CyberInvestigationHub.tsx
- DetailedNOAAControls.tsx
- EnhancedVisualizationModeControls.tsx

Most appear legacy or inactive in current runtime sidebar composition.
