export const ADDON_ID = 'playscape';
export const TAB_ID = `${ADDON_ID}/tab`;

export const STORAGE_KEY = 'storybook-addon-playscape:forks';

export const DEFAULT_FORK_NAME = 'Default';

// URL query param used to share a fork: base64url-encoded { name, source } JSON.
export const SHARE_PARAM = 'loadPlayscape';

export const EVENTS = {
  // manager -> preview: override the story's render with the given source
  SET_SOURCE: `${ADDON_ID}/set-source`,
  // preview -> manager: the unforked story rendered normally; here's a starting point for a new fork
  STORY_READY: `${ADDON_ID}/story-ready`,
  // preview -> manager: result of evaluating an overridden source
  RENDER_STATUS: `${ADDON_ID}/render-status`,
};
