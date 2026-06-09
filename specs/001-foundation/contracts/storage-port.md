# Contract: Storage-port pattern + adapter conformance

This feature defines the **pattern** for persistence ports and the conformance mechanism — not any
real domain port (the domain is deferred). It exists to satisfy SC-002 (db-agnostic, provable via an
in-memory adapter) and the fail-fast Edge Case.

## Port (shape)

A port is a `core`-owned interface expressed in domain terms only — no SQL, no driver types, no
HTTP. Illustrative shape (a real domain port arrives with the first domain feature):

```text
// src/core/ports/<capability>.ts  — interface only, lives in core
interface <Capability>Port {
  // domain-typed methods, e.g. save(entity), getById(id), ... returning Promises
}
```

Contractual rules:

- Ports are **interfaces**, declared in `core`, referencing only `core` domain types.
- `core` logic depends on the port, never on a concrete adapter.
- Ports carry no persistence-technology detail in their signatures.

## Adapter

An adapter implements a port against a concrete store.

- The foundation ships **one** adapter: an **in-memory** implementation in `src/testing`.
- The real PostgreSQL adapter is **out of scope here** — it lives in the consuming host (ADR 0001).

## Adapter contract test

`src/testing` exports a reusable Vitest suite, `runAdapterContract(makeAdapter)`, that exercises a
port's required behaviors against any adapter factory.

- The in-memory adapter MUST pass `runAdapterContract` in this repo (`tests/contract`).
- A host runs the same suite against its Postgres adapter on its side — Lyceum's own tests do not
  run in hosts (ADR 0001).

## Fail-fast wiring

When the engine is wired with **no** adapter for a required port, it MUST throw a clear, explicit
error naming the missing port — never silently fall back to a default database (spec Edge Case).

## Verification

- `tests/contract`: in-memory adapter passes `runAdapterContract`.
- `tests/unit`: a `core` operation runs end-to-end against the in-memory adapter with zero
  PostgreSQL dependency (SC-002).
- `tests/unit`: wiring with a missing adapter throws the documented fail-fast error.
