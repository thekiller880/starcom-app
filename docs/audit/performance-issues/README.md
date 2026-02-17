# Performance Issues Audit

## Scope
Track high-impact performance issues, root causes, mitigation changes, and validation status for Starcom app runtime responsiveness.

## Current Focus: Continuous Polling / Refresh Pressure

### Summary
The app had multiple independent polling loops across marquee telemetry, network validation, and connection health checks. These loops could run concurrently from multiple mounted consumers and continue while tabs were hidden, causing avoidable CPU/network churn.

### Issue Log

#### PERF-001 — Marquee metrics sampled too aggressively
- **Area:** `src/components/MainPage/usePrimaryMarqueeData.ts`
- **Observed behavior:** Nostr/GeoINT snapshot sampling on fixed 15s cadence regardless of tab visibility.
- **Impact:** Frequent state updates and recomputation in background tabs.
- **Status:** Mitigated (Phase 1)
- **Mitigation:** Adaptive schedule (`15s` active, `60s` idle/hidden) with visibility-aware wake-up refresh.

#### PERF-002 — EIA auto-refresh ran while hidden
- **Area:** `src/hooks/useEnhancedEIAData.ts`
- **Observed behavior:** Periodic refresh continued when document was hidden.
- **Impact:** Unnecessary fetch/parse work while inactive.
- **Status:** Mitigated (Phase 1)
- **Mitigation:** Skip hidden-tab interval work and run catch-up refresh when tab returns and data is stale.

#### PERF-003 — Duplicate network validation intervals per consumer
- **Area:** `src/hooks/useNetworkValidation.ts`
- **Observed behavior:** Each hook consumer could create its own 30s monitor interval.
- **Impact:** Duplicate network probes and duplicate state churn.
- **Status:** Mitigated (Phase 2)
- **Mitigation implemented:** Shared endpoint monitor singleton (`one interval per endpoint`) with subscriber fanout and visibility-aware tick gating.

#### PERF-004 — Duplicate connection health intervals per consumer
- **Area:** `src/hooks/useConnectionHealth.ts`
- **Observed behavior:** Each hook consumer could create a 15s (now 30s) health-monitor interval.
- **Impact:** Repeated wallet/network checks and duplicated diagnostics work.
- **Status:** Mitigated (Phase 2)
- **Mitigation implemented:** Shared heartbeat singleton (`one timer app-wide`) + removed per-hook network revalidation calls in favor of shared network telemetry.

#### PERF-005 — Duplicate startup network bootstrap across hook consumers
- **Area:** `src/hooks/useNetworkValidation.ts`
- **Observed behavior:** Multiple mounted consumers could each run full startup network initialization (saved-cluster validate / auto-detect sweep).
- **Impact:** Redundant startup RPC validation calls and slower initial stabilization.
- **Status:** Mitigated (Phase 3)
- **Mitigation implemented:** Shared bootstrap cache + in-flight bootstrap promise deduplication so all consumers reuse one initialization result.

#### PERF-006 — Intel globe metrics polled at high frequency while hidden
- **Area:** `src/hooks/intelligence/useIntelGlobeSync.ts`
- **Observed behavior:** Performance/visibility metrics loop ran every second regardless of tab visibility.
- **Impact:** Unnecessary repeated state updates and service reads in background tabs.
- **Status:** Mitigated (Post-Phase 3)
- **Mitigation implemented:** Added hidden-tab gating, visibility wake refresh, and reduced loop cadence from `1000ms` to `3000ms`.

#### PERF-007 — Intel reports auto-refresh queried while hidden
- **Area:** `src/hooks/intelligence/useIntelReports3D.ts`
- **Observed behavior:** `queryAll()` auto-refresh continued on interval when tab was hidden.
- **Impact:** Avoidable data fetch/query and filter recomputation while inactive.
- **Status:** Mitigated (Post-Phase 3)
- **Mitigation implemented:** Added visibility-aware refresh guard and immediate refresh on visibility restore.

#### PERF-008 — Session engagement heartbeat fired in background tabs
- **Area:** `src/hooks/useAnalytics.ts`
- **Observed behavior:** Session engagement event loop fired every `30s` even when hidden.
- **Impact:** Unnecessary analytics event traffic and timer wakeups.
- **Status:** Mitigated (Post-Phase 3)
- **Mitigation implemented:** Added hidden-tab guard before firing heartbeat event.

## Phase Tracking

### Phase 1 (completed)
- Visibility-aware polling gates added.
- Background cadence reduced in marquee and health paths.

### Phase 2 (completed)
- Eliminated duplicate intervals using shared polling infrastructure for network + connection health paths.
- Preserved visibility-aware behavior and immediate refresh on return-to-focus.

### Phase 3 (completed)
- Deduplicated startup network bootstrap across `useNetworkValidation` consumers.
- Added shared bootstrap cache and single in-flight initialization promise for concurrent mounts.
- Updated successful `switchNetwork` path to refresh shared bootstrap state for subsequent hook consumers.

### Post-Phase 3 Hardening (in progress)
- Reduced additional hidden-tab polling in Intel visualization hooks and analytics heartbeat.
- Continuing scan of service-level intervals for singleton lifecycle and visibility gating gaps.

## Remaining High-Priority Candidates (Investigating)

### CAND-001 — Frequent diagnostics polling in SIWS flow
- **Area:** `src/hooks/useSIWS.ts`
- **Current pattern:** `setInterval` at `3000ms` for wallet-selection stability checks and `120000ms` diagnostics health checks.
- **Risk:** May run continuously in non-debug user sessions if diagnostics mode is enabled.
- **Status:** Mitigated (Minimal change)
- **Mitigation implemented:** Fast `3000ms` loop is now strictly diagnostics-gated and hidden-tab gated, with lightweight visibility wake check.

### CAND-002 — Data manager background tasks not lifecycle-scoped
- **Area:** `src/services/data-management/StarcomDataManager.ts`
- **Current pattern:** Constructor starts long-running intervals (`5m` cache optimization, `1h` metrics cleanup) without retained handles for explicit teardown.
- **Risk:** Multiple manager instances can stack background tasks.
- **Status:** Mitigated (Minimal change)
- **Mitigation implemented:** `createConfiguredDataManager()` is now promise-singletonized in `src/services/data-management/providerRegistry.ts`, preventing repeated manager construction in normal app paths.
- **Follow-up:** Add explicit `dispose()` lifecycle in `StarcomDataManager` if non-factory instantiation paths are introduced.

### CAND-003 — Service-level health/sync intervals across infrastructure managers
- **Area:** `src/services/IPFSNostrIntegrationManager.ts`, `src/services/IPFSNetworkManager.ts`, `src/services/PublicInfrastructureService.ts`
- **Current pattern:** Independent recurring sync/health intervals in multiple managers.
- **Risk:** Overlapping background loops when multiple services initialize concurrently.
- **Current assessment:** Managers are singleton-based and include interval cleanup paths; immediate duplicate-instance risk appears lower than initially suspected.
- **Status:** Mitigated (Minimal change)
- **Mitigation implemented:** Added hidden-tab guards to non-critical recurring health/discovery/sync interval callbacks in all three services.
- **Follow-up:** Consider unified poll registry adoption if additional interval-heavy services are added.

## Validation Checklist
- [x] Type-check passes on touched files.
- [x] Touched-file diagnostics clear.
- [ ] Runtime profiling before/after duplicate-interval consolidation.
- [x] Add follow-up telemetry notes after Phase 2 merge.
- [x] Phase 3 bootstrap dedupe merged and documented.
- [x] Post-Phase 3 Intel/analytics visibility-gated polling fixes merged.
