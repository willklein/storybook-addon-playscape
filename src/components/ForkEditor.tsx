import { BackIcon, CheckIcon, RefreshIcon, ShareIcon } from '@storybook/icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconButton } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

import { DEFAULT_FORK_NAME, EVENTS, SHARE_PARAM, TAB_ID } from '../constants';
import { listenFromFrame, postToFrame } from '../lib/directChannel';
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

const DEFAULT_PREVIEW_HEIGHT = 280;
const MIN_PREVIEW_HEIGHT = 80;
const MIN_EDITOR_HEIGHT = 100;
const DIVIDER_HEIGHT = 7;

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

const Content = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
});

const PreviewFrame = styled.iframe(({ theme }) => ({
  width: '100%',
  flexShrink: 0,
  border: 'none',
  background: theme.background.content,
}));

const Divider = styled.div(({ theme }) => ({
  flexShrink: 0,
  height: DIVIDER_HEIGHT,
  cursor: 'row-resize',
  background: theme.appBorderColor,
  '&:hover': {
    background: theme.color.secondary,
  },
}));

const DragOverlay = styled.div({
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  cursor: 'row-resize',
});

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
  minHeight: MIN_EDITOR_HEIGHT,
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

  const [previewHeight, setPreviewHeight] = useState(DEFAULT_PREVIEW_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const [shared, setShared] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const createdRef = useRef<PlayscapeFork | null>(fork);
  const sourceRef = useRef(source);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    createdRef.current = created;
  }, [created]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const iframeSrc = useMemo(
    () => new URL(`iframe.html?id=${encodeURIComponent(storyId)}&viewMode=story`, document.baseURI).toString(),
    [storyId],
  );

  const sendSource = (forkId: string, nextSource: string) => {
    const win = iframeRef.current?.contentWindow;
    if (win) postToFrame(win, EVENTS.SET_SOURCE, { storyId, forkId, source: nextSource });
  };

  const handleReload = () => {
    // Some props only affect a component's initial state (e.g. useState(props.foo)), so editing
    // them doesn't visibly update on an already-mounted component. A full iframe reload forces a
    // fresh mount; the existing STORY_READY handshake then reapplies the current source once the
    // preview's channel is live again.
    iframeRef.current?.contentWindow?.location.reload();
  };

  const handleDividerMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragStartRef.current = { startY: event.clientY, startHeight: previewHeight };
    setDragging(true);
  };

  const handleOverlayMouseMove = (event: React.MouseEvent) => {
    if (!dragStartRef.current) return;
    const delta = event.clientY - dragStartRef.current.startY;
    const contentHeight = contentRef.current?.clientHeight ?? Infinity;
    const maxHeight = Math.max(MIN_PREVIEW_HEIGHT, contentHeight - MIN_EDITOR_HEIGHT - DIVIDER_HEIGHT);
    const next = Math.min(Math.max(dragStartRef.current.startHeight + delta, MIN_PREVIEW_HEIGHT), maxHeight);
    setPreviewHeight(next);
  };

  const handleOverlayMouseUp = () => {
    dragStartRef.current = null;
    setDragging(false);
  };

  useEffect(() => {
    const getWindow = () => iframeRef.current?.contentWindow;

    return listenFromFrame(getWindow, (type, payload) => {
      if (type === EVENTS.STORY_READY) {
        const ready = payload as StoryReadyEvent;
        if (ready.storyId !== storyId) return;

        // The preview only emits this once its own message channel is actually live, so it's
        // the reliable signal to (re)send our override — a raw onLoad-triggered send can race
        // the iframe's channel setup and get silently dropped (postMessage doesn't buffer).
        if (createdRef.current) {
          sendSource(createdRef.current.id, sourceRef.current);
          return;
        }

        const made = createFork({
          id: crypto.randomUUID(),
          storyId,
          name: DEFAULT_FORK_NAME,
          source: ready.source,
          isDefault: true,
        });
        createdRef.current = made;
        setSource(made.source);
        setName(made.name);
        setCreated(made);
        onCreated(made);
        return;
      }

      if (type === EVENTS.RENDER_STATUS) {
        const result = payload as RenderStatusEvent;
        if (result.storyId !== storyId || !createdRef.current || result.forkId !== createdRef.current.id) return;
        setStatus(result);
      }
    });
  }, [storyId]);

  const handleSourceChange = (value: string) => {
    setSource(value);
    if (!created) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFork(created.id, { source: value });
      sendSource(created.id, value);
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
    url.searchParams.set('tab', TAB_ID);
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
        <IconButton onClick={onBack} title="Back to forks">
          <BackIcon />
        </IconButton>
        <IconButton onClick={handleReload} title="Reload preview" disabled={!created}>
          <RefreshIcon />
        </IconButton>
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
        <IconButton onClick={handleShare} title="Copy shareable link" disabled={!created}>
          {shared ? <CheckIcon /> : <ShareIcon />}
        </IconButton>
      </Toolbar>

      <Content ref={contentRef}>
        <PreviewFrame ref={iframeRef} title="Playscape preview" src={iframeSrc} style={{ height: previewHeight }} />

        <Divider onMouseDown={handleDividerMouseDown} />

        {status?.status === 'error' ? <ErrorBanner>{status.message}</ErrorBanner> : null}

        <Editor
          value={source}
          onChange={(event) => handleSourceChange(event.target.value)}
          spellCheck={false}
          placeholder="Waiting for the story to load..."
        />
      </Content>

      {dragging ? (
        <DragOverlay
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
          onMouseLeave={handleOverlayMouseUp}
        />
      ) : null}
    </Wrapper>
  );
};
