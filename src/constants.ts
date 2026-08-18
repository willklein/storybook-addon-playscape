export const ADDON_ID = 'playscape';
export const PANEL_ID = `${ADDON_ID}/panel`;

export const STORAGE_KEY = 'storybook-addon-playscape:forks';

export const DEFAULT_FORK_NAME = 'Default';

// URL query param used to share a fork: base64url-encoded { name, source } JSON.
export const SHARE_PARAM = 'loadPlayscape';

export const EVENTS = {
  // manager -> preview: override the story's render with the given source
  SET_SOURCE: `${ADDON_ID}/set-source`,
  // manager -> preview: stop overriding and go back to the story's normal args-driven render
  CLEAR_SOURCE: `${ADDON_ID}/clear-source`,
  // manager -> preview: "what would a fresh fork's starting source look like right now?" — used
  // instead of passively waiting for STORY_READY, since the Canvas is usually already rendering
  // by the time a fork editor opens, so a beacon-only approach would miss it.
  REQUEST_STORY_READY: `${ADDON_ID}/request-story-ready`,
  // preview -> manager: the unforked story rendered normally; here's a starting point for a new fork
  STORY_READY: `${ADDON_ID}/story-ready`,
  // preview -> manager: result of evaluating an overridden source
  RENDER_STATUS: `${ADDON_ID}/render-status`,
};
