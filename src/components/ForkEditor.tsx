import { BackIcon, CheckIcon, RefreshIcon, ShareIcon } from '@storybook/icons';
import React, { useEffect, useRef, useState } from 'react';
import { FORCE_REMOUNT } from 'storybook/internal/core-events';
import { Button } from 'storybook/internal/components';
import { useChannel } from 'storybook/manager-api';
import { styled } from 'storybook/theming';

import { DEFAULT_FORK_NAME, EVENTS, SHARE_PARAM } from '../constants';
import { encodeShareToken } from '../lib/shareToken';
import { createFork, updateFork } from '../lib/storage';
import type { PlayscapeFork, RenderStatusEvent, StoryReadyEvent } from '../types';

interface ForkEditorProps {
  storyId: string;
  fork: PlayscapeFork | null;
  onBack: () => void;
  onCreated: (fork: PlayscapeFork) => void;
  onUpdated: () => void;
}

const Wrapper = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
});

const Toolbar = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 16px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

const NameInput = styled.input(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  fontWeight: theme.typography.weight.bold,
  border: '1px solid transparent',
  borderRadius: 4,
  padding: '4px 8px',
  background: 'transparent',
  color: theme.color.defaultText,
  '&:hover, &:focus': {
    border: `1px solid ${theme.appBorderColor}`,
    outline: 'none',
  },
}));

const Dates = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginLeft: 'auto',
  whiteSpace: 'nowrap',
}));

const ErrorBanner = styled.div({
  padding: '8px 16px',
  background: '#fdecea',
  color: '#d9534f',
  fontFamily: 'monospace',
  fontSize: 12,
  whiteSpace: 'pre-wrap',
});

const Editor = styled.textarea(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  border: 'none',
  outline: 'none',
  resize: 'none',
  padding: 16,
  fontFamily: theme.typography.fonts.mono,
  fontSize: 13,
  lineHeight: 1.6,
  background: theme.background.content,
  color: theme.color.defaultText,
}));

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const ForkEditor: React.FC<ForkEditorProps> = ({ storyId, fork, onBack, onCreated, onUpdated }) => {
  const [name, setName] = useState(fork?.name ?? DEFAULT_FORK_NAME);
  const [source, setSource] = useState(fork?.source ?? '');
  const [status, setStatus] = useState<RenderStatusEvent | null>(null);
  const [created, setCreated] = useState<PlayscapeFork | null>(fork);
  const [shared, setShared] = useState(false);

  const createdRef = useRef<PlayscapeFork | null>(fork);
  const sourceRef = useRef(source);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    createdRef.current = created;
  }, [created]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const emit = useChannel({
    [EVENTS.STORY_READY]: (payload: StoryReadyEvent) => {
      if (payload.storyId !== storyId) return;

      if (createdRef.current) {
        // The preview's decorator just (re)mounted with a pristine render — most commonly because
        // Reload (FORCE_REMOUNT) tore down and rebuilt it, resetting its local override state.
        // Reapply the fork's source so the live edit survives the remount instead of silently
        // reverting to the story's default args.
        emit(EVENTS.SET_SOURCE, { storyId, forkId: createdRef.current.id, source: sourceRef.current });
        return;
      }

      const made = createFork({
        id: crypto.randomUUID(),
        storyId,
        name: DEFAULT_FORK_NAME,
        source: payload.source,
        isDefault: true,
      });
      createdRef.current = made;
      setSource(made.source);
      setName(made.name);
      setCreated(made);
      onCreated(made);
    },
    [EVENTS.RENDER_STATUS]: (payload: RenderStatusEvent) => {
      if (payload.storyId !== storyId || !createdRef.current || payload.forkId !== createdRef.current.id) return;
      setStatus(payload);
    },
  });

  // The real Canvas is driven by this fork for as long as its editor is open. On mount: either
  // hand it the fork's saved source directly (reopening an existing fork), or ask the preview
  // what a fresh fork's starting point would look like (the pending "Default" case — its
  // response is handled above via STORY_READY). On unmount — navigating back, switching forks,
  // switching stories — hand control back to the story's normal args-driven render.
  useEffect(() => {
    if (createdRef.current) {
      emit(EVENTS.SET_SOURCE, { storyId, forkId: createdRef.current.id, source: sourceRef.current });
    } else {
      emit(EVENTS.REQUEST_STORY_READY, { storyId });
    }

    return () => {
      emit(EVENTS.CLEAR_SOURCE, { storyId });
    };
  }, [storyId]);

  const handleReload = () => {
    // Some props only affect a component's initial state (e.g. useState(props.foo)), so editing
    // them doesn't visibly update on an already-mounted component. This is the same event
    // Storybook's own "Reload story" toolbar button emits — it forces a fresh mount, and our
    // override (already active on the Canvas) simply applies again on top of it.
    emit(FORCE_REMOUNT, { storyId });
  };

  const handleSourceChange = (value: string) => {
    setSource(value);
    if (!created) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFork(created.id, { source: value });
      emit(EVENTS.SET_SOURCE, { storyId, forkId: created.id, source: value });
      onUpdated();
    }, 400);
  };

  const handleNameBlur = () => {
    if (!created) return;
    const trimmed = name.trim() || DEFAULT_FORK_NAME;
    setName(trimmed);
    updateFork(created.id, { name: trimmed });
    onUpdated();
  };

  const handleShare = async () => {
    if (!created) return;
    const token = encodeShareToken({ id: created.id, name: name.trim() || DEFAULT_FORK_NAME, source });
    const url = new URL(window.location.href);
    // Panel selection isn't part of the URL in Storybook (see PlayscapePanel's use of
    // api.setSelectedPanel), so there's no query param that would help here.
    url.searchParams.set(SHARE_PARAM, token);

    try {
      await navigator.clipboard.writeText(url.toString());
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // Clipboard access can be denied (e.g. insecure context, permissions) — nothing more we
      // can do here short of a fallback UI, which isn't worth the complexity for now.
    }
  };

  return (
    <Wrapper>
      <Toolbar>
        <Button onClick={onBack} ariaLabel="Back to forks">
          <BackIcon />
        </Button>
        <Button onClick={handleReload} ariaLabel="Reload preview" disabled={!created}>
          <RefreshIcon />
        </Button>
        <NameInput
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={handleNameBlur}
          disabled={!created}
          placeholder={DEFAULT_FORK_NAME}
        />
        {created ? (
          <Dates>
            Created {formatDate(created.createdAt)} · Edited {formatDate(created.updatedAt)}
          </Dates>
        ) : null}
        <Button onClick={handleShare} ariaLabel="Copy shareable link" disabled={!created}>
          {shared ? <CheckIcon /> : <ShareIcon />}
        </Button>
      </Toolbar>

      {status?.status === 'error' ? <ErrorBanner>{status.message}</ErrorBanner> : null}

      <Editor
        value={source}
        onChange={(event) => handleSourceChange(event.target.value)}
        spellCheck={false}
        placeholder="Waiting for the story to load..."
      />
    </Wrapper>
  );
};
