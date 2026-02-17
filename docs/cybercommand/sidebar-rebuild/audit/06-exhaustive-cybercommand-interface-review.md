# 06 - Exhaustive Cyber Command Interface Review

## Purpose
This document provides a full code-review inventory of the current Cyber Command interface stack, including active composition paths, conditional runtime behavior, placeholder surfaces, and legacy/dead modules.

Audit-only; no implementation changes.

## Review Scope (Exhaustive)
Reviewed paths include:
- Application entry and routing (`App`, app router, CyberCommand application wrapper)
- HUD layout composition (`CyberCommandHUDLayout` and variants)
- Core HUD surfaces (top bar, left sidebar, right sidebar, center manager, corners)
- Popup and floating panel systems
- Visualization mode and right-sidebar contexts/hooks
- Legacy panel/popup modules and empty placeholders
- Key mode/settings drift risks impacting rebuild mapping

---

## A) Runtime Entry and Mount Chain

### Active application mount chain
1. `App.tsx` wraps the app with:
   - `PopupProvider`
   - `VisualizationModeProvider`
   - `UnifiedGlobalCommandProvider`
   - `RightSideBarProvider`
   - other global providers
2. `EnhancedApplicationRouter` routes `cybercommand` to `CyberCommandApplication`
3. `CyberCommandApplication` mounts `CyberCommandHUDLayout isEmbedded={true}`
4. `GlobeScreen` also mounts `CyberCommandHUDLayout isEmbedded={true}`

### High-confidence runtime conclusion
CyberCommand currently runs in embedded mode by default in active routes.
This materially affects what functionality is actually active (see Section C).

---

## B) Active HUD Composition (current)

### Mounted by `CyberCommandHUDLayout`
- Top: `CyberCommandTopBar`
- Left: `CyberCommandLeftSideBar`
- Right: `CyberCommandRightSideBar`
- Center: `CyberCommandCenterManager` -> `Globe`
- Corners: top-left, top-right, bottom-left, bottom-right
- Wrappers: `FloatingPanelManager`, `ContextBridge`, `PhaseTransitionManager`, adaptive providers

### Embedded-mode gating behavior
In embedded mode (`isEmbedded=true`):
- Quick Access keyboard shortcut (`Ctrl/Cmd+K`) is disabled
- `NOAAFloatingIntegration` is not mounted (`!isEmbedded` guard)
- UI testing demo panels (`FloatingPanelDemo`) are not mounted
- New-user hint is not mounted

This means several HUD peripherals are effectively inactive in the current CyberCommand route flow.

---

## C) Surface-by-Surface Functionality Status

### 1) Top Bar (`CyberCommandTopBar`)
Status: **Active and feature-rich**
- Uses `useTopBarData` + `CyberCommandMarquee`
- Opens `EnhancedSettingsPopup` via global popup system (`usePopup`)
- Contains TODO stubs for per-datapoint click/hover actions

Audit note:
- Legacy `SettingsPopup.tsx` exists but active flow uses `EnhancedSettingsPopup`.

### 2) Left Sidebar (`CyberCommandLeftSideBar`)
Status: **Active, mixed modern+legacy composition**
- Mounts `TinyGlobe` (lazy)
- Mounts `VisualizationModeInterface` (primary+secondary controls)
- Mounts `SpaceWeatherControlSurface` + `SpaceWeatherSettingsContainer` in settings block
- Conditionally mounts Space Weather tertiary rail via `SpaceWeatherLayerSelector` when EcoNatural/SpaceWeather

Audit note:
- TinyGlobe remains mounted despite rebuild requirement to remove it.

### 3) Right Sidebar (`CyberCommandRightSideBar`)
Status: **Active shell with significant placeholder content**
- Uses `RightSideBarContext` (`isCollapsed`, `activeSection`, width behavior)
- Tab nav active (`status`, `intel`, `controls`, `chat`, `apps`, `developer`)
- Real content is concentrated in:
  - EcoDisasters status/legend flow (when EcoNatural/EcologicalDisasters)
  - Space Weather status/metrics/history/alerts cards
- Multiple tabs render placeholder text only (intel/controls/chat/apps/developer)

Audit note:
- Current right rail is a partially implemented container, not a fully realized operational panel system.

### 4) Center (`CyberCommandCenterManager`)
Status: **Active and minimal**
- Always renders `Globe`
- Legacy alternate center surfaces are not used in current layout

