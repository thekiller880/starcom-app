# 16 Execution Checklists

## Purpose
Provide operational checklists for consistent delivery.

## Pre-Phase Checklist
- Active gate identified
- Requirements in scope confirmed
- Risk review completed
- File scope boundaries defined

## Pre-PR Checklist
- Scope isolation verified
- Requirement IDs mapped
- Validation plan attached
- Rollback plan noted

## Pre-Merge Checklist
- Review criteria passed
- Test evidence attached
- Risk status updated
- Decision log updated if needed

## Post-Merge Checklist
- Embedded smoke run complete
- No unexpected regressions
- Tracker docs updated
- Next gate readiness confirmed

## Phase-Close Checklist
- Exit criteria satisfied
- Evidence archived
- Outstanding issues triaged
- Gate formally closed

## Required Artifacts Per Phase
- Updated requirements matrix entries
- Updated risk register entries
- Updated decision log entries (if deviations occurred)
- Validation summary with evidence links

## Merge-Readiness Checklist
- PR slice aligns to active phase only
- No forbidden cross-phase deletions
- Rollback path documented and tested mentally against slice scope
- Reviewer sign-off captured for ownership boundaries

## Completion Evidence Standard
- Checklist item marked complete only with linked proof or explicit reference
- “N/A” items require a brief rationale note

## Final Closeout Record (2026-02-13)
- Pre-Phase Checklist: Satisfied for each gate slice (`G0`, `G1`, `P1`..`P7`) with scoped requirement mapping.
- Pre-PR Checklist: Satisfied; phase-compatible slices maintained, rollback scope documented per cutover plan.
- Pre-Merge Checklist: Satisfied; validation evidence, risk updates, and decision log updates captured for each closed gate.
- Post-Merge Checklist: Satisfied; embedded smoke/acceptance evidence recorded, no blocker regressions observed.
- Phase-Close Checklist: Satisfied for `P1`..`P7`; closure records and approvals captured in gate and decision docs.
