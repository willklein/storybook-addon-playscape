import React, { useCallback, useEffect, useState } from 'react';
import { useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

import { SHARE_PARAM } from '../constants';
import { createFork, deleteFork, getForksForStory, nextForkName, resolveUniqueName } from '../lib/storage';
import { decodeShareToken, stripShareParam, type SharePayload } from '../lib/shareToken';
import type { PlayscapeFork } from '../types';
import { ForkEditor } from './ForkEditor';
import { ForkList } from './ForkList';
import { ShareImportConfirm } from './ShareImportConfirm';

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
  const [pendingShare, setPendingShare] = useState<SharePayload | null>(null);

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
        if (existing) {
          // Already imported (and implicitly trusted) in a prior visit — nothing new to run,
          // so no need to prompt again. Just go back to it.
          setForks(getForksForStory(storyId));
          setView({ type: 'fork', forkId: existing.id });
          return;
        }

        // A fresh, never-seen-before share token: this is arbitrary code from a URL, so it
        // does not get evaluated until the user has reviewed and explicitly confirmed it.
        setForks(getForksForStory(storyId));
        setView({ type: 'list' });
        setPendingShare(payload);
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

  const handleConfirmShare = useCallback(() => {
    if (!storyId || !pendingShare) return;
    const created = createFork({
      id: pendingShare.id,
      storyId,
      name: resolveUniqueName(storyId, pendingShare.name),
      source: pendingShare.source,
      isDefault: false,
    });
    setPendingShare(null);
    setForks(getForksForStory(storyId));
    setView({ type: 'fork', forkId: created.id });
  }, [pendingShare, storyId]);

  const handleCancelShare = useCallback(() => {
    setPendingShare(null);
  }, []);

  if (!active || !storyId) return null;

  const confirmModal = pendingShare ? (
    <ShareImportConfirm
      name={pendingShare.name}
      source={pendingShare.source}
      onConfirm={handleConfirmShare}
      onCancel={handleCancelShare}
    />
  ) : null;

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
        {confirmModal}
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
      {confirmModal}
    </Wrapper>
  );
};
