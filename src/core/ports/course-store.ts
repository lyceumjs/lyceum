/**
 * Course aggregate — the full Lyceum-owned content hierarchy (FR-008, spec 002;
 * grown by spec 003): course → units → lessons → content. Saved and loaded whole
 * through the port. Ids are engine-minted and host-opaque (003 R2); `createdAt`
 * drives the catalog's newest-first order (003 R3).
 */
export interface ContentRef {
  id: string;
  title: string;
  /** Id of the interactive content in the H5P content storage, when applicable.
   * Opaque this iteration — never validated against H5P storage (spec 003). */
  h5pContentId?: string;
}

export interface Lesson {
  id: string;
  title: string;
  contents: ContentRef[];
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  /** Optional descriptive set (spec 003 FR-003). */
  description?: string;
  /** URL-safe (`^[a-z0-9]+(-[a-z0-9]+)*$`), unique across the whole store when present. */
  slug?: string;
  /** Opaque reference (URL or host asset id); the engine never resolves it. */
  coverImage?: string;
  /** ISO-8601 UTC, set once at create, immutable. */
  createdAt: string;
  units: Unit[];
}

/** Top-level info: what `createCourse` takes and `updateCourseInfo` replaces as a whole. */
export interface CourseInfo {
  title: string;
  description?: string;
  slug?: string;
  coverImage?: string;
}

/** Catalog read model — derived in core from full aggregates, never stored. */
export interface CourseSummary {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  coverImage?: string;
  createdAt: string;
  unitCount: number;
  /** Total lessons across all units. */
  lessonCount: number;
}

/**
 * Persistence port for the course aggregate. `save` upserts by id.
 * Grown by spec 003 (contracts/domain-ports.md): `list` returns the courses the
 * adapter supplies to the catalog (availability is the adapter's rule, FR-004);
 * `getBySlug` looks up across the ENTIRE store (it backs the slug-uniqueness
 * invariant and must not be catalog-filtered); `deleteById` is idempotent.
 */
export interface CourseStorePort {
  save(course: Course): Promise<void>;
  getById(id: string): Promise<Course | undefined>;
  list(): Promise<Course[]>;
  getBySlug(slug: string): Promise<Course | undefined>;
  deleteById(id: string): Promise<void>;
}
