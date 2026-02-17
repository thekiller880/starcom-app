# 01 Glossary and Canonical Terms

## Purpose
Lock shared language to prevent implementation drift.

## Canonical Component Names
- CyberCommandLeftSideRail
- CyberCommandLeftSideSubRail
- CyberCommandRightSideRail

## Canonical Mode Terms
### Primary Modes
- CyberCommand
- GeoPolitical
- EcoNatural

### Secondary Modes (CyberCommand)
- IntelReports
- CyberThreats
- CyberAttacks
- Satellites
- CommHubs

### Secondary Modes (GeoPolitical)
- NationalTerritories
- DiplomaticEvents
- ResourceZones

### Secondary Modes (EcoNatural)
- SpaceWeather
- EcologicalDisasters
- EarthWeather

## Forbidden/Legacy Terms
- NetworkInfrastructure (replace with Satellites where mode label is intended)
- MiniMap as active sidebar surface
- Generic LeftSideBar/RightSideBar naming for new rails

## Ownership Vocabulary
- Primary ownership: right rail only
- Secondary ownership: left rail only
- Tertiary ownership: left sub-rail only
- Dense workflow surfaces: popup modules

## Accessibility Label Rules
- Every rail button must include deterministic aria-label.
- Every button must expose selected/active state.
- Tooltip text must match canonical feature language.

## Change Control
Any new term or rename requires:
1. Update in this document.
2. Update in requirements traceability.
3. Architecture sign-off before implementation use.

## Normalization Rules

### File and symbol consistency
- File names should mirror canonical component names where feasible.
- Public symbols must avoid legacy aliases once canonical mapping is adopted.

### UI label consistency
- Tooltip and aria-label must use the same canonical wording.
- User-facing labels should not expose deprecated internal terms.

## Canonical Term Examples
- Correct: `Satellites` secondary mode in UI and rail metadata
- Incorrect: `NetworkInfrastructure` as a user-visible mode label
- Correct: `CyberCommandRightSideRail` in docs and implementation plan
- Incorrect: generic `RightSideBar` for new architecture references

## Enforcement Checklist
- Search check for forbidden terms in active-path files
- Review check for new symbols in PRs
- Validation check that docs and implementation names match
