import React from 'react';
import { useChannel, useEffect, useState } from 'storybook/preview-api';
import type { DecoratorFunction, PartialStoryFn as StoryFunction, StoryContext } from 'storybook/internal/types';

import { EVENTS } from './constants';
import { argsToSource } from './lib/argsToSource';
import { getComponentName } from './lib/componentName';
import { evaluateSource } from './lib/evaluateSource';
import type { SetSourceEvent } from './types';

interface OverrideState {
  forkId: string;
  source: string;
}

export const withPlayscape: DecoratorFunction = (StoryFn: StoryFunction, context: StoryContext) => {
  const [override, setOverride] = useState<OverrideState | null>(null);
  const [rendered, setRendered] = useState<React.ReactElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emit = useChannel({
    [EVENTS.SET_SOURCE]: (payload: SetSourceEvent) => {
      if (payload.storyId !== context.id) return;
      setOverride({ forkId: payload.forkId, source: payload.source });
    },
  });

  useEffect(() => {
    if (override) return;
    emit(EVENTS.STORY_READY, {
      storyId: context.id,
      componentName: getComponentName(context.component),
      source: argsToSource(getComponentName(context.component), context.args ?? {}),
    });
  }, [override, context.id, context.args]);

  useEffect(() => {
    if (!override) {
      setRendered(null);
      setError(null);
      return;
    }

    let cancelled = false;

    evaluateSource(override.source, context.component)
      .then((element) => {
        if (cancelled) return;
        setRendered(element);
        setError(null);
        emit(EVENTS.RENDER_STATUS, { storyId: context.id, forkId: override.forkId, status: 'ok' });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        emit(EVENTS.RENDER_STATUS, { storyId: context.id, forkId: override.forkId, status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [override?.source, override?.forkId, context.id]);

  if (!override) {
    return StoryFn();
  }

  if (error) {
    return (
      <pre
        style={{
          color: '#d9534f',
          whiteSpace: 'pre-wrap',
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 13,
          margin: 0,
        }}
      >
        {error}
      </pre>
    );
  }

  return rendered ?? StoryFn();
};
