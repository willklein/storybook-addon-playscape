import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithTheme } from '../test/render';
import { ShareImportConfirm } from './ShareImportConfirm';

describe('a user who opens a shared Playscape link for the first time', () => {
  it('sees the name of the fork they are about to load', () => {
    renderWithTheme(
      <ShareImportConfirm name="My Cool Fork" source="<Button />" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText(/My Cool Fork/)).toBeInTheDocument();
  });

  it('is warned that the code could access cookies and other data on the site', () => {
    renderWithTheme(<ShareImportConfirm name="Fork" source="<Button />" onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText(/reading cookies and other data on this site/i)).toBeInTheDocument();
  });

  it('sees the exact, unencoded source that would run — not a summary of it', () => {
    const source = '<Button\n  primary\n  label="Click me"\n/>';
    renderWithTheme(<ShareImportConfirm name="Fork" source={source} onConfirm={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText((_, node) => node?.textContent === source)).toBeInTheDocument();
  });

  it('has not had any code run yet — nothing happens until they choose', () => {
    const onConfirm = vi.fn();
    renderWithTheme(<ShareImportConfirm name="Fork" source="<Button />" onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('a user who decides not to trust the link', () => {
  it('can back out without the code ever being confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(<ShareImportConfirm name="Fork" source="<Button />" onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('a user who reviews the code and decides to trust it', () => {
  it('explicitly confirms before anything loads', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithTheme(<ShareImportConfirm name="Fork" source="<Button />" onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /load and run this code/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
