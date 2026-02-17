# Phase 1 Second-Pass Performance Audit

## Objective
Stabilize long-session runtime performance (30–90 minutes) by reducing cumulative main-thread work and repeated scene churn in active CyberCommand + IntelReports usage.

## What was addressed in Phase 1

### 1) Globe + Intel marker churn
- File: `src/components/Globe/Globe.tsx`
- Changes:
  - Added marker signature dedupe to skip redundant `setIntelReports` updates.
  - Prevented marker-group remove/add churn from effect cleanup on every marker refresh.
  - Reduced high-frequency production logging for marker sync and scene add/remove.
- Expected impact:
  - Lower React rerender pressure.
  - Fewer Three.js scene graph mutations.
  - Reduced GC churn from repeated object graph updates.

### 2) Nostr ingest background overhead
- File: `src/services/intel/NostrStarcomIntelIngest.ts`
- Changes:
  - Production no longer starts debug heartbeat interval.
  - Relay transport probe fan-out runs in verbose/dev only.
  - Startup/stop/no-event diagnostics gated to verbose/dev.
- Expected impact:
  - Less timer wake-up overhead.
  - Fewer extra websocket probe operations in production.
  - Lower console overhead during long runs.

### 3) Wallet extension diagnostics overhead
- File: `src/hooks/useSIWS.ts`
- Changes:
  - Deep extension analysis runs in diagnostics mode only.
  - Health check interval reduced to every 2 minutes when enabled.
- Expected impact:
  - Reduced periodic object construction and logging on main thread.

### 4) Team sync cadence and logs
- File: `src/services/RealTimeTeamService.ts`
- Changes:
  - Production sync cadence increased to 120s (dev remains 30s).
  - Verbose sync logs gated to development.
- Expected impact:
  - Lower background CPU/network pressure.

### 5) Discord polling pressure
- File: `src/hooks/useDiscordStats.ts`
- Changes:
  - Production refresh interval increased to 120s (dev remains 30s).
  - Fetch/success logs gated to development.
- Expected impact:
  - Lower periodic fetch and render pressure.

### 6) Input-handler logging cost
- File: `src/components/Globe/Enhanced3DGlobeInteractivity.tsx`
- Changes:
  - Comprehensive drag/click telemetry logs gated to development only.
- Expected impact:
  - Reduced event-loop overhead under continuous drag interactions.

---

## Second-pass audit protocol

### Test profile
- Environment: production build (`vercel --prod` URL)
- Mode: `CyberCommand` + `IntelReports`
- Duration: 60 minutes (minimum)
- Interaction script:
  - Every 5 minutes: 20–30 seconds globe drag + hover marquee + mode toggle out/in once.
  - Keep tab active for at least 40 minutes cumulative.

### Capture points
Collect snapshots at:
- T+0m (cold)
- T+15m
- T+30m
- T+45m
- T+60m

For each snapshot, record:
1. FPS / frame time (DevTools Performance panel sampling)
2. Long task count (`>50ms`) in the sampled window
3. JS heap trend (increasing vs stable)
4. Console signature checks:
   - No repeated `Intel Report 3D marker group added` spam under steady mode
   - No recurring SIWS deep analyzer logs in production
   - No Nostr heartbeat spam in production
5. Network checks:
   - Polling endpoints fire at expected reduced cadence (Discord / team sync)

---

## Pass/Fail criteria

### Pass
- No monotonic FPS decay over the hour in the same scene/mode.
- Long tasks do not trend upward with time.
- Heap shows bounded oscillation (no persistent upward slope).
- No repeated scene add/remove spam without mode changes.
- Background polling cadence matches Phase 1 targets.

### Fail
- Progressive stutter appears while data volume and interactions remain similar.
- Scene churn logs recur during stable mode.
- Heap keeps rising without returning to baseline.

---

## If failed (Phase 1.1 focus)
1. Add worker offload for GEO parsing + Nostr event normalization (UI thread remains render-only).
2. Add strict interval ownership registry for active-mode services.
3. Add scene mutation guardrail counters (attach/detach, object create/dispose budgets per minute).
4. Add low-overhead runtime perf watermark panel for session diagnostics.

---

## Notes from observed logs that informed this pass
- Repeated marker scene add logs implied scene graph churn.
- Frequent SIWS extension diagnostics and periodic service logs implied avoidable main-thread and console overhead.
- Multiple mode toggles triggered repeated Nostr subscription cycles; cleanup remained functional but noisy and costly.
