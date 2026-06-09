import type { ReactElement } from 'react';
import { H5PPlayerUI } from '@lumieducation/h5p-react';

export interface H5PContentProps {
  contentId: string;
  /** Host-provided loader hitting Lyceum's runtime AJAX handlers (ADR 0001 seam). */
  loadContentCallback: (
    contentId: string,
    contextId?: string,
    asUserId?: string,
    readOnlyState?: boolean,
  ) => Promise<unknown>;
  onInitialized?: (contentId: string) => void;
}

/**
 * Minimal H5P frontend base (FR-003): wraps `@lumieducation/h5p-react`'s player so a
 * host can render H5P content against Lyceum's runtime handlers.
 */
export function H5PContent(props: H5PContentProps): ReactElement {
  return (
    <div
      className="lyceum-h5p-content"
      data-testid="lyceum-h5p-content"
      data-content-id={props.contentId}
    >
      <H5PPlayerUI
        contentId={props.contentId}
        loadContentCallback={props.loadContentCallback as never}
        onInitialized={props.onInitialized}
      />
    </div>
  );
}
