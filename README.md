# Storybook Addon Playscape

A Storybook addon for forking a story, editing its source live against the real component, and sharing what you end up with via a URL.

![](assets/Playscape-demo.mov)

## What it does

Playscape adds a **Playscape** tab next to Canvas/Docs on every story. From there:

- **Fork a story.** Click the "Default" entry to create your first fork.
- **Edit live.** Each fork has its own editable JSX source, shown in a text panel below a live preview.
- **Rename, duplicate, and delete forks.** Every fork — including the first one — can be renamed or deleted. "New fork" clones the current default fork's source as a starting point.
- **Share a fork.** The Share button copies a URL that embeds the fork's name and source. Opening the shared URL to load the story with that user-edited fork ready to go.

All fork data lives in the browser's `localStorage`, scoped per story. Nothing is sent to a server.

In the future, we may implement:

- support for more frameworks (Vue, Svelte, Solid, etc.)
- a way to sync your entire library of Playscape forks (GitHub gists, file-based import/export)

## Installation

```sh
npm install --save-dev storybook-addon-playscape
```

Then register it in `.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/your-framework';

const config: StorybookConfig = {
  // ...rest of config
  addons: ['storybook-addon-playscape'],
};

export default config;
```

Playscape renders and evaluates JSX against your real React components, so it currently only supports React projects.

## Support & Feature Requests

[Open an issue](https://github.com/willklein/storybook-addon-playscape/issues/new/choose) to report issues, request features, and if you're interested, offer help. If you'd like support for a given framework, let us know.

## Running the dev environment locally

This repo ships its own Storybook (`src/stories`) for developing and testing the addon in isolation.

```sh
pnpm install
pnpm start
```

`pnpm start` runs two things together: `tsup --watch` (rebuilds `dist/` whenever addon source changes) and `storybook dev -p 6006` (serves whatever's currently in `dist/`).

**Manager changes need a full restart.** Anything that ends up in the manager bundle — `src/manager.tsx`, the fork list/editor components, etc. — is not hot-reloaded. A page refresh in the browser isn't enough either; you need to stop and restart the `storybook dev` process for those changes to show up. Preview-side changes (`src/preview.ts`, `src/withPlayscape.tsx`) behave the same way. Only the addon's own Storybook example stories under `src/stories` get normal Vite HMR.

Other scripts:

- `pnpm build` — one-off build of `dist/`
- `pnpm build:watch` — rebuild on change (what `pnpm start` uses)
- `pnpm storybook` — just the dev server, against whatever is already in `dist/`
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm format` — Prettier

### Trying it in another project

To see the addon working against a real project's own components instead of this repo's example stories, link it locally rather than publishing:

```jsonc
// consuming-project/package.json
"devDependencies": {
  "storybook-addon-playscape": "link:../storybook-addon-playscape"
}
```

Run `pnpm install` in that project, add `'storybook-addon-playscape'` to its `.storybook/main.ts` addons array, then start (or restart) its Storybook. Rebuilding this addon (`pnpm build`, or leave `pnpm build:watch` running) updates the linked copy immediately, but — same caveat as above — the consuming project's Storybook still needs a restart to pick up manager/preview bundle changes.

## Release management

This project uses [`auto`](https://github.com/intuit/auto) for versioning and publishing. It needs a `GH_TOKEN` (repo scope) and `NPM_TOKEN` (read + publish) — set them in a local `.env` for `npm run release`, or as repository secrets for the included GitHub Actions release workflow.

```sh
npm run release
```

builds the addon, bumps the version, and pushes both the release and changelog to GitHub and npm.
