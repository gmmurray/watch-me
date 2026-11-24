# watch-me — Spec

A simple personal watchlist app: one flat list of movies and one flat list of TV shows, replacing two Obsidian `.md` files. Letterboxd remains the diary/social tool; watch-me is only "what do I want to watch next."

## Background

The owner tracks watched movies on Letterboxd and wants to keep it that way. What Letterboxd doesn't cover (and Obsidian currently does, poorly) is a plain to-watch list. watch-me replaces the two markdown lists with a single installable app used primarily as a PWA on a phone.

## Goals

- Two sections with identical behavior: **Movies** and **Shows**.
- Each section is a flat list with one order. By default that's the order items were added (oldest first); you can bump an item to the top in one tap, or rearrange the list by hand (see Ordering).
- Add items by searching TMDB, so entries carry real metadata (title, year, poster) instead of hand-typed text.
- Lightweight freeform tagging (e.g. tag a show `anime`), filterable by tapping a tag. No tag management UI beyond what's needed to add/remove tags on an item.
- **Cross items off** when watched rather than deleting them. Watched items are kept with a watched timestamp — effectively a plain list of "what I finished and when." Letterboxd stays the real diary, but this data is free to keep and may be useful later.
- Works fully offline after first load (except TMDB search, which needs network).
- Data lives on-device with no auth and no backend, and must survive long periods of non-use. **Primary device is an iPhone using Chrome** — which on iOS is WebKit under the hood, and that shapes the whole persistence strategy (see below).

## Non-goals (for now)

- No diary, ratings, or reviews — that's Letterboxd. watch-me keeps only the bare "crossed off on this date" record, with no ambition beyond that for now.
- No additional views, filtering, or sorting beyond the single-tag filter. There is exactly one order per list — no order modes, no Oldest/Newest flip, no sorting by title, year, or anything else.
- No drag-and-drop. Rearranging uses plain up/down arrows (see Ordering); a drag library is a lot of machinery for a list that gets reordered occasionally, and iOS drag handling is a pain.
- No sync across devices, no accounts, no backend.
- No episode-level tracking for shows. A show is a single list entry.

## UX

### Sections and theming

- Dark-mode app. Two modes: **Movie mode** (amber-orange accent) and **Show mode** (cyan accent).
- The accent color is the mode indicator — it should be subtle but unmistakable (accent on the active tab, buttons, tag chips, highlights). Layout and behavior are identical between modes.
- Mode is switched with a persistent top-level control (tabs or a toggle in the header). The last-used mode is remembered across launches.
- Implementation: a `data-mode="movie" | "show"` attribute on the root element swaps a small set of CSS custom properties. No per-mode components.

**Aesthetic direction — "grid glow" (Tron Legacy-inspired).** The target is the Grid at night: a cold blue-black world where light is information. Movie mode wears the program amber-orange; show mode wears the hero cyan. Concretely:

- Near-black backgrounds with a cool blue bias (not pure `#000`), carrying a very faint mode-tinted grid pattern and a soft halo at the top of the page.
- The accent is rendered as _light_, not paint: glowing text for the wordmark, thin accent borders with outer glow as "light lines" on focal elements (the Add button, primary actions, active states). Glow is reserved for a few focal elements; body text, rows, and chips stay quiet so the effect reads as ambiance, not decoration.
- Angular shape language: small radii (4–10px) instead of pills — light lines trace edges, they don't balloon.
- One display font (Orbitron) for the wordmark only; everything else uses a clean system/sans stack.
- Calibration guardrails: the app must never feel like a template with default grays (failure mode A), and never accumulate gradients, animations, and effects that feel like overkill for a flat list (failure mode B). If an effect doesn't survive the question "does this make the list nicer to glance at on a phone at night," cut it.

### The list

- One vertical list per mode. Each row shows: poster thumbnail, title, year, tags, and the date added.
- Order: see Ordering below. Top of the list = what to watch next.
- Tapping a row opens a small detail panel/sheet: larger poster, overview from TMDB, tags (editable), date added, and three actions: **Mark watched** (the primary action — crosses it off), **Move to top** (secondary; hidden when the item is already first), and **Remove** (for "changed my mind, never watching this"; hard delete).
- All three actions get a brief undo affordance (toast).

### Ordering

Each to-watch list has a single order, stored on the items themselves. Untouched, it is simply oldest-added first: new items are appended to the bottom. Two ways to change it:

