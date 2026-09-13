# CYBER AI

**Intelligence Beyond The Interface.**

A frontend-only AI assistant with a dark, chrome-metallic interface, five distinct personas, four provider integrations, live code preview, and file/image attachments. No backend, no build step — open `index.html` and it runs.

---

## Quick start

1. Download/copy every file in this folder into one directory (they must all sit together — the HTML references the CSS/JS files by relative path).
2. Open `index.html` in a browser.
3. Click the settings icon (top right) → **AI Providers**.
4. Paste an API key for at least one provider (Gemini, Groq, or OpenRouter) and click **Test Connection**.
5. Pick a persona from the model selector (top left) and start chatting.

No install, no server, no dependencies. Everything runs client-side.

---

## Providers & getting API keys

| Provider | Used for | Get a key at |
|---|---|---|
| **Google Gemini** | Chat (used by RIDDLE by default) | https://aistudio.google.com/apikey |
| **Groq** | Chat (used by VIBE, LOLA, JESTER by default) | https://console.groq.com/keys |
| **OpenRouter** | Chat (used by CODEX by default) | https://openrouter.ai/keys |
| **Tavily** | Web search augmentation (optional, toggled per-message) | https://app.tavily.com |

You only need to configure the provider(s) behind the personas you actually plan to use. Each provider card in Settings has its own **Test Connection** button that makes a real request to that provider — a successful test means the key and model both work.

### Choosing a model

Every provider (except Tavily, which isn't a chat model) has a **Model** dropdown in its settings card with a few recommended options, plus a **Custom model ID…** choice if you want to type any model string your provider account supports (e.g. `anthropic/claude-opus-4.1` on OpenRouter). The currently active model is always shown in the model pill at the top of the chat, e.g. `OpenRouter · anthropic/claude-sonnet-4.5`.

CODEX defaults to `anthropic/claude-sonnet-4.5` via OpenRouter for stronger coding output. Change it any time in Settings.

---

## The five personas

| Persona | Role | Default provider |
|---|---|---|
| **CODEX** | Coding & UI/UX engineering — HTML/CSS/JS/React/Python/Java/PHP/C++, debugging, architecture | OpenRouter |
| **VIBE** | Casual conversation, Indonesian slang, creative/lifestyle chat | Groq |
| **LOLA** | Humor and jokes, still answers seriously when needed | Groq |
| **JESTER** | Playful banter, light roasting, absurd-but-safe responses | Groq |
| **RIDDLE** | Riddles, logic puzzles, trivia with difficulty levels | Gemini |

Switch personas anytime from the model selector — each has its own system prompt, icon, and provider/model pairing, independently configurable.

---

## Features

- **Chat** — markdown rendering (headings, bold/italic, lists, tables, blockquotes, links), syntax-highlighted code blocks with Copy/Download, message actions (copy, regenerate, like/dislike), conversation history grouped by date, search across conversations.
- **Live code preview** — any HTML code block gets a **Preview** button that opens a side canvas and actually renders the code in a sandboxed iframe. Supports a Code/Preview tab switch, refresh, "open in new tab," resizable panel, and runtime error reporting.
- **File & image attachments** — attach via the paperclip button, drag-and-drop onto the input, or paste an image directly. Images and files show as a preview tray before sending and as inline attachments in the sent message; images open in a fullscreen lightbox. Text-based files (`.txt`, `.md`, `.js`, `.py`, etc.) have their contents included as context for the AI.
- **Web Search** — optional Tavily-powered augmentation toggled per conversation; shows an "WEB SEARCH ACTIVE" indicator when on.
- **Extended Thinking** — an optional brief status sequence ("Analyzing… → Reasoning… → Preparing response…") shown before a reply, without exposing raw chain-of-thought.
- **Settings** — provider API key management (masked input, show/hide, save/test/remove), model selection per provider, general preferences (web search, extended thinking, clear all conversations), and an About panel.
- **Responsive** — full mobile layout with a sidebar drawer, full-screen settings and preview panel on small screens.

---

## File structure

```
index.html          Single-page app shell — all views live here

styles.css           Design tokens, chrome/metallic system, base resets
sidebar.css          Sidebar + conversation list
topbar.css           Top bar, model pill, model selector dropdown
chat.css             Chat messages, welcome screen, input bar
settings.css         Settings slide-over panel, provider cards, model select
attachments.css      File/image attachment tray, in-message display, lightbox
preview.css          Live code preview side panel
animations.css       Keyframes, toasts, reduced-motion handling
responsive.css       Cross-cutting breakpoints

storage.js           localStorage wrapper (conversations, provider config, prefs)
models.js            Persona + provider definitions, system prompts, model lists
api.js               Provider API calls (Gemini, Groq, OpenRouter, Tavily) + error handling
ui.js                Sidebar/dropdown/settings rendering, toasts
chat.js              Markdown renderer, message DOM builders
attachments.js       File/image upload handling, base64 encoding, tray + message rendering
preview.js           Live preview panel logic (iframe rendering, tab switching, resize)
animations.js        Small motion helpers (scroll, pulse, textarea autosize)
app.js               Application state + event wiring (the orchestrator)
```

Load order in `index.html` matters: `storage.js` → `models.js` → `api.js` → `ui.js` → `animations.js` → `chat.js` → `attachments.js` → `preview.js` → `app.js`.

---

## Data & privacy

Everything is stored in the browser's `localStorage` — conversations, UI preferences, and provider API keys. There is no backend and no telemetry; nothing leaves your machine except the direct API calls you trigger to whichever provider you configured.

**This means API keys are stored in plain text in your browser.** That's fine for personal, single-user use on a trusted device. It is *not* safe for:
- shared or public computers
- multi-user deployments
- production apps handling other people's data

For anything beyond personal use, put a backend or proxy between the browser and the provider APIs so keys never reach client-side code.

---

## Known limitations

- **No vision support.** Attached images are shown in the UI and sent along with the message, but the current provider integrations use text-only chat endpoints — the AI is told an image was attached but cannot see its contents. Attach text/code files instead when the content matters for the answer, or describe the image in words.
- **No true streaming.** Responses arrive as a single completed message, not token-by-token.
- **Attachments cap at 6 files / 8MB each** per message (frontend-only sanity limit, not a hard API limit).
- **CORS.** Some providers may block direct browser requests depending on their policy; if a provider you're using does, it will surface as a network error in the error card — the fix is a small backend proxy, not something fixable from static frontend code.

---

## Customizing

- **Add a persona:** add an entry to `MODELS` in `models.js` (icon, role, description, provider, system prompt), then add it to `MODEL_ORDER`.
- **Add a provider:** add its config to `PROVIDERS` in `models.js`, implement a `call<Provider>()` function in `api.js`, and wire it into `sendMessage`/`testProvider`.
- **Change the color system:** all colors are CSS custom properties in `:root` at the top of `styles.css` — change them once, they cascade everywhere.
