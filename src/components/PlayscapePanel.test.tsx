import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeShareToken } from '../lib/shareToken';
import { renderWithTheme } from '../test/render';
import { PlayscapePanel } from './PlayscapePanel';

const STORY_ID = 'components-button--primary';

const setSelectedPanel = vi.fn();
const emit = vi.fn();

vi.mock('storybook/manager-api', () => ({
  useStorybookState: () => ({ storyId: STORY_ID }),
  useStorybookApi: () => ({ setSelectedPanel }),
  // ForkEditor talks to the real Canvas over the standard channel now (no more embedded iframe
  // of its own) — these tests only exercise the localStorage-driven confirm/cancel flow, not
  // that request/response handshake, so a no-op emit that doesn't crash is enough here.
  useChannel: () => emit,
}));

function setUrl(search: string) {
  window.history.replaceState(null, '', `/${search}`);
}

beforeEach(() => {
  localStorage.clear();
  setSelectedPanel.mockClear();
  setUrl('');
});

describe('a user opening the Playscape panel for a story they have not forked', () => {
  it('is invited to start editing via a "Default" entry', () => {
    renderWithTheme(<PlayscapePanel active />);

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Click to start editing')).toBeInTheDocument();
  });
});

describe('a user who follows a Playscape share link for the first time', () => {
  it('is shown the code for review before anything runs, and nothing is saved yet', () => {
    const token = encodeShareToken({ id: 'shared-1', name: 'Shared Fork', source: '<Button label="Shared" />' });
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);

    expect(screen.getByText(/Shared Fork/)).toBeInTheDocument();
    expect(screen.getByText(/reading cookies and other data on this site/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('storybook-addon-playscape:forks') ?? '[]')).toEqual([]);
  });

  it('has the Playscape panel force-selected, since a share link cannot rely on the URL to select it', () => {
    const token = encodeShareToken({ id: 'shared-1', name: 'Shared Fork', source: '<Button />' });
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);

    expect(setSelectedPanel).toHaveBeenCalledWith('playscape/panel');
  });

  it('removes the share token from the address bar once it has been read', () => {
    const token = encodeShareToken({ id: 'shared-1', name: 'Shared Fork', source: '<Button />' });
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);

    expect(window.location.search).not.toContain('loadPlayscape');
  });

  it('sees the fork created only after explicitly confirming', async () => {
    const user = userEvent.setup();
    const token = encodeShareToken({ id: 'shared-1', name: 'Shared Fork', source: '<Button label="Shared" />' });
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);
    await user.click(screen.getByRole('button', { name: /load and run this code/i }));

    await waitFor(() => {
      const forks = JSON.parse(localStorage.getItem('storybook-addon-playscape:forks') ?? '[]');
      expect(forks).toHaveLength(1);
      expect(forks[0]).toMatchObject({ id: 'shared-1', name: 'Shared Fork', isDefault: false });
    });
  });

  it('sees no fork created at all if they cancel instead', async () => {
    const user = userEvent.setup();
    const token = encodeShareToken({ id: 'shared-1', name: 'Shared Fork', source: '<Button />' });
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText(/Shared Fork/)).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('storybook-addon-playscape:forks') ?? '[]')).toEqual([]);
  });
});

describe('a user re-visiting a share link they already trusted before', () => {
  it('is not asked to confirm again', async () => {
    const token = encodeShareToken({ id: 'already-trusted', name: 'Trusted Fork', source: '<Button />' });

    // First visit: land on the panel with nothing imported yet, matching how the real fork would
    // have been created the first time this token was confirmed.
    localStorage.setItem(
      'storybook-addon-playscape:forks',
      JSON.stringify([
        {
          id: 'already-trusted',
          storyId: STORY_ID,
          name: 'Trusted Fork',
          source: '<Button />',
          isDefault: false,
          createdAt: 1,
          updatedAt: 1,
        },
      ]),
    );
    setUrl(`?path=/story/${STORY_ID}&loadPlayscape=${token}`);

    renderWithTheme(<PlayscapePanel active />);

    expect(screen.queryByText(/reading cookies and other data on this site/i)).not.toBeInTheDocument();
    await waitFor(() => {
      const forks = JSON.parse(localStorage.getItem('storybook-addon-playscape:forks') ?? '[]');
      expect(forks).toHaveLength(1);
    });
  });
});
