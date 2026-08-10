import { STORAGE_KEY } from '../constants';
import type { PlayscapeFork } from '../types';

function readAll(): PlayscapeFork[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayscapeFork[]) : [];
  } catch {
    return [];
  }
}

function writeAll(forks: PlayscapeFork[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(forks));
}

export function getForksForStory(storyId: string): PlayscapeFork[] {
  return readAll()
    .filter((fork) => fork.storyId === storyId)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.createdAt - b.createdAt);
}

export function createFork(fork: Omit<PlayscapeFork, 'createdAt' | 'updatedAt'>): PlayscapeFork {
  const now = Date.now();
  const created: PlayscapeFork = { ...fork, createdAt: now, updatedAt: now };
  const all = readAll();
  all.push(created);
  writeAll(all);
  return created;
}

export function updateFork(
  forkId: string,
  patch: Partial<Pick<PlayscapeFork, 'name' | 'source'>>,
): PlayscapeFork | undefined {
  const all = readAll();
  const existing = all.find((fork) => fork.id === forkId);
  if (!existing) return undefined;
  const updated: PlayscapeFork = { ...existing, ...patch, updatedAt: Date.now() };
  writeAll(all.map((fork) => (fork.id === forkId ? updated : fork)));
  return updated;
}

export function deleteFork(forkId: string): void {
  writeAll(readAll().filter((fork) => fork.id !== forkId));
}

export function nextForkName(storyId: string): string {
  const existing = new Set(getForksForStory(storyId).map((fork) => fork.name));
  let n = 2;
  while (existing.has(`Fork ${n}`)) n += 1;
  return `Fork ${n}`;
}