- **Move to top** (detail sheet) — the everyday "I want to watch this next" action. One tap puts the item above everything else in the list. Bumping several items stacks them, most recently bumped on top.
- **Sort** (button in the controls row, shown when the list has more than one item) — for occasional bigger rearranging. It puts the list into *sort mode*:
  - Rows collapse to title-only, with a pair of up/down arrow buttons side by side on the right (one vertical band, not stacked). The first row's up and the last row's down are disabled.
  - Rows are not tappable — no detail sheet, no adding while rearranging.
  - Moves are staged, not live. The Sort button becomes **Save** and commits the arrangement; a quiet Cancel discards it. Leaving the list (switching mode, or opening the Watched list) also discards a pending arrangement.

The position lives on the item rather than in a separate list of ids, so it rides along in export/import, and an item that is crossed off and later un-crossed returns to the slot it had.

### Tag filter

- Tapping a tag chip on a list row filters the current list (to-watch or Watched) to items with that tag. The active filter shows as a single dismissible chip in the controls row; tapping it (or the same tag again) clears it.
- One tag at a time — no multi-tag logic. The filter is not persisted; it resets on mode switch and on relaunch.
- A filtered list keeps the list's order; Sort is hidden while a filter is active (rearranging a subset would be confusing).

### Watched items

