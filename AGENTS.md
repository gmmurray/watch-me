# watch-me

Personal movie & TV watchlist PWA. Single user, no auth, no backend, all data on-device.

**Read [docs/SPEC.md](docs/SPEC.md) before making product or architecture decisions — it is the source of truth for scope and intent.**

## What this is (one paragraph)

Two identical flat lists — one for movies, one for TV shows — ordered by date added (oldest first, flippable). Items are added via TMDB search and carry snapshotted metadata. Lightweight freeform tags. Dark "movie theater glow" UI: near-black background, red accent in movie mode, blue in show mode, accent rendered as light (subtle glow on focal elements only). Items are **crossed off** when watched (kept with a `watchedAt` timestamp in a plain per-mode Watched list), not deleted; ratings/reviews/diary stay on Letterboxd.

## Stack

- Vite + React + TypeScript
- Dexie (IndexedDB) + `dexie-react-hooks` for all list data; `localStorage` only for trivial UI prefs
- vite-plugin-pwa for manifest/service worker
- Plain CSS with custom properties; theming via `data-mode` attribute on the root element
- `react-icons` (feather set) for icons; `@fontsource/limelight` self-hosted display font (brand/header only)
- Vitest for logic tests

## Conventions & constraints

- Keep it small. This app is intentionally minimal — prefer deleting scope over adding it. New features go in the spec's "Future ideas" first, not straight into code.
- **Target platform is iOS Chrome (= WebKit).** No `beforeinstallprompt`, separate storage between browser tab and installed Home Screen app, aggressive storage eviction outside installed apps. Verify any storage/PWA assumption against WebKit, not Android Chrome.
- Movies and shows share one code path. `mediaType` is a field, never a fork — no `MovieList` vs `ShowList` components.
- Theming is CSS custom properties only. Mode differences must never leak into component logic beyond the `data-mode` attribute and which TMDB endpoint search hits.
- The TMDB token is read from `VITE_TMDB_TOKEN` in a gitignored `.env`. Never commit tokens; never hardcode them.
- Data safety matters more than features: don't break the export/import format or Dexie schema casually. Dexie schema changes require a proper `version(n).upgrade()` migration.
- No new runtime dependencies without a strong reason.

## Commands

- `npm run dev` — dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run test` — Vitest (db tests run against fake-indexeddb)
- `npm run lint` — oxlint
