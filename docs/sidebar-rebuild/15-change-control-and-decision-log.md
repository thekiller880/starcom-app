# 15 Change Control and Decision Log

## Purpose
Capture all architectural and scope decisions affecting execution.

## Decision Record Template
- Decision ID
- Date
- Context
- Options considered
- Decision made
- Tradeoffs
- Follow-up actions
- Approver

## Governance Rules

## Decision Severity Levels
- Level 1: local implementation detail; no contract change
- Level 2: contract/scope interpretation or gate-impacting execution change
- Level 3: program-level scope, acceptance baseline, or phase sequencing change

## Approval Routing
- Level 1: document owner approval
- Level 2: architecture owner + engineering lead
- Level 3: architecture owner + engineering lead + program owner

## Auditability Requirements
- Every approved change references impacted requirements.
- Every rejected change includes reason and reconsideration conditions.
- Every decision entry includes effective date and superseded entries (if any).

## Decision Entries

### DEC-001 (Level 2)
- Date: 2026-02-13
- Context: Canonical secondary mode terminology drift (`Satellites` vs `NetworkInfrastructure`)
- Options considered:
	- Keep legacy `NetworkInfrastructure`
	- Use `Satellites` as canonical UI term
- Decision made: `Satellites` is the canonical UI mode term.
- Tradeoffs: Legacy type/service references remain temporarily and are tracked for hardening phase.
- Follow-up actions: Maintain hardening backlog inventory and remove active-path drift in P7.
- Approver: Architecture owner + engineering lead

### DEC-002 (Level 2)
- Date: 2026-02-13
- Context: Runtime acceptance baseline for rebuild execution
- Options considered:
	- Embedded-only baseline
	- Embedded + mandatory standalone parity
- Decision made: Embedded runtime is primary acceptance baseline; standalone parity is optional unless phase scope requires it.
- Tradeoffs: Faster delivery cadence with explicit parity check when needed.
- Follow-up actions: Keep optional standalone checks in validation plan and phase notes.
- Approver: Architecture owner + engineering lead

### DEC-003 (Level 2)
- Date: 2026-02-13
- Context: Stage 2 implementation and contract validation completed; gate closure required formal evidence linkage.
- Options considered:
	- Keep Stage 2 open until broader P2/P3 migration completes.
	- Close P1 scope now with explicit requirement traceability and test/compile evidence.
- Decision made: Close P1 gate now, with scoped requirements `R-001`, `R-002`, `R-003`, and `R-010` marked validated.
- Tradeoffs: Enables forward progress into planned P2/P3 work while preserving audited closure criteria for implemented scope.
- Follow-up actions: Document closure evidence and prepare for P2/P3 planning.
- Approver: Engineering lead, QA lead

### DEC-004 (Level 2)
- Date: 2026-02-13
- Context: P2/P3 implementation slices completed; popup migration and right-rail placeholder retirement required formal gate closure and sign-off.
- Options considered:
	- Keep P2/P3 gate open until P4 deletion wave starts.
	- Close P2/P3 now with scoped evidence and proceed to P4 retirement planning.
- Decision made: Close P2/P3 gate now with validated evidence for popup migration and right-rail role-purity outcomes.
- Tradeoffs: Enables controlled progression into deletion waves while preserving explicit evidence for dense-flow popup routing and placeholder retirement.
- Follow-up actions: Execute P4 safe/empty deletion wave with reference scans and compile/build validation.
- Approver: Engineering lead, QA lead

### DEC-005 (Level 2)
- Date: 2026-02-13
- Context: P4 safe/empty deletion wave execution completed; required sign-off for artifact retirement and compile/build stability.
- Options considered:
	- Defer deletion of safe/empty artifacts until P5 behavioral retirements.
	- Close P4 now with reference-scan and build/type evidence.
- Decision made: Close P4 now and retain focus on controlled wave sequencing (behavioral retirements deferred to P5).
- Tradeoffs: Reduces dead-surface maintenance overhead immediately while preserving low-risk deletion boundary for this phase.
- Follow-up actions: Begin P5 replacement-path verification and behavioral module retirement planning.
- Approver: Engineering lead, QA lead

### DEC-006 (Level 2)
- Date: 2026-02-13
- Context: P6 TinyGlobe retirement slice completed; required gate closure decision for legacy mini-globe removal and validation evidence.
- Options considered:
	- Keep TinyGlobe mounted in legacy left-sidebar composition for additional fallback runway.
	- Retire TinyGlobe from left-sidebar composition now and close P6 with source-scan + compile/build evidence.
