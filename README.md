# NEXUS

> Multi-provider AI hub with automatic API-key rotation. Pure client-side. Runs locally and on GitHub Pages — no server required.
VISIT WEBSITE AT "https://markstock-it.github.io/Reusable-Ai/"
## What it does

- Six AI modes (**General**, **Code**, **Render**, **Study**, **Analyze**, **Creative**) each with a hidden system prompt and tailored UX
- Rotates through your API keys: when one hits a 429 (rate-limit), the next one is tried automatically; the rate-limited key cools down for 60s
- Supports six providers, calls them **directly from your browser**:
  - **OpenAI** (`sk-…`) — requires browser-direct access
  - **Anthropic** (`sk-ant-…`) — uses the `anthropic-dangerous-direct-browser-access` header
  - **Google Gemini** (`AIza…`)
  - **Groq** (`gsk_…`)
  - **Mistral**
  - **Cohere** (`co-…`)
- All keys, sessions, and messages live in your browser's `localStorage` — nothing is sent to any server we control
- Export single chats as Markdown, or a full JSON backup of everything; re-import any time
- "Apple-level luxury meets aurora night" UI — dark theme, violet accents, glassmorphism, monospaced status bar

## Running locally

```bash
cd frontend
yarn install
yarn dev
```

Open <http://localhost:3000>. Click **API Keys** in the bottom-left sidebar and paste in a key — the provider is auto-detected from the prefix. Pick a mode (e.g. **Just Chat**) and start chatting.

##  Deploying to GitHub Pages

There are two ways:

### Option A — GitHub Actions (recommended)

1. Push this repo to GitHub.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The workflow at `.github/workflows/deploy.yml` runs on every push to `main` and publishes the contents of `frontend/dist/` to Pages.
4. Your site lives at `https://<your-username>.github.io/<repo-name>/`.

The workflow automatically sets the Vite `base` to `/<repo-name>/` so assets resolve correctly under a project subpath. If you're using a custom domain or a `<username>.github.io` user-site (no subpath), edit the workflow to drop `BASE_URL`.

### Option B — Manual

```bash
cd frontend
BASE_URL="/your-repo-name/" yarn build
# Output is in frontend/dist/ — push that to a gh-pages branch, or:
yarn deploy   # uses gh-pages package
```

##  Repo layout

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx             # Vite entry
    ├── App.jsx
    ├── index.css            # Tailwind + design tokens
    ├── api/
    │   ├── providers.js     # provider configs + request builders + SSE parsers
    │   └── rotationEngine.js  # client-side rotation engine
    ├── stores/              # Zustand stores (all localStorage-backed)
    │   ├── keysStore.js
    │   ├── sessionStore.js
    │   ├── modeStore.js
    │   └── statusStore.js
    ├── components/
    │   ├── ModeSwitcher.jsx
    │   ├── SessionList.jsx
    │   ├── ChatCanvas.jsx
    │   ├── ChatInput.jsx
    │   ├── MessageBubble.jsx
    │   ├── SettingsDrawer.jsx
    │   └── APIStatusBar.jsx
    └── hooks/
        └── use-toast.js
.github/workflows/deploy.yml
backend/                     # Legacy stub — ignore / delete when pushing to GitHub
```

The `backend/` folder is unused — it only contains a tiny FastAPI stub kept around for the Emergent preview environment's supervisor. **Safe to delete** when you push to your own GitHub repo.

##  Security notes

- This is a **single-user app**. Your API keys are stored in plaintext in `localStorage`. Don't share your browser profile.
- All API calls go **directly from your browser** to the provider. No proxy, no middleware.
- OpenAI and Anthropic both technically discourage browser-direct calls. NEXUS uses the documented `anthropic-dangerous-direct-browser-access` opt-in for Anthropic. For OpenAI, the request just works because the API itself doesn't enforce CORS. The risk is solely that anyone with access to your browser's storage can read your keys — same as any localStorage-backed app.

##  Importing / exporting

- **Export Chat (.md)** — sidebar button, dumps the current session as Markdown
- **Backup All (.json)** — sidebar button, dumps every session + every message as one JSON file
- **Import Backup** — sidebar button, restore from a JSON file; new sessions are merged in, existing IDs are kept untouched

##  Tech

- React 18 + Vite 6
- Zustand (with `persist` middleware for localStorage)
- Tailwind CSS
- `react-markdown` + `react-syntax-highlighter` for chat rendering
- `lucide-react` for icons
- `date-fns` for timestamps

## License

MIT. Use it for whatever.
