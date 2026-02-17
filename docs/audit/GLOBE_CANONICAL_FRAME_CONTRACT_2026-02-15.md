# Globe Canonical Frame Contract — 2026-02-15

## Purpose
Define one authoritative Earth coordinate frame contract for all globe subsystems.

## Canonical Conventions
- Coordinate input is geodetic latitude/longitude in degrees.
- Latitude is north-positive in `[-90, 90]`.
- Longitude is east-positive and normalized to `[-180, 180)`.
- Prime meridian is longitude `0°`.

## Globe Mapping Contract
For radius `r`, latitude `φ`, longitude `λ` (radians):

`x = r * cos(φ) * cos(λ)`

`y = r * sin(φ)`

`z = -r * cos(φ) * sin(λ)`

This establishes:
- `(lat=0, lon=0)` maps to `+X`.
- `(lat=0, lon=90E)` maps to `-Z`.
- North pole `(lat=90)` maps to `+Y`.

## Inverse Mapping Contract
Given point `(x, y, z)` and radius `r`:

`lat = asin(clamp(y / r, -1, 1))`

`lon = normalize(atan2(-z, x))`

Where `normalize` returns longitude in `[-180, 180)`.

## Required Invariants
1. Round-trip stability: `geo -> vec -> geo` preserves coordinates within numeric tolerance.
2. Radius preservation: `|vec| == r` for finite inputs.
3. Cardinal anchors:
   - `0°,0° -> +X`
   - `0°,90° -> -Z`
   - `0°,-90° -> +Z`
   - `0°,180° -> -X`
4. Pole behavior: longitude may vary numerically at poles, but vector must remain on `±Y` axis.

## Runtime Diagnostics Contract
- A shared diagnostic probe API must expose canonical anchor vectors and round-trip metrics.
- All subsystem audits must compare against this probe before adding local compensation.

## Subsystem Compliance Rules
- New globe subsystems must use shared mapping utilities (`src/utils/globeCoordinates.ts`) directly or through explicit adapters.
- Any adapter introducing axis inversion or rotation must document:
  - why it exists,
  - exact transform,
  - migration plan to canonical frame.

## Phase Gate Usage
This contract is the gate for:
- Phase 6.2 contract tests,
- Phase 6.3 frame diagnostics,
- Phase 7 geopolitical reconciliation.
