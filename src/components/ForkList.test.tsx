import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTheme } from '../test/render';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { PlayscapeFork } from '../types';
import { ForkList } from './ForkList';

function makeFork(overrides: Partial<PlayscapeFork> = {}): PlayscapeFork {
  return {
    id: 'fork-1',
    storyId: 'components-button--primary',
    name: 'Default',
    source: '<Button />',
    isDefault: false,
    createdAt: Date.parse('2026-01-01T12:00:00Z'),
    updatedAt: Date.parse('2026-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('a user who has never forked this story', () => {
  it('sees a single "Default" entry inviting them to start editing', () => {
    renderWithTheme(
      <ForkList forks={[]} onOpenDefault={vi.fn()} onOpenFork={vi.fn()} onNewFork={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Click to start editing')).toBeInTheDocument();
  });

  it('cannot click "New fork" yet, since there is nothing to fork from', () => {
    renderWithTheme(
      <ForkList forks={[]} onOpenDefault={vi.fn()} onOpenFork={vi.fn()} onNewFork={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /new fork/i })).toBeDisabled();
  });

  it('opens the default fork by clicking the placeholder entry', async () => {
    const user = userEvent.setup();
    const onOpenDefault = vi.fn();
    renderWithTheme(
      <ForkList forks={[]} onOpenDefault={onOpenDefault} onOpenFork={vi.fn()} onNewFork={vi.fn()} onDelete={vi.fn()} />,
    );

    await user.click(screen.getByText('Default'));

    expect(onOpenDefault).toHaveBeenCalledTimes(1);
  });
});

describe('a user who already has a default fork', () => {
  const defaultFork = makeFork({ id: 'default', name: 'Default', isDefault: true });

  it('no longer sees the "click to start editing" placeholder', () => {
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={vi.fn()}
        onNewFork={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByText('Click to start editing')).not.toBeInTheDocument();
  });

  it('sees the fork listed with its created and edited dates', () => {
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={vi.fn()}
        onNewFork={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText(/^Created/)).toBeInTheDocument();
    expect(screen.getByText(/^Edited/)).toBeInTheDocument();
  });

  it('can now click "New fork" to create another one', () => {
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={vi.fn()}
        onNewFork={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /new fork/i })).toBeEnabled();
  });

  it('opens a fork by clicking its row', async () => {
    const user = userEvent.setup();
    const onOpenFork = vi.fn();
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={onOpenFork}
        onNewFork={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Default'));

    expect(onOpenFork).toHaveBeenCalledWith('default');
  });

  it('can delete the default fork, same as any other', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={vi.fn()}
        onNewFork={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByTitle('Delete fork'));

    expect(onDelete).toHaveBeenCalledWith('default');
  });

  it('deleting a fork does not also open it', async () => {
    const user = userEvent.setup();
    const onOpenFork = vi.fn();
    renderWithTheme(
      <ForkList
        forks={[defaultFork]}
        onOpenDefault={vi.fn()}
        onOpenFork={onOpenFork}
        onNewFork={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByTitle('Delete fork'));

    expect(onOpenFork).not.toHaveBeenCalled();
  });
});

describe('a user with multiple forks of the same story', () => {
  it('sees every fork listed by name', () => {
    const forks = [
      makeFork({ id: 'default', name: 'Default', isDefault: true }),
      makeFork({ id: 'fork-2', name: 'Fork 2' }),
      makeFork({ id: 'fork-3', name: 'Fork 3' }),
    ];

    renderWithTheme(
      <ForkList forks={forks} onOpenDefault={vi.fn()} onOpenFork={vi.fn()} onNewFork={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Fork 2')).toBeInTheDocument();
    expect(screen.getByText('Fork 3')).toBeInTheDocument();
  });
});
