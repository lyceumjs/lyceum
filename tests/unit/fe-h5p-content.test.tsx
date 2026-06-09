// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@lumieducation/h5p-react', () => ({
  H5PPlayerUI: (props: { contentId: string }) => (
    <div data-testid="h5p-player" data-cid={props.contentId} />
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
});
