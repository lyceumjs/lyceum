# Lyceum

Lyceum is an open-source, database-agnostic **Learning Management System (LMS)**: an H5P-based
interactive learning frontend with a backend for content runtime and learning records. It is
built to be dropped into other projects — and is the LMS engine the `lms-starter-kit` integrates.

See [.specify/memory/constitution.md](.specify/memory/constitution.md) for project principles.

## What Lyceum is (and how to build it)

- **Open source, clean, and easy to integrate.** Lyceum is a library/engine others embed in their
  own apps, not a monolith. Keep the public surface small, dependencies light, and the integration
  path obvious. License stays MIT-class (commercially unrestricted).
- **Opinionated anyway.** Easy-to-integrate does not mean infinitely configurable: Lyceum ships
  sane defaults and conventions, and prefers one clear opinionated path over endless options.
- **Database-agnostic core.** Domain/business logic carries zero persistence coupling; storage is
  reached through ports/adapters. PostgreSQL is the dev/reference adapter, not a hard dependency.
- **H5P on the frontend, with a backend.** The FE is built on H5P (interactive content); a BE side
  handles content runtime, storage adapters, and learning records. (How the BE plugs into the
  `lms-starter-kit` is still to be worked out — flagged, not yet decided.)
- **Compatible with the starter-kit environment.** Node.js + TypeScript, runnable alongside the
  starter kit's Next.js / Payload / PostgreSQL stack, with Dockerized local development.

## How the agent works here

- Valery is the decision-maker and sole author of all specs and decisions (business, domain,
  stack, architecture). The agent researches, supports coding, and gives clearly-labelled
  recommendations — it does not decide.
- Persist to specs only what Valery has stated or explicitly accepted. Propose in chat and wait
  for acceptance; never save assumed or unconfirmed content.
- Development is **SDD + TDD**: specs/ADRs precede code; business logic is covered by tests
  (red-green-refactor). Keep specs and this file thin and non-repeating.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/002-example-smoke-harness/plan.md
<!-- SPECKIT END -->
