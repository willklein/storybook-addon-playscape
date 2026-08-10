import React, { useCallback, useEffect, useState } from 'react';
import { useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

import { createFork, deleteFork, getForksForStory, nextForkName } from '../lib/storage';
import type { PlayscapeFork } from '../types';
import { ForkEditor } from './ForkEditor';
import { ForkList } from './ForkList';

interface PlayscapeTabProps {
  active?: boolean;
}

type View = { type: 'list' } | { type: 'default' } | { type: 'fork'; forkId: string };

const Wrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  height: '100%',
  boxSizing: 'border-box',
}));

export const PlayscapeTab: React.FC<PlayscapeTabProps> = ({ active }) => {
  const { storyId } = useStorybookState();
  const [forks, setForks] = useState<PlayscapeFork[]>([]);
  const [view, setView] = useState<View>({ type: 'list' });

  useEffect(() => {
    setForks(storyId ? getForksForStory(storyId) : []);
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
