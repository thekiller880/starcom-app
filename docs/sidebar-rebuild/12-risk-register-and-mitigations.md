# 12 Risk Register and Mitigations

## Purpose
Track active risks and define mitigation and escalation plans.

## Risk Table
| Risk ID | Risk | Impact | Likelihood | Owner | Mitigation | Trigger |
|---|---|---|---|---|---|---|
| RK-01 | Terminology drift in mode naming | High | Medium | TBD | Freeze glossary + search checks | Mixed term appears in active path |
| RK-02 | Embedded-only blind spots | High | Medium | TBD | Baseline embedded suite + optional parity suite | Unexpected behavior in non-embedded harness |
| RK-03 | Hidden legacy dependency during deletion | High | Medium | TBD | Two-wave deletion + reference scans | Runtime break after removal |
| RK-04 | Rail regression to dense panel behavior | Medium | Medium | TBD | UX constraints + review checklist | Wide panel patterns reintroduced |
| RK-05 | Accessibility regressions | High | Low | TBD | Required a11y checklist per phase | Missing labels or keyboard traps |

## Risk Review Cadence
- Review at each phase close
- Re-score impact and likelihood
- Close or carry with explicit owner

## Escalation Rule
Any high-impact risk with failed mitigation blocks gate closure.

## Risk Scoring Guidance
- Impact: High (gate-blocking), Medium (phase-impacting), Low (localized)
- Likelihood: High (expected), Medium (plausible), Low (unlikely)
- Priority score: Impact x Likelihood (qualitative)

## Mitigation Lifecycle
1. Identify and assign owner.
2. Define preventive mitigation.
3. Define contingency action.
4. Track trigger signals weekly.
5. Close risk when trigger window passes without incident.

## Risk Audit Trail
- Every risk status change is logged with date and rationale.
- Closed risks retain final evidence note for postmortem reference.

## Phase Risk Review Snapshot

### 2026-02-13 - P2/P3 Closure Review
- RK-04 (rail regression to dense panel behavior): mitigation applied; placeholder-only right-tab bodies removed and replaced with popup launch affordances in active P3 slice.
- RK-05 (accessibility regressions): mitigation applied; popup Escape-close/focus-return and repeated lifecycle stability validated by popup manager and popup-route test suites.
- RK-03 (hidden legacy dependency during deletion): remains Open for P4/P5 deletion waves; no blocker observed in current P2/P3 scope.
- Residual blocker status for P2/P3: none.

### 2026-02-13 - P5 Closure Review
- RK-03 (hidden legacy dependency during deletion): mitigation validated for behavioral wave; all planned P5 targets confirmed removed with no active import matches, targeted replacement-path tests pass (`5/5` suites), and compile/build checks pass.
- RK-04 (rail regression to dense panel behavior): remains mitigated; retirement wave preserves popup-based dense workflows and right-rail role boundaries.
- RK-05 (accessibility regressions): no new blockers observed in popup lifecycle/status/deep-control test coverage used for P5 validation.
- Residual blocker status for P5: none.

### 2026-02-13 - P7 Hardening Slice Review (In Progress)
- RK-03 (hidden legacy dependency during deletion/hardening): no blockers observed in active-path hardening slice; `SpaceWeatherContext` and `SpaceWeatherControlSurface` now type-checked without `@ts-nocheck` and compile/build remain green.
- RK-04 (rail regression to dense panel behavior): ownership boundaries remain intact; focused rail regression suites pass (`2/2` suites, `9/9` tests).
- RK-05 (accessibility regressions): no new accessibility regressions observed in the focused rail coverage used for this slice.
- Residual blocker status for P7 slice: none.

### 2026-02-13 - P7 Terminology/Modularity Slice Review (In Progress)
- RK-01 (terminology drift in mode naming): mitigation advanced; canonical `Satellites` naming now covers active selector UI plus tracked CyberCommand type/service contracts and tests.
- RK-03 (hidden dependency risk during hardening): no blocker observed after service modularization (`CyberCommandDataService.ts` split with extracted mock generator); compile/build remain green.
- RK-04 (rail behavior regression): no regression observed; rail ownership suites remain passing after contract updates.
- Residual blocker status for this P7 slice: none.

### 2026-02-13 - P7 Phase-Close Risk Review
- RK-01: mitigated for P7 scope; no unresolved active UI-contract terminology drift remains.
- RK-03: mitigated for hardening scope; embedded acceptance matrix, type-check, and build checks pass after modularization and contract updates.
- RK-04: mitigated; rail/popup ownership behavior remains stable across acceptance matrix suites.
- RK-05: no blocker accessibility regressions observed in matrix suites used for phase-close validation.
- Residual blocker status for P7 closure: none.

### 2026-02-13 - Program Closeout Risk Acceptance
- All gate-blocking risks are mitigated or accepted within charter scope.
- Remaining non-blocking build warnings (dynamic import/chunk advisories) are outside sidebar rebuild gate criteria and are deferred to standard optimization backlog.
- Final residual blocker status for program sign-off: none.
