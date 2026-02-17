# 10 Work Packages and PR Slices

## Purpose
Define merge-safe work packaging for implementation.

## PR Slice Rules
- One phase objective per PR slice
- No mixed deletion wave with architecture introduction in same PR
- Every PR references requirement IDs and active gate

## Recommended Slice Plan
1. Slice A: contract and rail scaffolding
2. Slice B: mode routing into rails
3. Slice C: popup launch wiring for dense flows
4. Slice D: right rail placeholder retirement
5. Slice E: deletion wave 1
6. Slice F: deletion wave 2
7. Slice G: TinyGlobe removal
8. Slice H: hardening and cleanup

## PR Template Requirements
- Gate targeted
- Requirement IDs covered
- Files in scope
- Validation evidence summary
- Rollback approach

## Review Criteria
- Scope isolation preserved
- Ownership boundaries not violated
- No anti-pattern regressions introduced
- Acceptance checks included or linked

## Work Package Metadata
Each package should track:
- Package ID
- Target phase/gate
- Complexity (S/M/L)
- File surface size (small/medium/large)
- Risk level
- Required reviewers

## PR Workflow
1. Open PR with gate and requirement references.
2. Attach validation plan before review starts.
3. Complete review checklist and capture evidence.
4. Merge only after gate owner confirms readiness.

## PR Anti-Bloat Rules
- Avoid mixing architecture introduction and deletion in same PR.
- Avoid cross-phase requirements in one merge.
- Split high-risk changes into reversible slices.
