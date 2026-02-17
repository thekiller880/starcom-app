# Globe Coordinate Refactor — Expanded Phases (Post-Audit)

## Objective
Converge all 3D globe subsystems on one canonical Earth frame so Sun/day-night, overlays, Intel reports, cursor interactions, and geopolitical layers align without hidden offsets.

## Phase 6 — Canonical Frame Contract
### 6.1 Define canonical frame contract
- Publish one authoritative contract for:
  - Lat/lng to world mapping
  - Prime meridian reference
  - East-positive longitude convention
  - Globe local axes and world transform assumptions
- Deliverable: `docs/audit/GLOBE_CANONICAL_FRAME_CONTRACT_2026-02-15.md`

### 6.2 Encode contract tests
- Add invariant tests against shared utility mappings and sample landmarks.
- Add round-trip tests for world↔geo conversion in runtime conditions.

### 6.3 Add frame diagnostics API
- Expose debug probe utility to print subsystem frame assumptions at runtime.

Exit criteria:
- Contract approved and tests pass.

## Phase 7 — Geopolitical Reconciliation (Highest Risk)
### 7.1 Replace custom projection adapters incrementally
- Migrate `latLonToVector3`/`vector3ToLatLon` calls to shared frame adapters.

### 7.2 Remove hardcoded scene counter-offset
- Decommission `GEOPOLITICAL_SCENE_COUNTER_OFFSET_RAD` once replacement path is validated.

### 7.3 Verify geopolitical interactions
- Ensure hover, selection, pick pass, border index, and LOD remain correct.

Exit criteria:
- National Territories visually aligned without hardcoded -90° compensation.

## Phase 8 — Cross-Mode Anchor Validation
### 8.1 Build anchor checklist
- Greenwich marker, equator line, anti-meridian line, and selected city anchors.

### 8.2 Validate by primary mode/submode
- CyberCommand: IntelReports, Threats, Attacks, Satellites, CommHubs
- GeoPolitical: NationalTerritories
- EcoNatural: SpaceWeather, EcologicalDisasters

### 8.3 Snapshot baseline
- Capture deterministic snapshots for each anchor set and mode.

Exit criteria:
- Anchor consistency accepted across all targeted modes.

## Phase 9 — Texture Offset Decision Gate
### 9.1 Quantify mismatch
- Measure angular delta from audit overlays and anchor tests.

### 9.2 Decision branch
- Branch A (preferred): keep texture as-is, finish geometry reconciliation only.
- Branch B: apply texture offset and re-run full validation matrix.

### 9.3 Apply only if justified
- No texture shift unless mismatch is uniform, persistent, and lower risk than frame refactor.

Exit criteria:
- Formal Go/No-Go signed with evidence.

## Phase 10 — Solar + Space Weather Coupling Hardening
### 10.1 Day/night verification
- Confirm subsolar point and terminator behavior over time/date transitions.

### 10.2 Boundary orientation verification
- Ensure magnetopause/bow-shock nose/tail and dawn-dusk skew remain physically coherent under solar motion.

### 10.3 Backward compatibility checks
- Validate no regressions in non-space-weather overlays.

Exit criteria:
- Solar-frame visuals stable in QA scenarios.

## Phase 11 — UX and Toggle Integrity
### 11.1 Toggle parity audit
- Confirm all globe feature toggles have expected mutable behavior.

### 11.2 Resolve locked toggle anomalies
- Address National Territories lock behavior intentionally or document rationale.

### 11.3 Operator diagnostics
- Keep audit overlay and attach-state panel available behind debug flags.

Exit criteria:
- Toggle behavior and diagnostics documented and consistent.

## Phase 12 — Stabilization and Release Readiness
### 12.1 Regression suite
- Run focused tests + type checks + cross-mode smoke checks.

### 12.2 Documentation and handoff
- Update architecture docs, audit index, and troubleshooting runbook.

### 12.3 Release gate
- Sign off only when frame contract, geopolitics alignment, and solar coupling checks pass.

Exit criteria:
- Release-ready coordinate frame with auditable evidence.

## Dependency Order
1) Phase 6 → 2) Phase 7 → 3) Phase 8 → 4) Phase 9 (decision) → 5) Phase 10 → 6) Phase 11 → 7) Phase 12

## Estimated Effort (High-level)
- Phase 6: 0.5–1 day
- Phase 7: 1.5–2.5 days
- Phase 8: 0.5–1 day
- Phase 9: 0.5 day
- Phase 10: 1 day
- Phase 11: 0.5–1 day
- Phase 12: 0.5–1 day
- Total: ~5–8 focused dev days (depending on geopolitical reconciliation complexity)
