# NEXUS — Multi-Provider AI Hub (v2: Pure Client-Side)

## Original Problem Statement
Build a fullstack AI chat environment ("NEXUS") with multi-provider AI rotation, mode-switched UX. After v1 MVP shipped, user requested **a complete rewrite to pure client-side** so it runs locally and on GitHub Pages with no server.

## Architecture (v2)
- **Pure client-side React + Vite** — no backend
- All state in `localStorage` via Zustand `persist` middleware (`nexus.keys`, `nexus.sessions`)
- Client-side API rotation engine in `src/api/rotationEngine.js` calls providers directly via `fetch`
- 6 providers: OpenAI, Anthropic, Gemini, Groq, Mistral, Cohere — all browser-direct
- GitHub Actions workflow at `.github/workflows/deploy.yml` auto-deploys to GitHub Pages on push to `main`
- Legacy `/app/backend/` reduced to a 12-line FastAPI stub so the Emergent supervisor (read-only config) doesn't crash-loop; user deletes the folder when pushing to their GitHub repo

## What's Been Implemented (2026-06-01)

### Migration v1 → v2
- ✅ Deleted FastAPI backend (routes, rotation engine, encryption, models, tests) — kept a 12-line stub for supervisor only
- ✅ Migrated frontend from CRA/craco → Vite 6
- ✅ Removed all axios calls and `process.env.REACT_APP_BACKEND_URL` references
- ✅ Removed unused shadcn `components/ui/` and `lib/` folders (dead code)
- ✅ Removed CRA artefacts: `build/`, `components.json`, `jsconfig.json`, generic README, webpack health plugin

### New Client-Side Stack
- ✅ `src/api/providers.js` — provider detection (prefix-based: sk-ant- → Anthropic, AIza → Gemini, gsk_ → Groq, sk- → OpenAI, mistral_ → Mistral, co- → Cohere), per-provider `buildChatRequest()` (OpenAI/Groq/Mistral OpenAI-compat, Anthropic with `anthropic-dangerous-direct-browser-access: true`, Gemini `streamGenerateContent?alt=sse`, Cohere v2), per-format `parseChunk()` for SSE deltas
- ✅ `src/api/rotationEngine.js` — async generator: tries active keys in order, 429 → 60s cooldown → next key, ReadableStream-based SSE parsing, emits `status`/`content`/`done`/`retry`/`error` chunks
- ✅ `keysStore.js` with `persist` to `nexus.keys` localStorage
- ✅ `sessionStore.js` with `persist` to `nexus.sessions` — sessions + messagesBySession dictionary + export/import helpers

### New UX
- ✅ Sidebar now has: API Keys / Export Chat (.md) / **Backup All (.json)** / **Import Backup** buttons
- ✅ Pinned sessions sort to top of session list
- ✅ Graceful no-key state: input placeholder switches to "Add an API key in Settings to start chatting..."
- ✅ All other UX (6 modes, mode glow, status bar with green/amber/red dot, syntax highlighting, copy-code button) preserved from v1

### GitHub Pages Deployment
- ✅ `.github/workflows/deploy.yml` — checkout, yarn install with cache, `BASE_URL=/<repo>/ yarn build`, upload + deploy to Pages
- ✅ `vite.config.js` reads `process.env.BASE_URL` so the same workflow works for any repo name
- ✅ `README.md` rewritten with run-locally + GitHub Pages instructions

### Verification
- ✅ Vite dev server running on port 3000 (supervised by Emergent supervisor, `yarn start` → vite)
- ✅ Production build succeeds: 3199 modules → 484 KB gzipped JS, asset paths prefixed correctly with `BASE_URL`
- ✅ Lint clean across all `src/` files
- ✅ E2E sanity: 3 sessions created from mode clicks, persisted in localStorage, sidebar reactive, status bar shows correct empty state

## Known Limitations
- OpenAI/Anthropic browser-direct calls work but expose keys in client memory (user explicitly accepted this trade-off — solo single-user app)
- Token counts are byte-length/4 estimates, not exact provider counts
- No streaming-cancel button (would need exposing the AbortController to UI)
- Model selection is per-provider default — no UI for picking specific models yet

## Backlog
- P1: Model picker dropdown per provider (e.g. let user choose `gpt-4o` vs `gpt-4o-mini`)
- P1: Cancel-streaming button wired to the `AbortController`
- P1: System Prompt Override input
- P2: Rate Limit dashboard tab showing all keys + cooldown timers
- P2: Light theme toggle
