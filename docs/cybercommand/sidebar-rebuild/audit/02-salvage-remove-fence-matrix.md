# 02 - Salvage / Remove / Fence Matrix

## Salvage (High Confidence)

### Core state contracts
- src/context/VisualizationModeContext.tsx
  - Keep primary + secondary mode model and persistence behavior
  - Keep setPrimaryMode semantics

### Active mode selector primitives
- src/components/HUD/Common/VisualizationModeInterface/PrimaryModeSelector.tsx
- src/components/HUD/Common/VisualizationModeInterface/SecondaryModeSelector.tsx
  - Salvage logic and mode mappings
  - Re-skin/re-layout for new rails

### Space weather tertiary infrastructure
- src/components/SpaceWeather/SpaceWeatherSidebarLayout.ts
- src/components/SpaceWeather/SpaceWeatherLayerRegistry.ts
- src/components/SpaceWeather/SpaceWeatherLayerSelector.tsx
- src/components/SpaceWeather/SpaceWeatherControlSurface.tsx
- src/components/SpaceWeather/SpaceWeatherSettingsContainer.tsx
- src/components/SpaceWeather/SpaceWeatherStatusCard.tsx
- src/components/SpaceWeather/SpaceWeatherLayerPassiveCards.tsx
  - This is the strongest reusable subsystem for Left Rail #2

### Popup infrastructure
- src/components/Popup/PopupManager.tsx
  - Keep as the primary mechanism for dense panels and overflow interactions

## Remove / Decommission (High Confidence)

### Tiny/Mini globe surfaces
- src/components/TinyGlobe/TinyGlobe.tsx
- src/components/HUD/MiniMap/MiniMap.tsx (empty dead file)

Rationale:
- No clear functional delta vs main globe
- Consumes scarce mobile width
- Adds parallel globe complexity

### Legacy sidebar modules not mounted in current primary layout
Right sidebar likely decommission candidates:
- src/components/HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx
- src/components/HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx

Left sidebar likely decommission candidates:
- src/components/HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/GlobeControls.tsx
- src/components/HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx (empty)

## On The Fence (Needs decision during rebuild)

### Compact NOAA control stack
- src/components/HUD/Bars/CyberCommandLeftSideBar/CompactNOAAControls.tsx
- src/components/HUD/Popups/NOAAPopup.tsx

Status:
- Functional and reusable in popup mode
- Data model and UX are legacy-heavy and may need simplification

Recommendation:
- Keep as modal candidate for phase-1 rebuild
- Refactor later into modular cards/actions after rail migration

### RightSideBarContext width model
- src/context/RightSideBarContext.tsx

Status:
- Current width logic tied to old tabbed right panel behavior

Recommendation:
- Keep only if needed temporarily for backward compatibility
- Likely replace with new rail state context (active primary mode + optional panel state)

## Architectural Risks Found
1. CSS/layout assumptions encode fixed sidebar widths in multiple places (layout and component CSS)
2. Legacy modules have diverged submode assumptions (example: old controls referenced NetworkInfrastructure while context now uses Satellites)
3. Existing right sidebar stylesheet is very large and mixes old/new concepts; reuse should be selective

## Minimal Wipe Boundary Proposal
- Wipe and rebuild only runtime rail shells and their CSS contracts:
  - CyberCommandLeftSideBar.tsx + module.css
  - CyberCommandRightSideBar.tsx + module.css
  - CyberCommandHUDLayout.module.css left/right/center spacing rules
- Preserve mode/context/state contracts and Space Weather tertiary subsystem
- Keep popup system and migrate high-density controls into popup-driven flows
