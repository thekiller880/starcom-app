# 11 Test and Validation Plan

## Purpose
Provide structured validation strategy for each phase and gate.

## Validation Layers
1. Functional behavior checks
2. Integration checks across contexts
3. Embedded runtime smoke checks
4. Accessibility checks
5. Regression checks after deletion waves

## Embedded Baseline Suite
- Mode switching by rail ownership
- Tertiary rail contextual visibility
- Popup launch and close behavior
- No required interactions hidden in retired panels

## Optional Standalone Parity Suite
- Validate non-embedded-only flows if retained
- Record known acceptable differences

## Phase-End Validation Pack
Each phase must include:
- Requirements covered
- Tests executed
- Failures and disposition
- Residual risk notes

## Acceptance Evidence Format
- Checklist result
- Test output summary
- Visual proof for UI state transitions
- Issue links for deferred defects

## Test Matrix
| Category | Minimum Coverage | Phase Usage |
|---|---|---|
| Rail ownership behavior | Primary/Secondary/Tertiary transitions | P1-P3 |
| Popup workflow behavior | Launch/close/focus lifecycle | P2-P3 |
| Deletion regression | Reference scan + smoke flow parity | P4-P6 |
| Accessibility | Keyboard + aria state checks | P1-P7 |

## Defect Disposition Rules
- Blocker defects stop gate closure.
- Major defects require explicit gate-owner disposition.
- Minor defects must be logged with target phase for fix.

## Retest Policy
- Any reverted slice requires full embedded baseline rerun.
- Any ownership-boundary change requires rail interaction suite rerun.
- Any popup contract change requires popup accessibility retest.