- Marking an item watched sets `watchedAt = now` and moves it out of the to-watch list into that mode's **Watched** list.
- The Watched list is reached by a small secondary control in each mode (a "Watched" pill in the controls row). It is deliberately plain: same row layout, dimmed with struck-through titles, showing the watched date — a glorified plain-text log, which is exactly the point.
- Ordered newest-watched first. Un-marking (from the row's detail sheet) restores the item to the to-watch list with its original `addedAt`.
- No stats, streaks, or summaries built on this data yet — it's being kept because it's free to keep, and future uses can be decided later.

### Adding an item

- A prominent **Add** button opens a search input.
- Search hits TMDB (`/search/movie` or `/search/tv` depending on the current mode) with debounced-as-you-type results showing poster, title, year, and a two-line overview.
- Each result has two tap targets: tapping the row body expands it in place to show the full overview (tap again to collapse; one expanded at a time), and a separate **+** button adds it. You can always read what something is before adding it — no separate preview sheet.
- Adding a result puts it on the current mode's list with `addedAt = now`. Duplicate adds (same TMDB id in the same mode) are prevented with a gentle notice.
- Adding keeps the search sheet open — batch adding is the primary flow; the sheet is dismissed manually when done.
- Optional: add tags immediately after adding, or later from the detail panel.

### Tags

- Freeform lowercase strings on any item. Entered via a small input on the detail panel; existing tags across the list are offered as autocomplete suggestions so spellings converge.
- Displayed as small chips on list rows and in the detail panel.
- No dedicated tag CRUD screen — a tag "exists" if at least one item has it.

## Data model

Single Dexie (IndexedDB) table:

```ts
interface WatchItem {
  id?: number; // auto-increment primary key
  mediaType: "movie" | "show";
  tmdbId: number;
  title: string;
  year: string | null; // release/first-air year, display only
  posterPath: string | null; // TMDB poster path, e.g. "/abc123.jpg"
  overview: string;
  tags: string[];
  addedAt: number; // epoch ms
  watchedAt: number | null; // epoch ms; null = still on the to-watch list
  order: number; // to-watch position, ascending; seeded from addedAt
}
```

- Schema history: v1 is the original table. v2 added `order` and the `[mediaType+order]` index, seeding `order = addedAt` on existing rows so the list looked unchanged.
- Indexes: `[mediaType+order]` for the to-watch query, `[mediaType+watchedAt]` for the watched list, `[mediaType+tmdbId]` (unique) for duplicate prevention. `[mediaType+addedAt]` is no longer queried; it's left in place rather than spending a schema version to drop it. (Filtering `watchedAt === null` happens in the query; the list sizes involved make index subtleties irrelevant.)
- `order` values (per `mediaType`, across to-watch and watched items):
  - New items take `max(order) + 1` — the bottom.
  - Move to top sets `order = min(order) - 1`. Values can go negative; that's fine.
  - Saving a Sort arrangement rewrites the to-watch list as dense `0..n-1` in one bulk update. The lists are small enough that anything cleverer (fractional keys, gap indices) would be wasted complexity.
- Re-adding a title that's already in the Watched list should surface it ("you watched this on …") and offer to move it back to the to-watch list rather than creating a duplicate.
- TMDB metadata is snapshotted at add time; no background refresh. Poster images are loaded from TMDB's CDN at render time (and cached by the service worker).
- Settings (last mode) live in `localStorage` — trivial and non-critical. The order is data, not a setting, and lives in the database. The retired per-mode sort-direction and order-mode keys (`watch-me:sort:*`, `watch-me:order:*`) are no longer read.

## Persistence and data safety

This is the "phone deletes my data after a month" concern — and on iOS it is a _justified_ concern, not paranoia. Every browser on iOS, including Chrome, is WebKit underneath, and WebKit is the most eviction-happy engine there is (its Intelligent Tracking Prevention can delete a site's script-writable storage — including IndexedDB — after ~7 days without visiting it). The strategy, in order of importance:

1. **Install to the Home Screen and use only the installed app.** Home Screen web apps get their own dedicated storage container and are exempt from the 7-day cleanup — this is the single biggest protection on iOS. Two sharp edges to design around:
   - The installed app's storage is _separate_ from the browser tab's. Anything added while browsing in Chrome does not appear in the installed app. The app should detect non-standalone display mode and show a persistent, friendly banner: "Install me and use me from your Home Screen — data added here won't carry over."
   - iOS has no `beforeinstallprompt`; installation is manual (Chrome on iOS ≥16.4 supports Add to Home Screen from its menu). The banner explains the steps rather than triggering a prompt.
2. **Request `navigator.storage.persist()`** on first launch anyway. WebKit supports it; treat it as an extra lock rather than the plan. Surface the result quietly on the settings/about screen.
3. **Export/import is the real guarantee.** A settings action exports the full database (both lists, watched history, tags) as a JSON file; import restores it, merging by `mediaType+tmdbId` — keep the older `addedAt`, keep a non-null `watchedAt` over null, and union tags. For `order`, this device's arrangement wins on a merge; newly added items keep their backup `order`. The backup format is version 2 (adds `order`); version 1 files still import, with `order` falling back to `addedAt` to match the v2 migration. Add a gentle nudge on the settings screen ("last export: 43 days ago") so backups actually happen. An occasional export saved to Files/Drive makes the data effectively loss-proof.

## TMDB integration

- TMDB is the right choice: free for personal use, great search, posters, and both movie and TV coverage under one API.
- Use API v3 with the **API Read Access Token** (Bearer header).
- Endpoints used: `GET /search/movie`, `GET /search/tv`. Poster images from `https://image.tmdb.org/t/p/w185{posterPath}` (list) and `w342` (detail).
- The token ships in the client bundle. For a personal, unlisted app with a free TMDB key this is an accepted tradeoff — noted here so it's a decision, not an accident. The token lives in a `.env` file (`VITE_TMDB_TOKEN`) that is gitignored; the repo never contains it.
- TMDB attribution (logo + "This product uses the TMDB API but is not endorsed or certified by TMDB") goes on the settings/about screen.

## Tech stack

- **Vite + React + TypeScript** — standard, fast, boring in the good way.
- **vite-plugin-pwa** — manifest + service worker (precache app shell; runtime cache TMDB poster images, cache-first).
- **Dexie** + `dexie-react-hooks` (`useLiveQuery`) — IndexedDB with reactive queries, no state library needed.
- **Plain CSS with custom properties** for theming (the red/blue mode swap is a few variables). No CSS framework unless the UI grows to justify one.
- **No router** — mode is top-level state persisted to `localStorage`; the app is a single screen with a sheet/panel overlay.
- Testing: Vitest for logic (db operations, import/export merge); keep UI testing manual for now given the app's size.

## Future ideas (explicitly not now)

- "Where to watch" providers via TMDB's watch-provider endpoint.
- A "cross off automatically" helper that checks Letterboxd exports against the to-watch lists.
- Doing something with the watched history (counts, a year-in-review, export to Letterboxd format) — the data is being kept precisely so this stays possible.
- Sync via a tiny backend or file-based sync, if a second device ever matters.

## Open questions

- Search language/region defaults for TMDB — default `en-US`, revisit if results feel off.
- Cross-off interaction: is tapping into the detail sheet enough, or is a swipe/long-press "mark watched" on the row worth it? Decide by feel once the list exists.
