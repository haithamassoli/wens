# ونس

ألعاب وأنشطة قصيرة للزوجين، على هاتف واحد وبلا تسجيل. الواجهة عربية بالكامل (RTL) ومصمّمة للهاتف أولاً.

**ونس** (warm companionship) is a Next.js 16 app-router project. Everything a couple types or chooses during a session lives in page memory only; the browser keeps just three small localStorage records (settings, favorites, seen-card ids). No accounts, no analytics.

## Run

```bash
npm install
npm run dev              # http://localhost:3000
npm run build            # production build (webpack, generates the service worker)
npm start                # serve the build
```

## Test and check

```bash
node --test lib/engine/*.test.ts   # pure game engines (Node strips types natively)
npm run validate:content           # schema-checks content/*.json
npm run check                      # Biome format + lint (also runs on pre-commit)
npx tsc --noEmit -p .              # types
```

## Layout

| Path | What lives there |
| --- | --- |
| `app/` | Routes: `/` home, `/games`, `/games/[slug]`, `/play/[gameId]`, `/favorites`, `/settings`, `/privacy`, `/offline`; plus `manifest.ts`, `robots.ts`, `sitemap.ts`, `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| `components/` | Shared UI (`AppShell`, `Button`, `Chip`, `GameCard`, `FavoriteButton`, …) |
| `lib/games.ts` | Game metadata: name, tagline, steps, minutes, moods, hue |
| `lib/content/` | Card schema (`types.ts`) and the loader (`index.ts`, exports `G01_CARDS…` and `findCard(id)`) |
| `lib/engine/` | Pure, DOM-free session engines, one per game, with tests |
| `lib/storage.ts` | localStorage layer: `settings_v1`, `favorites_v1`, `seen_v1` |
| `content/` | Card banks, one JSON array per game (`G01.json`, …). Only `status: "published"` cards are dealt |
| `assets/` | Source SVGs for the logo and social card — `node scripts/gen-assets.mjs` rasterises them |
| `docs/` | PRD and idea backlog |

## Content

Cards are plain JSON in `content/`, validated against `lib/content/types.ts`. Each card has a stable id (`G02-014`), a `status` (`draft` → `review` → `published` → `archived`), a `depth`, and flags for `requiresTools` / `requiresMovement` so the "no tools" and "no movement" filters can exclude it. Archived cards stay in the file so favorites pointing at them degrade to a generic "no longer available" notice instead of breaking.

## Adding a game

Add a `GameMeta` entry to `lib/games.ts` (id, slug, Arabic copy, minutes, moods, a distinct `hue`), extend `GameId` and the card type in `lib/content/types.ts`, drop a `content/Gxx.json` bank, write `lib/engine/Gxx.ts` implementing the `GameDefinition` contract in `lib/engine/README.md` together with a `Gxx.test.ts`, and register the engine in the play route. The catalog, details page, home filters and favorites pick the game up from `lib/games.ts` automatically.

## Known limitations

- No offline guarantee: a service worker precaches the shell, but content and routes you have not visited may need a connection.
- No accounts or sync: favorites and settings belong to one browser and are not backed up.
- Hiding a partner's answer is a UI barrier, not encryption.
- Single-device play only in this release; two-device rooms are a later milestone.
