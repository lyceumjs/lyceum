/**
 * Course aggregate — the full Lyceum-owned content hierarchy (FR-008, spec 002):
 * course → units → lessons → content. Saved and loaded whole through the port;
 * richer modeling (catalog, enrollment, progress, …) arrives in later features.
 */
export interface ContentRef {
  id: string;
  title: string;
  /** Id of the interactive content in the H5P content storage, when applicable. */
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
  units: Unit[];
}

/** Persistence port for the course aggregate. `save` upserts by id. */
export interface CourseStorePort {
  save(course: Course): Promise<void>;
  getById(id: string): Promise<Course | undefined>;
}
