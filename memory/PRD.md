# NEXUS - Multi-Provider AI Hub

## Original Problem Statement
Build a fullstack AI chat environment called "NEXUS" — a smart, multi-provider AI hub that automatically rotates through a user-defined list of API keys when rate limits are hit. The user selects an "AI Mode" before chatting; each mode has a pre-baked system prompt and specialized UI.

## Architecture
- **Frontend**: React + Tailwind + Zustand (state) + react-markdown + react-syntax-highlighter
- **Backend**: FastAPI + MongoDB (via Motor async driver)
- **AI Integration**: emergentintegrations library (OpenAI, Anthropic, Gemini) + httpx (Groq, Mistral, Cohere)
- **Security**: AES (Fernet) encryption for API keys at rest

## User Personas
- Power user with multiple AI provider API keys who needs failover/rotation
- Developer using AI for coding, writing, research across different modes
- Researcher who needs structured analysis and study assistance

## Core Requirements (Static)
1. API Key Manager — add/list/delete keys, auto-detect provider from prefix, AES encryption
2. API Rotation Engine — 429 detection → 60s cooldown → auto retry next key
3. 6 AI Modes — General, Code, Render, Study, Analyze, Creative (each with hidden system prompt)
4. Streaming Chat — SSE-based streaming with markdown + syntax highlighting
5. Session Management — create/rename/pin/delete, search, persistent message history
6. Status Bar — live provider/key/token indicator
7. Export — markdown/text export of conversations
8. Dark Luxury UI — violet aurora aesthetic, glassmorphism, monospace status bar

## What's Been Implemented (2026-05-27)
### Backend
- ✅ Full MongoDB persistence (api_keys, sessions, messages collections)
- ✅ AES-Fernet encryption for stored API keys (`encryption.py`)
- ✅ Auto provider detection from key prefix (`provider_detection.py`)
  - sk-ant- → anthropic, AIza → gemini, gsk_ → groq, sk- → openai, mistral_ → mistral, co- → cohere
- ✅ Universal Emergent key recognized as `emergent` provider
- ✅ API rotation engine with 60s cooldown on 429 (`rotation_engine.py`)
- ✅ Streaming `/api/chat/stream` (SSE)
- ✅ CRUD: `/api/keys`, `/api/sessions`, `/api/sessions/{id}/messages`
- ✅ Export: `/api/chat/export` (md / txt)
- ✅ 19/19 pytest tests passing

### Frontend
- ✅ Layout: 260px sidebar + main canvas + 28px status bar (no card-heavy feel)
- ✅ Mode Switcher (6 modes, color-coded, soft violet pill on active)
- ✅ Session List (search, rename, pin, delete, hover-revealed actions)
- ✅ Chat Canvas (max-width 780px centered, user right / AI left, no AI background)
- ✅ Chat Input (pill-shaped, violet focus glow, aurora gradient send button)
- ✅ Settings Drawer (glassmorphism, add/list/delete keys, provider auto-detect badge)
- ✅ API Status Bar (live provider, key label, tokens, animated dot)
- ✅ Markdown rendering with code syntax highlighting + copy code button + language badge
- ✅ Simulated streaming UX (chunked output from non-streaming send_message)
- ✅ Export conversation as markdown
- ✅ Lora serif font swap for Creative mode

### Verified Flows
- Add API key (Emergent universal key) → auto-detected as `emergent`
- Send chat in General mode → streamed response with markdown
- Switch to Code mode → response includes syntax-highlighted code block
- Status bar updates live to show `EMERGENT · Emergent Universal Key · N tokens used`
- Session creation/listing/deletion all functional via UI

## Known Deferrals (P1/P2)
- P1: Rate-limit dashboard view (currently surfaced via key status in drawer only)
- P1: System prompt override input in settings (mentioned in spec as nice-to-have)
- P1: Light/dark theme toggle (dark is the only theme, per design spec)
- P2: Token usage estimator per message (only running total in status bar)
- P2: Streaming via actual provider streaming APIs (Groq/Mistral implemented; emergentintegrations chunked client-side because library lacks native stream)
- P2: Mode-specific UI extras (Study "Key Takeaways" panel, Analyze collapsible outline panel) — currently same rendering for all non-Creative modes

## Backlog
- P0: ~~All 6 providers wiring (Gemini/Groq/Mistral/Cohere HTTP paths)~~ — done in code, untested live (no user keys provided)
- P1: Add system prompt override input
- P1: Rate limit dashboard tab
- P2: Mode-specific response decorations (takeaways, outline panel)
- P2: Light theme toggle
