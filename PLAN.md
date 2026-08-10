# Playscape — Next Iteration Plan

Status: **draft, awaiting review**. Nothing in this document has been implemented yet.

Two phases: a polish pass on the two existing screens (fork list, fork editor), then one larger feature (sharing a fork via URL).

Terminology: keeping **"fork"** as-is (considered renaming to "playscape", decided against it).

---

## Phase 1 — Polish

### 1.1 Deletable Default fork

- Today [ForkList.tsx](src/components/ForkList.tsx) hides the delete button for `fork.isDefault` — the Default fork is protected.
- Change: every fork gets a delete button, including Default.
- When the last remaining fork for a story is deleted, the list should end up empty.
  - **Note on current behavior**: [PlayscapeTab.tsx](src/components/PlayscapeTab.tsx) / [ForkList.tsx](src/components/ForkList.tsx) already show a synthetic, unsaved "Default" placeholder row whenever no fork has `isDefault: true` — that's the existing entry point for creating the very first fork. If the last real fork is deleted, `hasDefault` naturally becomes `false` again, so this placeholder row reappears automatically.
  - **Open question**: is that placeholder-reappears behavior the "empty list" you want (i.e. an empty list still shows the "click to start" Default row), or should a fully-emptied list show literally nothing (no rows, not even the placeholder) until some other action re-seeds it? The plan below assumes the former (placeholder reappears — it's already how "no forks yet" is displayed), since it's the existing pattern and needs no new empty-state UI. Flag if you want the latter instead.

### 1.2 Resizable preview/editor split

- In [ForkEditor.tsx](src/components/ForkEditor.tsx), the preview `<iframe>` has a fixed height (280px) and the source `<textarea>` fills the remaining flex space below it — no way to adjust the ratio.
- Add a horizontal drag divider between them:
  - Drag up/down to resize the preview height vs. the editor height (they share the available vertical space).
  - On hover over the divider, the cursor changes to a row-resize cursor (`ns-resize`/`row-resize`) to signal it's draggable.
  - No visual grip icon for now — cursor affordance only. Icon can be added later (project already depends on `@storybook/icons`, e.g. something like a drag-handle icon, once picked).
  - Split ratio is session-only (component state) — not persisted to `localStorage` per fork. Flag if you'd rather persist it (globally, or per-fork).

### 1.3 Full width layout

- Both the fork list and the fork editor currently render narrower than the tab's content area instead of filling it.
- Neither of our own components sets an explicit `max-width` — the constraint most likely comes from Storybook's own tab-content wrapper (the region Storybook renders around a custom `types.TAB`'s content, similar to how the Docs panel centers/pads content). Needs to be confirmed by inspecting the rendered DOM before fixing, but the fix is likely one of:
  - Overriding the inherited padding/max-width from our top-level wrapper (negative margins / explicit `width: 100%` + `box-sizing: border-box`), or
  - Finding whether Storybook exposes any per-tab "full bleed" option.
- Explicitly **not** doing yet: combining list + detail into one view (e.g. list on the left, editor on the right). Both stay as separate full-page views within the tab, each now full width.

---

## Phase 2 — Sharing a fork via URL

### UI

- Add a **Share** button to the [ForkEditor.tsx](src/components/ForkEditor.tsx) toolbar, to the right of the Created/Edited dates.

### Behavior on click

1. Take the current fork's `name` and `source`.
2. Serialize `{ name, source }` (e.g. as JSON) and base64-encode it.
   - Needs a UTF-8-safe encode (plain `btoa` breaks on non-Latin1 characters), so source text with e.g. curly quotes or emoji doesn't corrupt.
3. Build a shareable URL from the current page:
   - Existing `?path=/story/<story-id>` query param (already present in the URL when viewing a story).
   - `&tab=playscape/tab` — selects the Playscape tab. This is the addon's real `TAB_ID` ([constants.ts](src/constants.ts): `${ADDON_ID}/tab` = `playscape/tab`), and Storybook's own URL/tab-selection already understands a `tab=` param, so no new handling needed for this part.
   - `&loadPlayscape=<base64>` — new param, addon-specific, decoded by our own code (see below).
   - **Open question — param name**: you floated `loadSource` and `loadPlayscape` without settling on one. Plan below uses **`loadPlayscape`** — say if you want something else.
4. Copy the full URL to the clipboard (`navigator.clipboard.writeText`).

### Behavior on load (visiting a shared URL)

1. [PlayscapeTab.tsx](src/components/PlayscapeTab.tsx) checks `window.location.search` for `loadPlayscape` on mount (and whenever the current story changes, in case the addon is already open when a shared link is followed within the same session).
2. If present: base64-decode + JSON-parse back to `{ name, source }`.
3. Check existing forks for *this story* for a name collision:
   - If `name` is free, use it as-is.
   - If taken, append the first available `" (2)"`, `" (3)"`, … suffix — same idea as the existing "New Fork" auto-naming ([storage.ts](src/lib/storage.ts) `nextForkName`), just applied to the incoming shared name instead of the literal `"Fork N"` pattern.
4. Create a new fork (`isDefault: false`) with the resolved name + source.
5. Navigate straight into that fork's editor view — skip the list.
6. Strip `loadPlayscape` from the URL via `history.replaceState` (keeping `path`/`tab` intact) so refreshing, or reopening the tab later, doesn't recreate the fork every time.

---

## Explicitly out of scope for this round

- Combined list+detail single page layout.
- Resize-handle visual icon (cursor-only affordance).
- Persisting the preview/editor split ratio.
- Any expiry/size limit on shared URLs (large `source` text means a long URL — not addressed here).

---

## Suggested implementation order

1. 1.1 Deletable Default fork (small, isolated).
2. 1.3 Full width layout (isolated CSS fix, unblocks visually judging 1.2).
3. 1.2 Resizable split.
4. Phase 2 sharing feature (largest, depends on nothing above but easiest to build against a polished editor view).
