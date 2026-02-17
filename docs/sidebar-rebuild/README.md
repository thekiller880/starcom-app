# Sidebar Rebuild Program Guide

## Purpose
This folder is the execution control center for the Sidebar Rebuild program.

It exists to keep implementation aligned, reduce scope drift, and ensure each phase is verifiable before moving forward.

## How to Use This Folder
Use this folder in four modes:

1. **Planning mode**
   - Confirm scope, constraints, and architecture direction
   - Lock terminology and ownership boundaries

2. **Execution mode**
   - Follow phase gates in order
   - Implement only what the active phase permits

3. **Validation mode**
   - Validate requirement coverage and regression checks
   - Close gate criteria with evidence

4. **Cutover mode**
   - Execute migration and retirement steps
   - Follow rollback criteria if any gate fails

## Reading Order
Read in this order for full context and controlled execution:

1. `00-program-charter.md`
2. `01-glossary-and-canonical-terms.md`
3. `02-architecture-baseline.md`
4. `03-target-architecture.md`
5. `04-requirements-traceability-matrix.md`
6. `05-ia-and-ux-spec.md`
7. `06-component-contracts.md`
8. `07-popup-migration-spec.md`
9. `08-layout-and-css-migration-plan.md`
10. `09-phase-plan-and-gates.md`
11. `10-work-packages-and-pr-slices.md`
12. `11-test-and-validation-plan.md`
13. `12-risk-register-and-mitigations.md`
14. `13-cutover-and-rollback-plan.md`
15. `14-legacy-retirement-ledger.md`
16. `15-change-control-and-decision-log.md`
17. `16-execution-checklists.md`
18. `17-reporting-dashboard-template.md`

## Program Controls

### Gate discipline
- No phase may begin until the prior phase exit criteria are satisfied.
- Gate closure must be evidenced (tests, screenshots, diff scope, or doc checklists).

### Scope discipline
- No undocumented scope additions.
- Any new requirement must be added to traceability before implementation.

### Ownership discipline
- Rail ownership boundaries are strict:
  - Right rail owns primary mode switching only.
  - Left rail owns secondary mode switching.
  - Left sub-rail owns contextual tertiary controls only.

## Canonical Runtime Baseline
Primary acceptance baseline is embedded runtime behavior for CyberCommand.

If standalone parity is required, it must be explicitly declared in phase planning and validated in test artifacts.

## Document Completion Tracker

- [x] README.md
- [x] 00-program-charter.md
- [x] 01-glossary-and-canonical-terms.md
- [x] 02-architecture-baseline.md
- [x] 03-target-architecture.md
- [x] 04-requirements-traceability-matrix.md
- [x] 05-ia-and-ux-spec.md
- [x] 06-component-contracts.md
- [x] 07-popup-migration-spec.md
- [x] 08-layout-and-css-migration-plan.md
- [x] 09-phase-plan-and-gates.md
- [x] 10-work-packages-and-pr-slices.md
- [x] 11-test-and-validation-plan.md
- [x] 12-risk-register-and-mitigations.md
- [x] 13-cutover-and-rollback-plan.md
- [x] 14-legacy-retirement-ledger.md
- [x] 15-change-control-and-decision-log.md
- [x] 16-execution-checklists.md
- [x] 17-reporting-dashboard-template.md

## Current Program Status
- Current phase: Program closed (Stage 5 complete)
- Active gate: None (all gates `G0`, `G1`, `P1`..`P7` closed)
- Next action: track non-blocking optimization follow-ups in standard backlog outside sidebar rebuild scope

## Delivery Rhythm

### Weekly cadence
- Monday: phase planning, risk review, and gate readiness check
- Midweek: implementation progress review and blocker triage
- Friday: validation review, gate closure decision, and weekly dashboard publish

### Daily cadence
- Confirm active gate and allowed scope before coding
- Verify PR slice boundaries remain phase-compatible
- Update requirement status and decision log for any scope/contract change

## Required Cross-Document Updates
Any implementation PR must update these documents as needed:
- `04-requirements-traceability-matrix.md` (status + evidence)
- `15-change-control-and-decision-log.md` (if architecture/scope changes)
- `14-legacy-retirement-ledger.md` (if retirement/deletion occurs)
- `16-execution-checklists.md` (phase and merge check records)

## Evidence Standards

### Minimum evidence package for gate closure
- Requirement IDs addressed
- Validation results summary
- Regression check statement
- Known issues with severity and disposition

### Preferred evidence artifacts
- test output snippets
- screenshots/GIFs for rail interaction states
- file reference list of touched contracts

## Program Anti-Drift Guardrails
- Do not reintroduce fixed-width, dense side panels
- Do not split ownership of primary/secondary mode switching
- Do not skip phase gates for schedule convenience
- Do not retire legacy modules without replacement proof or explicit intentional removal sign-off
