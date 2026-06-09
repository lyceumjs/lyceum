# Contract: Public package surface

The foundation's public contract is its **subpath exports** — the small, documented surface a host
imports (Principle I, FR-006). No deep imports into internals are supported.

## Entry points

| Import specifier | Maps to | Intended consumer use |
|---|---|---|
| `@lyceumjs/lms` | `src/core` | Domain types + ports (the database-agnostic core) |
| `@lyceumjs/lms/runtime` | `src/runtime` | Framework-agnostic H5P handlers to mount in a host |
| `@lyceumjs/lms/fe` | `src/fe` | H5P content components for the host's React UI |
| `@lyceumjs/lms/testing` | `src/testing` | In-memory reference adapter + adapter contract-test helper |

> The published package is **`@lyceumjs/lms`** (under the `lyceumjs` GitHub org); core is the root
> export. The **shape** above — four subpath exports — is the contract.

## Rules

- `package.json` declares `"type": "module"` and an `"exports"` map enumerating exactly the four
  subpaths above (plus types via `"exports"` conditions). Anything not listed is private.
- Each subpath resolves to a built `.js` + `.d.ts` under `dist/`.
- Consumers MUST NOT import from `dist/**` internal paths or `src/**`; only the four specifiers are
  contractual.
- No bundled HTTP server is exported — `runtime` provides handlers only (ADR 0001).

## Verification

- A test asserts each of the four specifiers resolves and re-exports its folder's public API.
- `dependency-cruiser` (see `import-boundary.md`) confirms no cross-folder leakage violates the
  surface.
