# Geopolitical Bake Scripts (Scaffold)

This directory contains the initial Phase A scaffold for national territories geometry baking.

## Commands

- `npm run geo:bake`  
  Generates baked territory mesh artifacts under `.generated/geopolitical/territories-baked` from `public/geopolitical/world-territories-lod*.geojson`.

- `npm run geo:qa`  
  Runs schema + geometry QA checks (index/mesh buffers + mandatory QA thresholds).

- `npm run geo:publish`  
  Copies generated artifacts to `public/geopolitical/territories-baked`.

## Optional flags

All commands support:

- `--lods 0,1,2`
- `--source-dir <path>`
- `--generated-dir <path>`
- `--public-dir <path>`

## Notes

- This scaffold does **not** yet perform full topology repair or final triangulated mesh bake.
- Current Phase A includes deterministic triangulation and per-part QA metrics.
- Next hardening steps still pending include external topology repair (`make_valid` style) and additional CI diff gates as defined in:
  - `docs/cybercommand/national-territories/geometry/NATIONAL_TERRITORIES_GEOMETRY_BAKE_SPEC.md`
