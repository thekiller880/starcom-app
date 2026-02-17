# Globe Cursor Trail – Plan & Safeguard Checklist

## Objective
Implement a smooth trailing cursor indicator on the globe surface without increasing raycast frequency.

## Plan
1. Keep current raycast cadence and event wiring unchanged.
2. Convert raycast hits into a `targetNormal` + `targetRadius` (surface anchor target).
3. Animate a separate `displayNormal` in `requestAnimationFrame` toward `targetNormal`.
4. Move indicator along the sphere surface using axis-angle stepping (surface-constrained path).
5. Add edge-case guards (invalid vectors, no-hit behavior, hidden tab, reduced motion).
6. Validate compile and run a soak test in IntelReports mode.

## Safeguard Checklist
- [x] Separate target/display vectors to avoid snap updates in mousemove path.
- [x] Surface-constrained interpolation (axis-angle) to avoid through-globe straight-line motion.
- [x] Angular step cap (`max deg/sec`) to prevent teleport-like jumps.
- [x] Time-based damping (`deltaTime`) for frame-rate independent behavior.
- [x] Invalid target guard (non-finite values or invalid radius).
- [x] Hide indicator when no globe intersection exists.
- [x] Hide indicator when intel model is hovered (avoid conflicting hover semantics).
- [x] Hidden-tab guard to avoid large catch-up jumps.
- [x] Reduced-motion compatibility (`prefers-reduced-motion`).
- [x] Reuse vectors/raycaster to avoid allocation churn in hot path.
- [x] Dynamic tail rendered from preallocated line geometry (no per-frame object churn).
- [x] Tail length scales with movement intensity (tactical feedback under fast pointer motion).
- [x] Tail hidden for reduced-motion users and when no valid globe target is active.

## Tunables (Current Defaults)
- `CURSOR_TRAIL_RESPONSIVENESS = 16` (more tactical)
- `CURSOR_TRAIL_MAX_DEG_PER_SEC = 300` (faster pursuit)
- `CURSOR_SURFACE_OFFSET = 1`
- `CURSOR_TAIL_MAX_POINTS = 24`
- `CURSOR_TAIL_MIN_POINTS = 4`

## Validation Checklist
- [x] TypeScript compile passes.
- [ ] Verify indicator remains smooth during rapid mouse movement.
- [ ] Verify no indicator snapping after tab background/foreground transitions.
- [ ] Verify behavior near horizon and extreme cursor jumps.
- [ ] Verify reduced-motion preference behavior.
