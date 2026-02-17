# 00 Program Charter

## Program Objective
Rebuild CyberCommand sidebars into a narrow, mobile-first rail system that preserves operational capability while retiring legacy panel complexity.

## Business and UX Outcomes
- Reduce sidebar width pressure in portrait and constrained layouts.
- Improve mode-switch clarity by strict ownership across three rails.
- Move dense controls to popup surfaces for focus and readability.
- Remove dead and duplicate legacy modules safely.

## Scope
### In Scope
- Left and right sidebar runtime shells
- Rail ownership and mode interaction model
- SpaceWeather tertiary rail integration
- Popup migration for dense controls
- Legacy retirement and cleanup waves

### Out of Scope
- Globe engine rewrite
- Top bar redesign (except required integration points)
- Non-CyberCommand app migration
- New visual theme system

## Program Constraints
- Canonical rail names are mandatory.
- Active embedded runtime is primary acceptance baseline.
- No wide tabbed panel regressions inside rails.
- No undocumented scope changes.

## Success Criteria
### Functional
- Primary switching works only from right rail.
- Secondary switching works only from left rail.
- Tertiary controls appear contextually in left sub-rail.

### UX
- Portrait layout remains usable.
- Dense workflows are popup-first.
- Icon controls are accessible and stateful.

### Technical
- Legacy placeholders and dead modules retired in waves.
- Type/build health preserved after each phase.
- Canonical mode vocabulary enforced.

## Governance
- Program owner: Sidebar rebuild lead
- Architecture approver: Frontend architecture owner
- Gate approver: Engineering lead + QA lead
- Escalation path: Program owner -> Architecture approver -> Product/Tech leadership

## Delivery Model
- Work executes in phase-gated slices.
- Each phase has explicit entry/exit criteria.
- Merge order follows PR chunk plan.
- Reverts occur by chunk, not by ad hoc file reverts.

## Definition of Done
Program is complete when all gates close, embedded runtime acceptance passes, and legacy sidebar architecture is retired or explicitly time-boxed for removal.

## Milestone Map

### Milestone M1 - Contract Lock
- Canonical names and mode vocabulary frozen
- Architecture and UX ownership boundaries approved

### Milestone M2 - Rail Functional Baseline
- Three-rail model introduced and switching ownership enforced
- Embedded runtime functionally stable

### Milestone M3 - Popup Migration Complete
- Dense workflows no longer depend on legacy tabbed side regions
- Popup entry points validated for required user paths

### Milestone M4 - Legacy Retirement Complete
- Deletion waves completed with evidence
- Legacy ledger updated with final retirement status

### Milestone M5 - Hardening and Closeout
- Validation pack complete
- Risks resolved or accepted with sign-off
- Program close report published

## Non-Negotiable Quality Bars
- No gate closes with unresolved high-impact blocker
- No phase merges without rollback strategy
- No requirement marked Closed without evidence

## Stakeholder Review Checklist
- Scope remained within charter boundaries
- UX outcomes match mobile-first objective
- Technical debt trend improved (not deferred by default)
- Retirement decisions are traceable and reversible where needed
