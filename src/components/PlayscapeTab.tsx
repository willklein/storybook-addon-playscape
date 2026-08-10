import React, { useCallback, useEffect, useState } from 'react';
import { useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

import { SHARE_PARAM } from '../constants';
import { createFork, deleteFork, getForksForStory, nextForkName, resolveUniqueName } from '../lib/storage';
import { decodeShareToken, stripShareParam } from '../lib/shareToken';
import type { PlayscapeFork } from '../types';
import { ForkEditor } from './ForkEditor';
import { ForkList } from './ForkList';

interface PlayscapeTabProps {
  active?: boolean;
}

type View = { type: 'list' } | { type: 'default' } | { type: 'fork'; forkId: string };

const Wrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
}));

export const PlayscapeTab: React.FC<PlayscapeTabProps> = ({ active }) => {
  const { storyId } = useStorybookState();
  const [forks, setForks] = useState<PlayscapeFork[]>([]);
  const [view, setView] = useState<View>({ type: 'list' });

  useEffect(() => {
    if (!storyId) {
      setForks([]);
      setView({ type: 'list' });
      return;
    }

    const token = new URLSearchParams(window.location.search).get(SHARE_PARAM);
    if (token) {
      const payload = decodeShareToken(token);
      // Best-effort cleanup — Storybook's own router can resync the URL and resurrect this
      // param afterwards, so don't rely on it staying gone. The `id` reuse below is what
      // actually keeps re-processing the same token idempotent.
      stripShareParam(SHARE_PARAM);

      if (payload) {
        const existing = getForksForStory(storyId).find((fork) => fork.id === payload.id);
        const target =
          existing ??
          createFork({
            id: payload.id,
            storyId,
            name: resolveUniqueName(storyId, payload.name),
            source: payload.source,
            isDefault: false,
          });
        setForks(getForksForStory(storyId));
        setView({ type: 'fork', forkId: target.id });
        return;
      }
    }

    setForks(getForksForStory(storyId));
    setView({ type: 'list' });
  }, [storyId]);

  const refresh = useCallback(() => {
    if (storyId) setForks(getForksForStory(storyId));
  }, [storyId]);

  const handleDefaultCreated = useCallback(
    (fork: PlayscapeFork) => {
      refresh();
      setView({ type: 'fork', forkId: fork.id });
    },
    [refresh],
  );

  const handleNewFork = useCallback(() => {
    if (!storyId) return;
    const base = forks.find((fork) => fork.isDefault);
    if (!base) return;
    const created = createFork({
      id: crypto.randomUUID(),
      storyId,
      name: nextForkName(storyId),
      source: base.source,
      isDefault: false,
    });
    refresh();
    setView({ type: 'fork', forkId: created.id });
  }, [forks, refresh, storyId]);

  const handleDelete = useCallback(
    (forkId: string) => {
      deleteFork(forkId);
      refresh();
    },
    [refresh],
  );

  if (!active || !storyId) return null;

  if (view.type === 'list') {
    return (
      <Wrapper>
        <ForkList
          forks={forks}
          onOpenDefault={() => setView({ type: 'default' })}
          onOpenFork={(forkId) => setView({ type: 'fork', forkId })}
          onNewFork={handleNewFork}
          onDelete={handleDelete}
        />
      </Wrapper>
    );
  }

  const fork = view.type === 'fork' ? (forks.find((f) => f.id === view.forkId) ?? null) : null;

  return (
    <Wrapper>
      <ForkEditor
        key={view.type === 'fork' ? view.forkId : 'default'}
        storyId={storyId}
        fork={fork}
        onBack={() => setView({ type: 'list' })}
        onCreated={handleDefaultCreated}
        onUpdated={refresh}
      />
    </Wrapper>
  );
};
