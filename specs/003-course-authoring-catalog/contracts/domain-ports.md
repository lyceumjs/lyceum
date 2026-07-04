# Contract: grown `CourseStorePort`

The persistence seam a host implements (ADR 0001). Additions in **bold**; conformance is proven
by the published contract suite (`@lyceumjs/lms/testing` → `runCourseStoreContract`), which
grows to cover every addition.

```ts
interface CourseStorePort {
  /** Upsert the whole aggregate by id. (unchanged) */
  save(course: Course): Promise<void>;
  /** (unchanged) */
  getById(id: string): Promise<Course | undefined>;

  /**
   * NEW — the courses this adapter supplies to the catalog, in any order (core sorts).
   * Availability is the ADAPTER'S rule (FR-004): the reference in-memory adapter returns
   * everything it stores; a platform adapter may return only what its own workflow has
   * published. Lyceum applies no further filtering.
   */
  list(): Promise<Course[]>;

  /**
   * NEW — lookup across the ENTIRE store, including courses the adapter would not supply
   * to the catalog. Backs the slug-uniqueness invariant; must not be catalog-filtered.
   */
  getBySlug(slug: string): Promise<Course | undefined>;

  /** NEW — idempotent removal; resolves even if the id is absent (existence is the domain's check). */
  deleteById(id: string): Promise<void>;
}
```

## Contract-suite additions (what `runCourseStoreContract` asserts)

1. `list()` returns every saved course exactly once (reference semantics); subsequent `save` of
   an existing id does not duplicate it.
2. `getBySlug` finds a saved course by slug, returns `undefined` for an unknown slug, and still
   finds courses after their info (including slug) was re-saved.
3. `deleteById` removes the course from `getById`, `getBySlug`, and `list`; deleting an unknown
   id resolves without error; delete then re-`save` works.
4. Round-trip fidelity extends to the new fields (`description`, `slug`, `coverImage`,
   `createdAt`) and to structures produced by the operations (order preserved at every level).

## Implementations in scope this feature

- `src/testing/in-memory-course-store.ts` — reference adapter (supplies everything to `list`).
- `example/src/adapters/` PG adapter — grows the three methods + slug/created_at columns
  (example-only; the real host adapter lives in the starter-kit per ADR 0001).
