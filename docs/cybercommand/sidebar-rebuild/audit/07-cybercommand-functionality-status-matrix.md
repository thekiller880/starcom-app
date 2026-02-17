# 07 - CyberCommand Functionality Status Matrix

## Purpose
Single-table status map of major Cyber Command interface modules for implementation planning.

Legend:
- **A** = Active in current embedded runtime
- **C** = Conditional (feature flag or mode/embedding dependent)
- **L** = Legacy/non-mounted in active runtime
- **E** = Empty placeholder

## Matrix

| Area | Module | Status | Notes |
|---|---|---:|---|
| Entry | `applications/cybercommand/CyberCommandApplication.tsx` | A | Mounts `CyberCommandHUDLayout` in embedded mode |
| Layout | `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.tsx` | A | Primary composition path |
| Layout | `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx` | L | Alternate/older composition artifact |
| Top Bar | `HUD/Bars/CyberCommandTopBar/CyberCommandTopBar.tsx` | A | Marquee + popup settings entry point |
| Top Bar | `HUD/Bars/CyberCommandTopBar/EnhancedSettingsPopup.tsx` | A | Active popup content |
| Top Bar | `HUD/Bars/CyberCommandTopBar/SettingsPopup.tsx` | L | Legacy popup variant |
| Left Rail Surface | `HUD/Bars/CyberCommandLeftSideBar/CyberCommandLeftSideBar.tsx` | A | TinyGlobe + mode controls + SW settings |
| Left Legacy | `HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx` | L | Not mounted by active left sidebar |
| Left Legacy | `HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx` | L | Not mounted by active left sidebar |
| Left Legacy | `HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx` | E | Empty file |
| Left Legacy | `HUD/Bars/CyberCommandLeftSideBar/GlobeControls.tsx` | L | Not mounted in active layout |
| Right Rail Surface | `HUD/Bars/CyberCommandRightSideBar/CyberCommandRightSideBar.tsx` | A | Active shell; mixed real + placeholder tab content |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx` | L | Legacy mode control surface (not mounted) |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx` | L | Not mounted |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx` | L | Indirectly only via legacy `GlobeStatus` |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx` | L | Implemented but not mounted |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx` | E | Empty file |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx` | E | Empty file |
| Right Legacy | `HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx` | E | Empty file |
| Center | `HUD/CyberCommandCenter/CyberCommandCenterManager.tsx` | A | Active globe host |
| Corners | `HUD/Corners/CyberCommandTopLeft.tsx` | A | Mounted but empty container |
| Corners | `HUD/Corners/CyberCommandTopRight.tsx` | A | Mounted but empty container |
| Corners | `HUD/Corners/CyberCommandBottomLeft.tsx` | A | Mounted but intentionally empty |
| Corners | `HUD/Corners/CyberCommandBottomRight.tsx` | A | Mounted, returns `null` |
| Bottom Bar | `HUD/Bars/CyberCommandBottomBar/CyberCommandBottomBar.tsx` | L | Explicitly removed from active layout |
| Popup Infra | `components/Popup/PopupManager.tsx` | A | Global popup provider active at app root |
| Popup Legacy | `HUD/Popups/NOAAPopup.tsx` | L | Defined but not mounted |
| Panels Legacy | `HUD/Panels/MegaCategoryPanel.tsx` | L | Defined but not mounted |
| Mini Globe | `components/TinyGlobe/TinyGlobe.tsx` | A | Mounted in left sidebar (targeted for removal in rebuild) |
| Mini Map | `HUD/MiniMap/MiniMap.tsx` | E | Empty file |
| Floating Infra | `HUD/FloatingPanels/FloatingPanelManager.tsx` | A | Manager mounted in HUD layout |
| NOAA Floating Bridge | `HUD/FloatingPanels/NOAAFloatingIntegration.tsx` | C | Disabled in embedded mode (`!isEmbedded`) |
| Mode Context | `context/VisualizationModeContext.tsx` | A | Core primary/secondary mode contract |
| Right Sidebar Context | `context/RightSideBarContext.tsx` | A | Width/collapse/section state |
| SpaceWeather Tertiary | `SpaceWeather/SpaceWeatherSidebarLayout.ts` | A | Active tertiary layout model |
| SpaceWeather Tertiary | `SpaceWeather/SpaceWeatherLayerSelector.tsx` | A | Mounted conditionally via active left sidebar |
| SpaceWeather Tertiary | `SpaceWeather/SpaceWeatherControlSurface.tsx` | A | Active, includes popup details action |
| SpaceWeather Tertiary | `SpaceWeather/SpaceWeatherSettingsContainer.tsx` | A | Active settings body |

## Key Matrix Outcomes
- Current interface is operational but heavily mixed between active modern surfaces and dormant legacy modules.
- Right sidebar delivers partial production value with many placeholder sections still present.
- TinyGlobe is one of the few clearly active legacy visuals and remains a direct rebuild removal target.
- Popup infrastructure is healthy and should be the destination for dense legacy panel salvage.
