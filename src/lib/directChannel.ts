/**
 * Storybook's core manager channel disambiguates incoming postMessage events by matching
 * `iframe[data-is-storybook]` elements against the message's source window. That matching is
 * pathname-based, so two same-origin `/iframe.html` embeds (the real Canvas + our embedded
 * Playscape preview) are indistinguishable to it — it logs "found multiple candidates for event
 * source" and silently drops *every* manager-bound event, including the real Canvas's own.
 *
 * To avoid touching that shared machinery, our embedded iframe never gets `data-is-storybook`,
 * and this module talks to it directly via postMessage using the same wire format Storybook's
 * preview-side channel already understands (see `storybook/internal/channels`).
 */

const CHANNEL_KEY = 'storybook-channel';

export function postToFrame(win: Window, type: string, payload: unknown): void {
  win.postMessage({ key: CHANNEL_KEY, event: { type, args: [payload], from: 'playscape' } }, '*');
}

export function listenFromFrame(
  getSourceWindow: () => Window | null | undefined,
  onEvent: (type: string, payload: unknown) => void,
): () => void {
  const handler = (rawEvent: MessageEvent) => {
    const sourceWindow = getSourceWindow();
    if (!sourceWindow || rawEvent.source !== sourceWindow) return;

    let data: unknown = rawEvent.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return;
      }
    }

    const message = data as { key?: string; event?: { type?: string; args?: unknown[] } } | null;
    if (!message || message.key !== CHANNEL_KEY || !message.event?.type) return;

    onEvent(message.event.type, message.event.args?.[0]);
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
