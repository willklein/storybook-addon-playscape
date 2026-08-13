import { beforeEach, describe, expect, it } from 'vitest';

import { createFork, deleteFork, getForksForStory, nextForkName, resolveUniqueName, updateFork } from './storage';

const STORY_A = 'components-button--primary';
const STORY_B = 'components-header--default';

function makeFork(overrides: Partial<Parameters<typeof createFork>[0]> = {}) {
  return createFork({
    id: overrides.id ?? crypto.randomUUID(),
    storyId: overrides.storyId ?? STORY_A,
    name: overrides.name ?? 'Default',
    source: overrides.source ?? '<Button />',
    isDefault: overrides.isDefault ?? false,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('a user who has not forked a story yet', () => {
  it('sees an empty fork list', () => {
    expect(getForksForStory(STORY_A)).toEqual([]);
  });
});

describe('a user who creates their first fork', () => {
  it('can see it back when listing forks for that story', () => {
    const fork = makeFork({ name: 'Default', isDefault: true });

    const forks = getForksForStory(STORY_A);

    expect(forks).toHaveLength(1);
    expect(forks[0]).toMatchObject({ id: fork.id, name: 'Default', isDefault: true });
  });

  it('does not see it when listing forks for a different story', () => {
    makeFork({ storyId: STORY_A });

    expect(getForksForStory(STORY_B)).toEqual([]);
  });

  it('records a created and edited timestamp', () => {
    const fork = makeFork();

    expect(fork.createdAt).toEqual(fork.updatedAt);
    expect(fork.createdAt).toBeGreaterThan(0);
  });
});

describe('a user browsing their fork list', () => {
  it('always sees the default fork listed first, regardless of creation order', () => {
    makeFork({ name: 'Older fork', isDefault: false, id: 'a' });
    makeFork({ name: 'Default', isDefault: true, id: 'b' });
    makeFork({ name: 'Newer fork', isDefault: false, id: 'c' });

    const names = getForksForStory(STORY_A).map((fork) => fork.name);

    expect(names).toEqual(['Default', 'Older fork', 'Newer fork']);
  });

  it('sees non-default forks ordered oldest first', () => {
    makeFork({ name: 'Default', isDefault: true, id: 'default' });
    makeFork({ name: 'Fork 2', id: 'fork-2' });
    makeFork({ name: 'Fork 3', id: 'fork-3' });

    const names = getForksForStory(STORY_A)
      .filter((fork) => !fork.isDefault)
      .map((fork) => fork.name);

    expect(names).toEqual(['Fork 2', 'Fork 3']);
  });
});

describe('a user renaming or editing a fork', () => {
  it('sees the new name reflected and the edited timestamp bumped', async () => {
    const fork = makeFork({ name: 'Default' });
    await new Promise((resolve) => setTimeout(resolve, 2));

    const updated = updateFork(fork.id, { name: 'My renamed fork' });

    expect(updated?.name).toBe('My renamed fork');
    expect(updated?.updatedAt).toBeGreaterThan(fork.updatedAt);
    expect(updated?.createdAt).toBe(fork.createdAt);
  });

  it('gets nothing back when trying to edit a fork that does not exist', () => {
    expect(updateFork('does-not-exist', { name: 'x' })).toBeUndefined();
  });

  it('does not affect other forks in storage', () => {
    const untouched = makeFork({ name: 'Untouched', id: 'untouched' });
    const target = makeFork({ name: 'Target', id: 'target' });

    updateFork(target.id, { name: 'Renamed' });

    const stillThere = getForksForStory(STORY_A).find((fork) => fork.id === untouched.id);
    expect(stillThere?.name).toBe('Untouched');
  });
});

describe('a user deleting a fork', () => {
  it('no longer sees it in the list', () => {
    const fork = makeFork();

    deleteFork(fork.id);

    expect(getForksForStory(STORY_A)).toEqual([]);
  });

  it('still sees their other forks untouched', () => {
    const keep = makeFork({ id: 'keep', name: 'Keep me' });
    const remove = makeFork({ id: 'remove', name: 'Remove me' });

    deleteFork(remove.id);

    const remaining = getForksForStory(STORY_A);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe(keep.id);
  });

  it('can delete every fork, including the default, leaving an empty list', () => {
    const fork = makeFork({ isDefault: true });

    deleteFork(fork.id);

    expect(getForksForStory(STORY_A)).toEqual([]);
  });
});

describe('a user clicking "New fork" repeatedly', () => {
  it('is offered "Fork 2" the first time', () => {
    makeFork({ name: 'Default', isDefault: true });

    expect(nextForkName(STORY_A)).toBe('Fork 2');
  });

  it('is offered "Fork 3" once "Fork 2" is already taken', () => {
    makeFork({ name: 'Default', isDefault: true });
    makeFork({ name: 'Fork 2' });

    expect(nextForkName(STORY_A)).toBe('Fork 3');
  });

  it('skips over gaps and offers the first free number', () => {
    makeFork({ name: 'Default', isDefault: true });
    makeFork({ name: 'Fork 2' });
    makeFork({ name: 'Fork 4' });

    // "Fork 3" is free even though "Fork 4" is taken.
    expect(nextForkName(STORY_A)).toBe('Fork 3');
  });
});

describe('a user importing a shared fork whose name is already taken', () => {
  it('gets the name back unchanged when nothing else has that name', () => {
    expect(resolveUniqueName(STORY_A, 'Cool Fork')).toBe('Cool Fork');
  });

  it('gets "(2)" appended the first time the name collides', () => {
    makeFork({ name: 'Cool Fork' });

    expect(resolveUniqueName(STORY_A, 'Cool Fork')).toBe('Cool Fork (2)');
  });

  it('counts up past however many collisions already exist', () => {
    makeFork({ name: 'Cool Fork' });
    makeFork({ name: 'Cool Fork (2)' });
    makeFork({ name: 'Cool Fork (3)' });

    expect(resolveUniqueName(STORY_A, 'Cool Fork')).toBe('Cool Fork (4)');
  });

  it('only compares against forks on the same story', () => {
    makeFork({ storyId: STORY_B, name: 'Cool Fork' });

    expect(resolveUniqueName(STORY_A, 'Cool Fork')).toBe('Cool Fork');
  });
});
