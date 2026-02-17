# National Territories Geometry Bake Execution Checklist

## Purpose
Operational checklist to execute the clean-room baked-geometry plan in:
- `docs/cybercommand/national-territories/geometry/NATIONAL_TERRITORIES_GEOMETRY_BAKE_SPEC.md`

This checklist is release-oriented: each phase must be explicitly marked PASS/FAIL.

---

## 0) Roles and Ownership

- **Pipeline Owner (Geo ETL):** source ingestion, topology build, bake outputs
- **QA Owner (Geometry):** invariants, failure matrix, offender regression
- **Runtime Owner (Web):** loader contract, device tier policy, rollback safety
- **Release Owner:** final no-publish checklist signoff

---

## 1) Preconditions (Blockers)

- [ ] Toolchain versions pinned and documented.
- [ ] Source provider chosen for this run (Overture primary, fallback only if approved).
- [ ] Source snapshot metadata available (version/date/url/checksum).
- [ ] Existing baked artifacts archived as last-known-good rollback package.

**Evidence required**
- [ ] Toolchain lockfile diff
- [ ] Source metadata record
- [ ] Rollback artifact reference

---

## 2) Phase A — Ingestion + Canonical Topology

### A1. Source ingest
- [ ] Fetch source snapshot into controlled raw directory.
- [ ] Record provider/dataset/version/date/SHA-256.
- [ ] Reject if checksum mismatch.

### A2. Canonical shared topology graph
- [ ] Build one shared arc/ring topology graph for all countries.
- [ ] Ensure borders and fills are derived from same graph.
- [ ] Persist topology graph hash.

### A3. Normalize and repair
- [ ] Enforce validity, winding, shell-hole containment.
- [ ] Resolve slivers/self-intersections before triangulation.

**Phase A pass criteria**
- [ ] Canonical topology generated
- [ ] Topology hash reproducible (same input -> same hash)
- [ ] Zero blocking topology defects

---

## 3) Phase B — Bake + Optimize + Package

### B1. Triangulation (offline only)
- [ ] Partition dateline/polar-sensitive regions into safe domains.
- [ ] Triangulate per part in local 2D domains.
- [ ] Reproject to globe coordinates.

### B2. Optimization
- [ ] Apply quantization and selected compression.
- [ ] Enforce index format safety (`uint16`/`uint32` bounds).
- [ ] Chunk outputs for lazy-load boundaries.

### B3. Build LOD packages
- [ ] Produce LOD0 / LOD1 / LOD2 territory artifacts.
- [ ] Produce matching border artifacts from same topology source.
- [ ] Emit manifest with source metadata and QA summary fields.

**Phase B pass criteria**
- [ ] All LOD artifacts generated
- [ ] Manifest complete and schema-valid
- [ ] Border/fill parity metadata present

---

## 4) Phase C — QA Gates (Blocking)

## C1. Mandatory geometry gates
- [ ] 100% index validity / no NaNs
- [ ] 0 self-intersections in triangulation domain
- [ ] Edge ratio and min-area thresholds pass
- [ ] Determinism hash check passes

## C2. Global topology invariants
- [ ] Coverage invariant passes (no unintended voids)
- [ ] Neighbor invariant passes (shared arcs)
- [ ] No-crack invariant passes
- [ ] No-overlap invariant passes except policy-marked disputed overlays
- [ ] Ring invariant passes post-transform
- [ ] Microstate survivability invariant passes

## C3. Failure Mode Matrix
- [ ] Matrix report generated
- [ ] All blocking rows pass

## C4. Golden offender regression suite
- [ ] Dateline set passes
- [ ] Polar set passes
- [ ] Exclave/enclave set passes
- [ ] Microstate/island set passes
- [ ] Disputed region set passes

**Phase C pass criteria**
- [ ] Zero blocking QA failures
- [ ] Zero new blocking offender regressions

---

## 5) Phase D — Performance + Runtime Integration

### D1. Budget gates
- [ ] Triangle budget pass for all LODs
- [ ] Transfer budget pass for all LODs (gzip/brotli)
- [ ] Decode/upload budget pass on low-tier profile

### D2. Runtime contract
- [ ] Runtime uses baked-only path for territory fills
- [ ] No runtime triangulation fallback in production mode
- [ ] Loader rejects mixed bake versions (hash consistency check)
- [ ] Rollback logic points to last-known-good baked package

### D3. Device tier behavior
- [ ] Tier A defaults to LOD0
- [ ] Tier B defaults to LOD1
- [ ] Tier C allows LOD2
- [ ] Dynamic downshift works when frame budget exceeded

**Phase D pass criteria**
- [ ] Low-tier benchmark sustains >=30 FPS in target interaction scenario
- [ ] Runtime contract checks verified in QA environment

---

## 6) CI/Release Task Wiring

## Required scripts/tasks
- [ ] `geo:bake` full bake (all LODs)
- [ ] `geo:qa` full mandatory + invariant checks
- [ ] `geo:publish` publish only if all blocking gates pass
- [ ] decode/profile check task integrated into CI
- [ ] offender regression task integrated into CI

## CI policy checks
- [ ] Fail on mandatory gate violations
- [ ] Fail on invariant violations
- [ ] Fail on offender regressions
- [ ] Fail on budget violations

---

## 7) No-Publish Final Signoff

Release Owner must explicitly confirm all:
- [ ] Source metadata/checksum pinned
- [ ] Canonical topology hash reproducible
- [ ] Mandatory QA + invariants passed
- [ ] Failure matrix clear of blockers
- [ ] Golden offender regressions clear
- [ ] Performance budgets passed
- [ ] Runtime baked-only contract validated

**Decision**
- [ ] APPROVED FOR PUBLISH
- [ ] REJECTED (attach blocking failures)

---

## 8) Suggested Command Sequence (Template)

Update this section to actual commands implemented in repo.

1. `npm run geo:bake`
2. `npm run geo:qa`
3. `npm run geo:publish`
4. Run low-tier performance profile task
5. Run offender regression suite task

---

## 9) Artifacts to Attach to PR/Release

- [ ] Source metadata + checksum record
- [ ] Topology hash report
- [ ] QA report (mandatory + invariants)
- [ ] Failure mode matrix report
- [ ] Golden offender regression report
- [ ] Budget report (triangles/bytes/decode)
- [ ] Runtime validation report (device tiers + rollback)