- Decision made: Retire TinyGlobe from left-sidebar composition and close P6 with validated evidence.
- Tradeoffs: Removes a redundant mini-globe surface and simplifies left-sidebar legacy composition, while preserving active rail + popup interaction pathways.
- Follow-up actions: Continue P5 behavioral retirement closure and keep P7 hardening backlog focused on terminology/type cleanup.
- Approver: Engineering lead, QA lead

### DEC-007 (Level 2)
- Date: 2026-02-13
- Context: P5 behavioral deletion wave targets were retired and required formal gate closure with replacement-path evidence.
- Options considered:
	- Keep P5 open pending additional broad regression runs beyond targeted replacement-path suites.
	- Close P5 now with explicit behavioral-target removal evidence, focused workflow parity tests, and compile/build validation.
- Decision made: Close P5 now with scoped replacement-path evidence and no observed blocker regressions.
- Tradeoffs: Advances program sequencing into P7 hardening while preserving auditable evidence for behavioral-module retirement safety.
- Follow-up actions: Execute P7 active-path hardening (type/terminology cleanup and ownership boundary verification).
- Approver: Engineering lead, QA lead

### DEC-008 (Level 2)
- Date: 2026-02-13
- Context: P7 active-path hardening slice required reducing SpaceWeather context coupling, removing active-path `@ts-nocheck` dependencies, and preserving rail behavior.
- Options considered:
	- Keep monolithic SpaceWeather context and defer hardening to final P7 closure.
	- Perform an incremental modular refactor now (types + visualization/telemetry hook extraction) and remove active-path `@ts-nocheck` usage immediately.
- Decision made: Execute incremental modular refactor now and remove active-path `@ts-nocheck` from SpaceWeather rail dependencies.
- Tradeoffs: Adds temporary coordination overhead across new modules while reducing active-path technical debt and keeping touched files under the monolith threshold.
- Follow-up actions: Complete remaining P7 terminology/type hardening in `CyberCommandVisualization`/data-service surfaces and then run final acceptance closeout.
- Approver: Engineering lead, QA lead

### DEC-009 (Level 2)
- Date: 2026-02-13
- Context: Remaining P7 terminology drift existed in CyberCommand type/service contracts and `CyberCommandDataService.ts` exceeded the monolith threshold while being in active hardening scope.
- Options considered:
	- Keep legacy `NetworkInfrastructure` naming internally and defer contract normalization to post-P7 maintenance.
	- Canonicalize contracts to `Satellites` now and split `CyberCommandDataService.ts` by extracting mock-generator responsibilities.
- Decision made: Canonicalize contracts to `Satellites` now and modularize `CyberCommandDataService.ts` via extracted `cyberCommand/MockDataGenerator.ts`.
- Tradeoffs: Requires synchronized type/service/test updates, but eliminates terminology drift in tracked contract surfaces and keeps touched implementation files modular.
- Follow-up actions: Complete remaining P7 phase-close validation (`R-008` acceptance matrix + residual risk sign-off) before final gate closure.
- Approver: Engineering lead, QA lead

### DEC-010 (Level 2)
- Date: 2026-02-13
- Context: P7 hardening slices completed with acceptance evidence; formal gate-closure decision required.
- Options considered:
	- Keep P7 open pending Stage 5.2 documentation/reporting closeout tasks.
	- Close P7 gate now based on satisfied hardening exit criteria and keep Stage 5.2 open for program-level closeout.
- Decision made: Close P7 gate now; continue Stage 5.2 closeout tasks separately.
- Tradeoffs: Preserves precise gate accounting (delivery gate closed, reporting closeout still open) and avoids conflating implementation hardening with final reporting activities.
- Follow-up actions: Complete Stage 5.2 final doc sync, gate confirmation, and program sign-off package.
- Approver: Engineering lead, QA lead

### DEC-011 (Level 3)
- Date: 2026-02-13
- Context: Stage 5.2 closeout artifacts completed; final program sign-off decision required.
- Options considered:
	- Keep program open for additional non-blocking optimization items (chunking/perf warnings outside rebuild scope).
	- Close the sidebar rebuild program at current gate-complete state and track non-scope optimizations separately.
- Decision made: Close program now with all gates (`G0`, `G1`, `P1`..`P7`) recorded closed and acceptance evidence archived.
- Tradeoffs: Maintains scope discipline and avoids expanding program objectives into unrelated optimization work.
- Follow-up actions: Track non-blocking bundle optimization warnings in standard backlog outside sidebar rebuild program governance.
- Approver: Architecture owner + engineering lead + program owner
