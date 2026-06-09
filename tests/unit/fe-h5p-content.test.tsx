// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(cleanup);

vi.mock('@lumieducation/h5p-react', () => ({
  H5PPlayerUI: (props: {
    contentId: string;
    onxAPIStatement?: (statement: unknown, context: unknown, event: unknown) => void;
  }) => (
    <button
      type="button"
      data-testid="h5p-player"
      data-cid={props.contentId}
      onClick={() => props.onxAPIStatement?.({ verb: 'answered' }, undefined, {})}
    />
  ),
  H5PEditorUI: () => null,
}));

import { H5PContent } from '../../src/fe/index.js';

describe('H5PContent (FR-003 FE base)', () => {
  it('renders a wrapper and forwards contentId to the H5P player', () => {
    render(<H5PContent contentId="c-123" loadContentCallback={async () => ({})} />);
    expect(screen.getByTestId('lyceum-h5p-content')).toBeTruthy();
    expect(screen.getByTestId('h5p-player').getAttribute('data-cid')).toBe('c-123');
  });

  it('forwards xAPI statements to the host (learning-records seam, ADR 0001)', () => {
    const onxAPIStatement = vi.fn();
    render(
      <H5PContent
        contentId="c-123"
        loadContentCallback={async () => ({})}
        onxAPIStatement={onxAPIStatement}
      />,
    );
    screen.getByTestId('h5p-player').click();
    expect(onxAPIStatement).toHaveBeenCalledWith({ verb: 'answered' }, undefined, {});
  });
});
