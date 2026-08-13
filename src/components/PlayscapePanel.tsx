import React, { useCallback, useEffect, useState } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { useStorybookApi, useStorybookState } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

import { PANEL_ID, SHARE_PARAM } from '../constants';
import { createFork, deleteFork, getForksForStory, nextForkName, resolveUniqueName } from '../lib/storage';
import { decodeShareToken, stripShareParam, type SharePayload } from '../lib/shareToken';
import type { PlayscapeFork } from '../types';
import { ForkEditor } from './ForkEditor';
import { ForkList } from './ForkList';
import { ShareImportConfirm } from './ShareImportConfirm';

interface PlayscapePanelProps {
  active?: boolean;
}

type View = { type: 'list' } | { type: 'default' } | { type: 'fork'; forkId: string };

const Wrapper = styled.div(({ theme }) => ({
  background: theme.background.content,
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
}));

export const PlayscapePanel: React.FC<PlayscapePanelProps> = ({ active }) => {
  const api = useStorybookApi();
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

      // Unlike tabs, a panel's selection isn't part of the URL (Storybook keeps it in
      // sessionStorage instead), so a share link can't rely on `?panel=` to land here — force
      // it explicitly so the confirmation prompt (and the fork afterwards) is actually visible
      // instead of sitting behind whichever panel the recipient last had open.
      api.setSelectedPanel(PANEL_ID);

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

  const confirmModal = pendingShare ? (
    <ShareImportConfirm
      name={pendingShare.name}
      source={pendingShare.source}
      onConfirm={handleConfirmShare}
      onCancel={handleCancelShare}
    />
  ) : null;

  return (
    <AddonPanel active={active ?? false}>
      <Wrapper>
        {!storyId ? null : view.type === 'list' ? (
          <ForkList
            forks={forks}
            onOpenDefault={() => setView({ type: 'default' })}
            onOpenFork={(forkId) => setView({ type: 'fork', forkId })}
            onNewFork={handleNewFork}
            onDelete={handleDelete}
          />
        ) : (
          <ForkEditor
            key={view.type === 'fork' ? view.forkId : 'default'}
            storyId={storyId}
            fork={view.type === 'fork' ? (forks.find((f) => f.id === view.forkId) ?? null) : null}
            onBack={() => setView({ type: 'list' })}
            onCreated={handleDefaultCreated}
            onUpdated={refresh}
          />
        )}
        {confirmModal}
      </Wrapper>
    </AddonPanel>
  );
};
