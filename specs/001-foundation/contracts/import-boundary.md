# Contract: Core import boundary (Principle VII)

The boundary is **enforced by dependency-cruiser**, not by convention. This contract states the
rules the configuration must encode and how they are verified.

## Forbidden rules (must fail the build/CI when violated)

1. **`core` may not import `runtime` or `fe`.**
   `src/core/**` → `src/runtime/**` or `src/fe/**` = error.
2. **`core` may not import the H5P server library.**
   `src/core/**` → `@lumieducation/h5p-server` (or any `@lumieducation/*` server pkg) = error.
3. **`core` may not import any database or HTTP library.**
   `src/core/**` → known db drivers / ORMs / query builders / HTTP server or client libs = error.
   (Encoded as a path/dependency pattern list, extended as deps are added.)

## Allowed (for clarity)

- `core` → `core`, and Node/TS standard library only.
- `runtime` → `core` and `@lumieducation/h5p-server`.
- `fe` → `core` (types) and FE/H5P client libraries.
- `testing` → `core` (it implements `core` ports).

## Configuration

- A `.dependency-cruiser.cjs` at repo root encodes the rules above as `forbidden` entries with clear
  `comment`/`severity: error` fields.
- A package script (e.g. `pnpm boundary` / wired into `pnpm test` and CI) runs
  `depcruise src --config`.

## Verification

- An intentional violation fixture (a temporary `core` import of `runtime`) is shown to fail the
  boundary check during development, then removed — proving the rule bites.
- CI runs the boundary check and fails the pipeline on any violation.