### 5) Corners
Status: **Mounted but mostly empty stubs**
- Top-left: empty container
- Top-right: empty container
- Bottom-left: empty container (commented as intentionally cleared)
- Bottom-right: returns `null`

Audit note:
- Corners are currently structural placeholders rather than functional UI surfaces.

---

## D) Popup and Floating Systems

### Popup system (`components/Popup/PopupManager.tsx`)
Status: **Active global popup infrastructure**
- Mounted at app root
- Supports stacked popups, backdrop close, z-index control
- Used by top bar and Space Weather detail actions

### Floating panel system (`FloatingPanelManager`)
Status: **Mounted in layout, conditionally fed**
- Manager is mounted in CyberCommand layout
- `NOAAFloatingIntegration` (major registrar of NOAA-triggered panels) is disabled in embedded mode

High-confidence conclusion:
- Popup system is production-relevant now.
- Floating panel NOAA flow is mostly dormant in active embedded-route usage.

---

## E) Legacy / Non-Mounted / Dead Modules (confirmed)

### Confirmed non-mounted or self-referential only
- `HUD/Panels/MegaCategoryPanel.tsx`
- `HUD/Popups/NOAAPopup.tsx`
- `HUD/Bars/CyberCommandLeftSideBar/ModeSettingsPanel.tsx`
- `HUD/Bars/CyberCommandLeftSideBar/VisualizationModeButtons.tsx`
- `HUD/Bars/CyberCommandRightSideBar/VisualizationModeControls.tsx`
- `HUD/Bars/CyberCommandRightSideBar/GlobeStatus.tsx`
- `HUD/Bars/CyberCommandRightSideBar/NOAAVisualizationStatus.tsx`
- `HUD/Bars/CyberCommandRightSideBar/CyberInvestigationHub.tsx`

### Empty placeholder files
- `HUD/Bars/CyberCommandLeftSideBar/SecondaryLeftSideBar.tsx`
- `HUD/Bars/CyberCommandRightSideBar/SpaceWeatherControls.tsx`
- `HUD/Bars/CyberCommandRightSideBar/DetailedNOAAControls.tsx`
- `HUD/Bars/CyberCommandRightSideBar/EnhancedVisualizationModeControls.tsx`
- `HUD/MiniMap/MiniMap.tsx`

### Obsolete/alternate layout artifacts (not active route path)
- `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.fixed.tsx`
- `layouts/CyberCommandHUDLayout/CyberCommandHUDLayout.backup.txt`

---

## F) Interface Contract Drift and Risks

### 1) CyberCommand secondary-mode naming drift
Observed mismatch:
- Active typed context uses `Satellites`
- Some legacy controls/comments still refer to `NetworkInfrastructure`

Implication:
- Rail migration must choose a single canonical submode vocabulary and retire stale names.
- Existing stale UI controls are likely why some modules are `@ts-nocheck`.

### 2) Type-safety bypasses in legacy controls
`@ts-nocheck` present in key legacy modules (examples: `ModeSettingsPanel`, `VisualizationModeControls`).

Implication:
- These modules should not be used as migration foundations; use typed, active-mode contracts instead.

### 3) Embedded-mode behavior can hide regressions
Many side systems are behind `!isEmbedded` checks.

Implication:
- Rebuild validation should explicitly test both:
  - active embedded app flow, and
  - any standalone/non-embedded harness if retained.

---

## G) Rebuild-Relevant Functional Keep List

High-confidence keep targets:
- `VisualizationModeContext` as mode state contract anchor
- `VisualizationModeInterface` selector logic (with naming cleanup)
- Space Weather tertiary architecture:
  - `SpaceWeatherSidebarLayout`
  - `SpaceWeatherLayerSelector`
  - `SpaceWeatherControlSurface`
  - `SpaceWeatherSettingsContainer`
  - passive cards/metrics/alerts
- Global popup system (`PopupManager`) for dense module conversion
- `CyberCommandTopBar` + marquee/settings stack (independent from rail redesign)

---

## H) Exhaustiveness Checklist

This review confirms coverage across:
- Route entry + provider graph
- Core HUD composition and mode gating
- Left/right/center/corners runtime behavior
- Popup/floating integrations
- Legacy and empty modules
- Naming/type drift relevant to migration

No unresolved CyberCommand-side HUD directories remain unclassified for the rail rebuild planning phase.
