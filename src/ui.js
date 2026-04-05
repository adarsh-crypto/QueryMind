export const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QueryMind</title>
    <meta
      name="description"
      content="A ChatGPT-style multi-model Ollama Cloud workspace with streaming responses, search-backed context, and rolling token tracking."
    />
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-top">
          <div class="sidebar-header">
            <div class="brand-row">
              <div class="brand-lockup">
                <div class="brand-mark">Q</div>
                <div>
                  <p class="brand-name">QueryMind</p>
                  <p class="brand-subtitle">Reasoning Studio</p>
                </div>
              </div>
              <button class="chrome-button" type="button" aria-label="Workspace overview">::</button>
            </div>

            <button id="new-chat-button" class="sidebar-create" type="button">New thread</button>
          </div>

          <nav class="sidebar-nav" aria-label="Workspace">
            <p class="sidebar-section-label">Modes</p>
            <button id="nav-compose" class="nav-item is-active" type="button">
              <span class="nav-item-glyph">C</span>
              <span class="nav-item-copy">
                <strong class="nav-item-title">Compose</strong>
                <span class="nav-item-meta">Stay in the flow and send fast with Enter.</span>
              </span>
            </button>
            <button id="nav-search" class="nav-item" type="button">
              <span class="nav-item-glyph">S</span>
              <span class="nav-item-copy">
                <strong class="nav-item-title">Search</strong>
                <span class="nav-item-meta">Pull live context only when the answer needs it.</span>
              </span>
            </button>
            <button id="nav-structure" class="nav-item" type="button">
              <span class="nav-item-glyph">I</span>
              <span class="nav-item-copy">
                <strong class="nav-item-title">Inputs</strong>
                <span class="nav-item-meta">Open context, constraints, references, and system prompts.</span>
              </span>
            </button>
          </nav>

          <section class="panel studio-panel">
            <div class="panel-header">
              <p class="panel-label">Studio</p>
              <span id="model-count-display" class="panel-pill subtle">0 models</span>
            </div>
            <div class="studio-grid">
              <div class="studio-stat">
                <span class="studio-stat-label">Active model</span>
                <strong id="active-model-display">-</strong>
              </div>
              <div class="studio-stat">
                <span class="studio-stat-label">Search mode</span>
                <strong id="search-mode-display">Model only</strong>
              </div>
              <div class="studio-stat">
                <span class="studio-stat-label">Posture</span>
                <strong>Serverless</strong>
              </div>
            </div>
          </section>
        </div>

        <section class="panel conversation-panel">
          <div class="panel-header">
            <p class="panel-label">Recents</p>
            <span id="conversation-count" class="panel-pill">0</span>
          </div>
          <div id="conversation-list" class="conversation-list"></div>
        </section>

        <section class="panel usage-panel">
          <div class="panel-header">
            <p class="panel-label">Usage</p>
            <span id="usage-plan-badge" class="panel-pill subtle">FREE</span>
          </div>
          <div id="usage-panel-body"></div>
        </section>

        <footer class="account-card">
          <div class="account-avatar">Q</div>
          <div>
            <p class="account-name">querymind.eeveon.com</p>
            <p class="account-plan">Cloudflare Worker runtime</p>
          </div>
        </footer>
      </aside>

      <main class="workspace">
        <header class="workspace-header">
          <div class="workspace-heading">
            <p class="workspace-kicker">Serverless reasoning studio</p>
            <button id="focus-prompt-button" class="workspace-title" type="button">QueryMind</button>
            <p class="workspace-subtitle">A focused multi-model workspace running on Ollama Cloud with optional web search, structured grounding, and live streaming by default.</p>
          </div>

          <div class="workspace-toolbar">
            <label class="toolbar-control toolbar-model">
              <span>Model</span>
              <select id="model-select"></select>
            </label>

            <label class="toolbar-toggle">
              <input id="search-toggle" type="checkbox" checked />
              <span>Web search</span>
            </label>

            <button id="advanced-toggle" class="toolbar-button" type="button">Structured Inputs</button>
            <div id="token-pill" class="toolbar-chip">0 tokens this chat</div>
          </div>
        </header>

        <section class="hero-band">
          <div class="hero-main">
            <p class="hero-eyebrow">Built for real work, not throwaway prompts</p>
            <h1>Switch models, search when it matters, and shape the answer without leaving the thread.</h1>
            <p class="hero-copy">QueryMind keeps the interface calm while the backend stays fully serverless. Use it for research, synthesis, drafting, and fast comparison without dragging extra tools into the loop.</p>
            <div class="hero-chip-row">
              <span class="hero-chip">Streaming replies</span>
              <span class="hero-chip">Search on demand</span>
              <span class="hero-chip">Structured inputs</span>
              <span class="hero-chip">Rolling usage telemetry</span>
            </div>
          </div>

          <div class="hero-side">
            <div class="hero-side-card">
              <p class="hero-side-label">Current lane</p>
              <div id="hero-model-display" class="hero-side-value">-</div>
              <p class="hero-side-copy">Hot-swap models without losing the conversation.</p>
            </div>
            <div class="hero-side-card highlight">
              <p class="hero-side-label">Session load</p>
              <div id="hero-session-display" class="hero-side-value">0 tokens</div>
              <p id="hero-search-display" class="hero-side-copy">Search mode: model only</p>
            </div>
          </div>
        </section>

        <div id="status-banner" class="status-banner hidden"></div>

        <section id="message-list" class="message-list"></section>

        <form id="composer-form" class="composer">
          <div id="advanced-panel" class="advanced-panel hidden">
            <label class="input-block">
              <span>Context</span>
              <textarea
                id="context-input"
                rows="4"
                placeholder="Background, facts, or notes you want the model to keep in view."
              ></textarea>
            </label>

            <label class="input-block">
              <span>Constraints</span>
              <textarea
                id="constraints-input"
                rows="4"
                placeholder="Formatting rules, tone, or requirements the model should follow."
              ></textarea>
            </label>

            <label class="input-block">
              <span>References</span>
              <textarea
                id="references-input"
                rows="4"
                placeholder="URLs, copied snippets, or examples that should ground the answer."
              ></textarea>
            </label>

            <label class="input-block full">
              <span>System Prompt</span>
              <textarea
                id="system-prompt-input"
                rows="4"
                placeholder="Optional global instruction for this conversation."
              ></textarea>
            </label>
          </div>

          <div class="composer-shell">
            <div class="composer-leading" aria-hidden="true">+</div>
            <div class="composer-body">
              <textarea
                id="prompt-input"
                rows="2"
                placeholder="Ask anything"
              ></textarea>

              <div class="composer-footer">
                <p class="composer-note">
                  Press Enter to send and Shift+Enter for a newline. QueryMind tracks rolling local usage over the last 5 hours and 7 days because exact remaining Ollama quota is not exposed by the public API.
                </p>

                <div class="composer-footer-actions">
                  <button id="stop-button" class="toolbar-button" type="button" disabled>Stop</button>
                  <button id="send-button" class="send-button" type="submit">Send</button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>

    <script type="module" src="/app.js"></script>
  </body>
</html>
`;

export const appCss = `:root {
  color-scheme: dark;
  --bg: #091117;
  --bg-deep: #0d171d;
  --sidebar: rgba(8, 13, 17, 0.82);
  --panel: rgba(18, 28, 34, 0.82);
  --panel-strong: rgba(24, 37, 45, 0.96);
  --panel-hover: rgba(30, 47, 56, 0.95);
  --surface: #18242b;
  --surface-strong: #223139;
  --line: rgba(165, 192, 202, 0.16);
  --line-strong: rgba(165, 192, 202, 0.26);
  --text: #edf3f5;
  --muted: #91a4ad;
  --muted-strong: #bfd1d8;
  --accent: #f3c26b;
  --accent-strong: #ffdf9c;
  --accent-cool: #72d5c1;
  --danger: #ff7a7a;
  --success: #5fddb7;
  --shadow-lg: 0 28px 80px rgba(0, 0, 0, 0.32);
  --shadow-md: 0 18px 38px rgba(0, 0, 0, 0.24);
  --radius-xl: 34px;
  --radius-lg: 24px;
  --radius-md: 18px;
  --radius-sm: 14px;
  --font-sans: "Avenir Next", "SF Pro Display", "Segoe UI", sans-serif;
  --font-display: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--text);
  background:
    radial-gradient(circle at 10% 12%, rgba(114, 213, 193, 0.16), transparent 28%),
    radial-gradient(circle at 82% 8%, rgba(243, 194, 107, 0.18), transparent 24%),
    radial-gradient(circle at 50% 100%, rgba(57, 118, 132, 0.16), transparent 32%),
    linear-gradient(180deg, var(--bg) 0%, var(--bg-deep) 100%);
}

body::before,
body::after {
  content: "";
  position: fixed;
  inset: auto;
  pointer-events: none;
  z-index: 0;
  filter: blur(16px);
}

body::before {
  top: 88px;
  left: 42%;
  width: 260px;
  height: 260px;
  border-radius: 999px;
  background: rgba(243, 194, 107, 0.08);
}

body::after {
  right: 8%;
  bottom: 12%;
  width: 320px;
  height: 320px;
  border-radius: 999px;
  background: rgba(114, 213, 193, 0.08);
}

button,
select,
textarea {
  font: inherit;
}

button {
  color: inherit;
  cursor: pointer;
}

button,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}

textarea {
  appearance: none;
}

.app-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 18px;
  padding: 20px 18px;
  background: linear-gradient(180deg, rgba(8, 13, 17, 0.9) 0%, rgba(8, 13, 17, 0.72) 100%);
  border-right: 1px solid var(--line);
  backdrop-filter: blur(18px);
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.brand-row,
.brand-lockup,
.account-card {
  display: flex;
  align-items: center;
}

.brand-row,
.account-card {
  justify-content: space-between;
}

.brand-lockup,
.account-card {
  gap: 12px;
}

.brand-mark,
.account-avatar {
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(135deg, rgba(243, 194, 107, 0.22), rgba(114, 213, 193, 0.2)),
    rgba(18, 28, 34, 0.9);
  color: var(--accent-strong);
  font-size: 1rem;
  font-weight: 800;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.chrome-button,
.sidebar-create,
.toolbar-button,
.send-button,
.panel-pill,
.toolbar-chip,
.nav-item,
.conversation-item,
.starter-card {
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.chrome-button {
  display: grid;
  place-items: center;
  inline-size: 40px;
  block-size: 40px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.02);
  color: var(--muted-strong);
}

.brand-name,
.account-name,
.panel-label,
.conversation-title,
.nav-item-title {
  margin: 0;
}

.brand-name,
.account-name {
  font-size: 1rem;
  font-weight: 700;
}

.brand-subtitle,
.account-plan,
.nav-item-meta,
.usage-metric-detail,
.message-meta,
.conversation-meta,
.composer-note,
.empty-state p,
.hero-copy,
.hero-side-copy,
.workspace-subtitle {
  margin: 4px 0 0;
  color: var(--muted);
}

.sidebar-create,
.toolbar-button,
.send-button,
.panel-pill,
.toolbar-chip {
  border-radius: 999px;
  border: 1px solid var(--line);
}

.sidebar-create,
.send-button {
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
  color: #151311;
  font-weight: 800;
}

.sidebar-create {
  inline-size: 100%;
  padding: 13px 16px;
  text-align: center;
  box-shadow: 0 12px 28px rgba(243, 194, 107, 0.16);
}

.toolbar-button,
.send-button {
  padding: 10px 16px;
}

.toolbar-button {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.send-button {
  min-inline-size: 92px;
}

.chrome-button:hover,
.sidebar-create:hover,
.toolbar-button:hover,
.send-button:hover,
.conversation-item:hover,
.nav-item:hover,
.starter-card:hover,
.toolbar-toggle:hover,
.toolbar-control:hover {
  transform: translateY(-1px);
}

.chrome-button:hover,
.toolbar-button:hover,
.nav-item:hover,
.conversation-item:hover,
.starter-card:hover,
.toolbar-toggle:hover,
.toolbar-control:hover {
  border-color: var(--line-strong);
  background: rgba(255, 255, 255, 0.05);
}

.chrome-button:disabled,
.sidebar-create:disabled,
.toolbar-button:disabled,
.send-button:disabled {
  opacity: 0.56;
  cursor: not-allowed;
  transform: none;
}

.sidebar-nav {
  display: grid;
  gap: 10px;
}

.sidebar-section-label {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.nav-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  padding: 12px 13px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.01);
  text-align: left;
}

.nav-item.is-active {
  border-color: rgba(243, 194, 107, 0.24);
  background:
    linear-gradient(135deg, rgba(243, 194, 107, 0.1), rgba(114, 213, 193, 0.08)),
    rgba(255, 255, 255, 0.02);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.nav-item-glyph {
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  color: var(--accent-strong);
  font-size: 0.8rem;
  font-weight: 800;
}

.nav-item-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item-title {
  font-size: 0.92rem;
  font-weight: 700;
}

.nav-item-meta {
  font-size: 0.78rem;
  line-height: 1.45;
}

.panel {
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(18px);
}

.studio-panel,
.conversation-panel,
.usage-panel {
  padding: 14px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-label {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.panel-pill,
.toolbar-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.76rem;
  font-weight: 800;
}

.panel-pill.subtle {
  color: var(--muted-strong);
}

.studio-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.studio-stat {
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.05);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    rgba(255, 255, 255, 0.02);
}

.studio-stat-label {
  display: block;
  margin-bottom: 8px;
  color: var(--muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.studio-stat strong {
  display: block;
  font-size: 0.92rem;
  line-height: 1.4;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 35vh;
  overflow: auto;
}

.conversation-item {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.01);
  text-align: left;
}

.conversation-item.active {
  border-color: rgba(114, 213, 193, 0.2);
  background:
    linear-gradient(135deg, rgba(114, 213, 193, 0.08), rgba(243, 194, 107, 0.08)),
    rgba(255, 255, 255, 0.02);
}

.conversation-title {
  margin: 0 0 6px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text);
}

.conversation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.75rem;
}

.conversation-delete {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 0.77rem;
}

.usage-grid {
  display: grid;
  gap: 10px;
}

.usage-metric {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.usage-metric-label {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.usage-metric-value {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.usage-metric-detail {
  font-size: 0.77rem;
  line-height: 1.55;
}

.usage-bar {
  margin-top: 10px;
  overflow: hidden;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
}

.usage-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-cool));
}

.account-card {
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.02);
}

.workspace {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  gap: 0;
  min-height: 100vh;
  padding: 24px 28px 0;
}

.workspace-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.workspace-heading {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 740px;
}

.workspace-kicker {
  margin: 0;
  color: var(--accent-strong);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.workspace-title {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  font-family: var(--font-display);
  font-size: clamp(2.3rem, 4vw, 3.9rem);
  line-height: 0.96;
  letter-spacing: -0.04em;
}

.workspace-subtitle {
  max-width: 66ch;
  font-size: 0.96rem;
  line-height: 1.6;
}

.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.toolbar-control,
.toolbar-toggle,
.toolbar-button,
.toolbar-chip {
  min-height: 46px;
}

.toolbar-control,
.toolbar-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
}

.toolbar-chip {
  border-color: rgba(243, 194, 107, 0.24);
  background: linear-gradient(135deg, rgba(243, 194, 107, 0.13), rgba(114, 213, 193, 0.08));
  color: var(--accent-strong);
  font-weight: 800;
}

.toolbar-control span {
  color: var(--muted);
  font-size: 0.77rem;
  font-weight: 700;
}

.toolbar-model select {
  min-width: 188px;
  border: 0;
  background: transparent;
  color: var(--text);
  outline: none;
}

.toolbar-toggle input {
  inline-size: 18px;
  block-size: 18px;
  accent-color: var(--accent);
}

.toolbar-toggle span {
  font-size: 0.88rem;
}

.hero-band {
  width: min(100%, 1080px);
  margin: 26px auto 0;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) 300px;
  gap: 18px;
  transition: grid-template-columns 200ms ease, transform 200ms ease;
}

.hero-main,
.hero-side-card {
  border-radius: 28px;
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px);
}

.hero-main {
  padding: 26px 28px;
  background:
    radial-gradient(circle at top left, rgba(243, 194, 107, 0.14), transparent 32%),
    linear-gradient(135deg, rgba(18, 28, 34, 0.96), rgba(24, 37, 45, 0.88));
}

.hero-eyebrow {
  margin: 0 0 12px;
  color: var(--accent-strong);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-main h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 3.1vw, 3rem);
  line-height: 1;
  letter-spacing: -0.04em;
  max-width: 14ch;
}

.hero-copy {
  max-width: 62ch;
  font-size: 0.97rem;
  line-height: 1.7;
}

.hero-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted-strong);
  font-size: 0.8rem;
  font-weight: 700;
}

.hero-side {
  display: grid;
  gap: 18px;
}

.hero-side-card {
  padding: 18px;
  background: linear-gradient(180deg, rgba(18, 28, 34, 0.92), rgba(18, 28, 34, 0.74));
}

.hero-side-card.highlight {
  background:
    linear-gradient(180deg, rgba(243, 194, 107, 0.14), rgba(114, 213, 193, 0.09)),
    rgba(18, 28, 34, 0.9);
}

.hero-side-label {
  margin: 0 0 10px;
  color: var(--muted);
  font-size: 0.73rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-side-value {
  font-size: 1.28rem;
  font-weight: 800;
  line-height: 1.2;
}

.status-banner {
  margin: 16px auto 0;
  width: min(100%, 1000px);
  padding: 14px 18px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 122, 122, 0.26);
  background: rgba(255, 122, 122, 0.12);
}

.status-banner.info {
  border-color: rgba(95, 221, 183, 0.22);
  background: rgba(95, 221, 183, 0.12);
}

.hidden {
  display: none !important;
}

.message-list {
  width: min(100%, 1000px);
  margin: 0 auto;
  padding: 28px 0 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow: auto;
}

.empty-state {
  min-height: min(42vh, 480px);
  display: grid;
  place-items: center;
  text-align: center;
}

.empty-state-label {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(243, 194, 107, 0.2);
  background: rgba(243, 194, 107, 0.08);
  color: var(--accent-strong);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.empty-state h2 {
  margin: 16px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.empty-state p {
  margin: 12px auto 0;
  font-size: 0.98rem;
  line-height: 1.7;
  max-width: 60ch;
}

.starter-grid {
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  text-align: left;
}

.starter-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
    rgba(18, 28, 34, 0.82);
  box-shadow: var(--shadow-md);
}

.starter-card:hover {
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.24);
}

.starter-card-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.starter-card-flag {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--muted-strong);
  font-size: 0.72rem;
  font-weight: 700;
}

.starter-card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
}

.starter-card-copy {
  margin: 0;
  color: var(--muted);
  font-size: 0.87rem;
  line-height: 1.55;
}

.message-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: message-rise 220ms ease;
}

.message-card.assistant {
  max-width: min(100%, 900px);
  padding: 22px 24px;
  border-radius: 28px;
  border: 1px solid var(--line);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
    rgba(18, 28, 34, 0.84);
  box-shadow: var(--shadow-md);
}

.message-card.user {
  align-self: flex-end;
  width: min(78%, 760px);
  padding: 18px 20px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(243, 194, 107, 0.98), rgba(255, 223, 156, 0.96));
  color: #14110d;
  box-shadow: 0 18px 32px rgba(243, 194, 107, 0.18);
}

.message-card.user .message-role,
.message-card.user .message-meta,
.message-card.user .message-meta-chip {
  color: rgba(20, 17, 13, 0.7);
}

.message-card.user .message-meta-chip {
  background: rgba(20, 17, 13, 0.08);
  border-color: rgba(20, 17, 13, 0.08);
}

.message-role {
  color: var(--muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.message-content {
  font-size: 1rem;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-card.assistant .message-content {
  font-size: 1.02rem;
}

.message-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.78rem;
}

.message-meta-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.composer {
  width: min(100%, 1000px);
  margin: 0 auto;
  padding: 0 0 30px;
}

.advanced-panel {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.input-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-block.full {
  grid-column: 1 / -1;
}

.input-block span {
  color: var(--muted);
  font-size: 0.73rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.input-block textarea,
.composer textarea {
  width: 100%;
  border: 1px solid var(--line);
  background: rgba(18, 28, 34, 0.86);
  color: var(--text);
  border-radius: 18px;
  padding: 14px 16px;
  resize: vertical;
  outline: none;
}

.input-block textarea:focus,
.composer textarea:focus,
.toolbar-model select:focus {
  box-shadow: 0 0 0 3px rgba(243, 194, 107, 0.14);
  border-color: rgba(243, 194, 107, 0.32);
}

.composer-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 18px;
  border-radius: 32px;
  border: 1px solid var(--line-strong);
  background:
    radial-gradient(circle at top left, rgba(243, 194, 107, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(24, 37, 45, 0.98), rgba(18, 28, 34, 0.95));
  box-shadow: var(--shadow-lg);
}

.composer-leading {
  display: grid;
  place-items: center;
  inline-size: 36px;
  block-size: 36px;
  margin-top: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: var(--accent-strong);
  font-size: 1.25rem;
  line-height: 1;
}

.composer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.composer-body textarea {
  min-height: 54px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  resize: none;
  font-size: 1rem;
  line-height: 1.7;
}

.composer-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.composer-note {
  max-width: 62ch;
  font-size: 0.83rem;
  line-height: 1.6;
}

.composer-footer-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

body.conversation-empty .message-list {
  align-content: end;
}

body.conversation-empty .composer {
  padding-bottom: 68px;
}

body.conversation-empty .composer-shell {
  max-width: 920px;
  margin: 0 auto;
}

body.conversation-active .hero-band {
  grid-template-columns: minmax(0, 1fr) 260px;
}

body.conversation-active .hero-main {
  padding-block: 20px;
}

body.conversation-active .hero-main h1 {
  font-size: clamp(1.7rem, 2.4vw, 2.4rem);
  max-width: 18ch;
}

body.conversation-active .hero-copy {
  font-size: 0.92rem;
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.11);
  border-radius: 999px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

@keyframes message-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1280px) {
  .app-shell {
    grid-template-columns: 286px minmax(0, 1fr);
  }

  .hero-band {
    grid-template-columns: minmax(0, 1fr) 260px;
  }
}

@media (max-width: 1120px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    grid-template-rows: auto auto auto auto;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .studio-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .conversation-list {
    max-height: 220px;
  }

  .workspace {
    padding-top: 18px;
  }
}

@media (max-width: 880px) {
  .workspace {
    padding-inline: 16px;
  }

  .workspace-header,
  .composer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .workspace-toolbar {
    justify-content: flex-start;
  }

  .hero-band,
  body.conversation-active .hero-band {
    grid-template-columns: 1fr;
  }

  .advanced-panel,
  .starter-grid {
    grid-template-columns: 1fr;
  }

  .message-card.user {
    width: 100%;
  }

  .composer-footer-actions {
    width: 100%;
  }

  .composer-footer-actions > button {
    flex: 1;
  }
}

@media (max-width: 720px) {
  body::before,
  body::after {
    display: none;
  }

  .sidebar {
    padding: 14px;
  }

  .studio-grid {
    grid-template-columns: 1fr;
  }

  .workspace {
    padding: 16px 14px 0;
  }

  .workspace-title {
    font-size: clamp(2rem, 10vw, 3rem);
  }

  .workspace-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .toolbar-control,
  .toolbar-toggle,
  .toolbar-button,
  .toolbar-chip {
    width: 100%;
    justify-content: center;
  }

  .toolbar-chip {
    grid-column: 1 / -1;
  }

  .toolbar-model select {
    min-width: 0;
    width: 100%;
  }

  .hero-main,
  .hero-side-card,
  .message-card.assistant,
  .composer-shell {
    border-radius: 24px;
  }

  .hero-main {
    padding: 22px 20px;
  }

  .hero-main h1 {
    max-width: none;
    font-size: clamp(1.7rem, 8vw, 2.45rem);
  }

  .message-list {
    gap: 14px;
    padding-top: 20px;
  }

  .composer-shell {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 16px;
  }

  .composer-leading {
    display: none;
  }
}

@media (max-width: 520px) {
  .sidebar {
    gap: 14px;
  }

  .panel,
  .account-card {
    border-radius: 20px;
  }

  .workspace-subtitle,
  .hero-copy,
  .empty-state p,
  .composer-note {
    font-size: 0.9rem;
  }

  .empty-state h2 {
    font-size: clamp(1.7rem, 10vw, 2.4rem);
  }

  .starter-card {
    padding: 14px;
  }

  .composer {
    padding-bottom: 20px;
  }

  body.conversation-empty .composer {
    padding-bottom: 32px;
  }
}
`;

export const appJs = `const STORAGE_KEY = "querymind-ui-state-v2";
const DEFAULT_USAGE_META = {
  provider: "ollama-cloud",
  plan: "free",
  default_model: "",
  exact_remaining_supported: false,
  billing_model: "provider-compute",
  session_window_hours: 5,
  weekly_window_days: 7,
  concurrency_limit: 1,
  estimated_session_token_budget: null,
  estimated_weekly_token_budget: null,
  estimated_session_runtime_budget_ns: null,
  estimated_weekly_runtime_budget_ns: null,
  note:
    "QueryMind tracks rolling local usage over the last 5 hours and 7 days because Ollama does not publish exact remaining quota or reset timestamps in the public API.",
};

const state = {
  models: [],
  usageMeta: DEFAULT_USAGE_META,
  usage: createEmptyUsage(),
  conversations: [],
  activeConversationId: null,
  draft: {
    prompt: "",
    context: "",
    constraints: "",
    references: "",
  },
  showAdvanced: false,
  isStreaming: false,
  abortController: null,
};

const elements = {
  newChatButton: document.getElementById("new-chat-button"),
  navCompose: document.getElementById("nav-compose"),
  navSearch: document.getElementById("nav-search"),
  navStructure: document.getElementById("nav-structure"),
  focusPromptButton: document.getElementById("focus-prompt-button"),
  usagePlanBadge: document.getElementById("usage-plan-badge"),
  usagePanelBody: document.getElementById("usage-panel-body"),
  conversationCount: document.getElementById("conversation-count"),
  conversationList: document.getElementById("conversation-list"),
  activeModelDisplay: document.getElementById("active-model-display"),
  searchModeDisplay: document.getElementById("search-mode-display"),
  modelCountDisplay: document.getElementById("model-count-display"),
  heroModelDisplay: document.getElementById("hero-model-display"),
  heroSessionDisplay: document.getElementById("hero-session-display"),
  heroSearchDisplay: document.getElementById("hero-search-display"),
  modelSelect: document.getElementById("model-select"),
  searchToggle: document.getElementById("search-toggle"),
  statusBanner: document.getElementById("status-banner"),
  messageList: document.getElementById("message-list"),
  composerForm: document.getElementById("composer-form"),
  advancedToggle: document.getElementById("advanced-toggle"),
  advancedPanel: document.getElementById("advanced-panel"),
  tokenPill: document.getElementById("token-pill"),
  promptInput: document.getElementById("prompt-input"),
  contextInput: document.getElementById("context-input"),
  constraintsInput: document.getElementById("constraints-input"),
  referencesInput: document.getElementById("references-input"),
  systemPromptInput: document.getElementById("system-prompt-input"),
  stopButton: document.getElementById("stop-button"),
  sendButton: document.getElementById("send-button"),
};

function createEmptyUsage() {
  return {
    requestCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    totalDurationNs: 0,
  };
}

function createConversation(model) {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    model: model || "",
    includeSearch: true,
    systemPrompt: "",
    messages: [],
    stats: createEmptyUsage(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeUsage(raw) {
  const base = createEmptyUsage();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  base.requestCount = Number(raw.requestCount || 0);
  base.promptTokens = Number(raw.promptTokens || 0);
  base.completionTokens = Number(raw.completionTokens || 0);
  base.totalTokens = Number(raw.totalTokens || base.promptTokens + base.completionTokens);
  base.totalDurationNs = Number(raw.totalDurationNs || 0);
  return base;
}

function normalizeConversation(raw, fallbackModel) {
  const conversation = createConversation(fallbackModel);
  if (!raw || typeof raw !== "object") {
    return conversation;
  }

  conversation.id = typeof raw.id === "string" ? raw.id : conversation.id;
  conversation.title = typeof raw.title === "string" && raw.title.trim() ? raw.title : conversation.title;
  conversation.model = typeof raw.model === "string" && raw.model.trim() ? raw.model : fallbackModel;
  conversation.includeSearch = raw.includeSearch !== false;
  conversation.systemPrompt = typeof raw.systemPrompt === "string" ? raw.systemPrompt : "";
  conversation.createdAt = Number(raw.createdAt || conversation.createdAt);
  conversation.updatedAt = Number(raw.updatedAt || conversation.updatedAt);
  conversation.stats = normalizeUsage(raw.stats);
  conversation.messages = Array.isArray(raw.messages)
    ? raw.messages
        .filter(function (message) {
          return message && typeof message.role === "string" && typeof message.content === "string";
        })
        .map(function (message) {
          return {
            id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
            role: message.role,
            content: message.content,
            model: typeof message.model === "string" ? message.model : "",
            searchResultsCount: Number(message.searchResultsCount || 0),
            createdAt: Number(message.createdAt || raw.updatedAt || raw.createdAt || Date.now()),
            usage: normalizeUsage(message.usage),
          };
        })
    : [];
  return conversation;
}

function loadPersistedState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState() {
  const payload = {
    usage: state.usage,
    conversations: state.conversations,
    activeConversationId: state.activeConversationId,
    showAdvanced: state.showAdvanced,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function getActiveConversation() {
  return state.conversations.find(function (conversation) {
    return conversation.id === state.activeConversationId;
  }) || null;
}

function setStatus(message, tone) {
  if (!message) {
    elements.statusBanner.textContent = "";
    elements.statusBanner.className = "status-banner hidden";
    return;
  }

  elements.statusBanner.textContent = message;
  elements.statusBanner.className = "status-banner" + (tone === "info" ? " info" : "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function formatDuration(nsValue) {
  const milliseconds = Math.max(0, Number(nsValue || 0) / 1000000);
  if (!milliseconds) {
    return "0 ms";
  }
  if (milliseconds < 1000) {
    return Math.round(milliseconds) + " ms";
  }
  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return seconds.toFixed(1) + " s";
  }
  return (seconds / 60).toFixed(1) + " min";
}

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

function formatUsageDetail(usage) {
  return formatNumber(usage.requestCount) + " requests · " + formatDuration(usage.totalDurationNs);
}

function getResolvedModelLabel(conversation) {
  if (conversation && typeof conversation.model === "string" && conversation.model.trim()) {
    return conversation.model.trim();
  }
  if (typeof state.usageMeta.default_model === "string" && state.usageMeta.default_model.trim()) {
    return state.usageMeta.default_model.trim();
  }
  if (state.models.length) {
    return state.models[0];
  }
  return "No model";
}

function getSearchModeLabel(conversation) {
  return conversation && conversation.includeSearch !== false ? "Live web" : "Model only";
}

function formatEstimateLine(used, budget, formatter, label) {
  const normalizedBudget = Number(budget || 0);
  if (!(normalizedBudget > 0)) {
    return "";
  }

  const percent = clampPercentage((used / normalizedBudget) * 100);
  return percent.toFixed(percent >= 10 ? 0 : 1) + "% of configured " + label + " estimate (" + formatter(normalizedBudget) + ")";
}

function buildRollingUsage() {
  const now = Date.now();
  const sessionWindowMs = Math.max(1, Number(state.usageMeta.session_window_hours || 5)) * 60 * 60 * 1000;
  const weeklyWindowMs = Math.max(1, Number(state.usageMeta.weekly_window_days || 7)) * 24 * 60 * 60 * 1000;
  const sessionCutoff = now - sessionWindowMs;
  const weeklyCutoff = now - weeklyWindowMs;
  const lifetime = createEmptyUsage();
  const session = createEmptyUsage();
  const weekly = createEmptyUsage();

  state.conversations.forEach(function (conversation) {
    conversation.messages.forEach(function (message) {
      if (!message || message.role !== "assistant") {
        return;
      }

      const usage = normalizeUsage(message.usage);
      if (!(usage.requestCount || usage.totalTokens || usage.totalDurationNs)) {
        return;
      }

      const createdAt = Number(message.createdAt || conversation.updatedAt || conversation.createdAt || 0);
      mergeUsage(lifetime, usage);
      if (createdAt >= sessionCutoff) {
        mergeUsage(session, usage);
      }
      if (createdAt >= weeklyCutoff) {
        mergeUsage(weekly, usage);
      }
    });
  });

  if (!(lifetime.requestCount || lifetime.totalTokens || lifetime.totalDurationNs)) {
    mergeUsage(lifetime, state.usage);
  }

  return {
    lifetime: lifetime,
    session: session,
    weekly: weekly,
  };
}

function renderUsageMetric(label, value, detail, barPercent) {
  return '<div class="usage-metric">' +
    '<p class="usage-metric-label">' + escapeHtml(label) + '</p>' +
    '<p class="usage-metric-value">' + escapeHtml(value) + '</p>' +
    (detail ? '<p class="usage-metric-detail">' + escapeHtml(detail) + '</p>' : "") +
    (typeof barPercent === "number" ? '<div class="usage-bar"><span style="width:' + clampPercentage(barPercent) + '%"></span></div>' : "") +
    '</div>';
}

function renderStarterGrid() {
  const cards = [
    {
      flag: "Search on",
      title: "Map a live landscape",
      copy: "Sweep the web, cluster the major shifts, and tell me what actually matters.",
      prompt: "Map the latest landscape for AI browser agents. Summarize the major shifts, notable products, and open questions in a concise brief.",
      search: true,
      advanced: false,
    },
    {
      flag: "Model compare",
      title: "Compare strong models",
      copy: "Set up a side-by-side judgment across reasoning, coding, and long-form writing.",
      prompt: "Compare glm-5, deepseek-v3.2, and gemma4:31b for long-form analysis, coding help, and grounded research. Give me a practical recommendation table.",
      search: false,
      advanced: false,
    },
    {
      flag: "Structured",
      title: "Turn notes into signal",
      copy: "Use the extra input fields to convert rough fragments into a sharp deliverable.",
      prompt: "Turn my rough notes into a crisp project brief with goals, risks, next steps, and open questions.",
      search: false,
      advanced: true,
    },
    {
      flag: "Grounded draft",
      title: "Blend search with my material",
      copy: "Use references, web context, and formatting constraints in one pass.",
      prompt: "Use search plus my references to draft a tight market scan with sourced claims and a short executive takeaway.",
      search: true,
      advanced: true,
    },
  ];

  return '<div class="starter-grid">' +
    cards.map(function (card) {
      return '<button class="starter-card" type="button" ' +
        'data-prompt-template="' + escapeHtml(card.prompt) + '" ' +
        'data-search="' + String(card.search) + '" ' +
        'data-advanced="' + String(card.advanced) + '">' +
          '<div class="starter-card-meta">' +
            '<span class="starter-card-flag">' + escapeHtml(card.flag) + '</span>' +
          '</div>' +
          '<p class="starter-card-title">' + escapeHtml(card.title) + '</p>' +
          '<p class="starter-card-copy">' + escapeHtml(card.copy) + '</p>' +
        '</button>';
    }).join("") +
  '</div>';
}

function relativeTime(value) {
  const deltaSeconds = Math.round((value - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const entry of units) {
    const unit = entry[0];
    const size = entry[1];
    if (Math.abs(deltaSeconds) >= size || unit === "minute") {
      return formatter.format(Math.round(deltaSeconds / size), unit);
    }
  }

  return "just now";
}

function usageFromResponseChunk(chunk) {
  const promptTokens = Number(chunk.prompt_eval_count || 0);
  const completionTokens = Number(chunk.eval_count || 0);
  const totalTokens = promptTokens + completionTokens;
  const totalDurationNs = Number(chunk.total_duration || 0);

  return {
    requestCount: totalTokens || totalDurationNs ? 1 : 0,
    promptTokens: promptTokens,
    completionTokens: completionTokens,
    totalTokens: totalTokens,
    totalDurationNs: totalDurationNs,
  };
}

function renderStudioReadouts(rollingUsage) {
  const conversation = getActiveConversation();
  const activeModel = getResolvedModelLabel(conversation);
  const searchMode = getSearchModeLabel(conversation);
  const modelCount = state.models.length || (activeModel === "No model" ? 0 : 1);
  const sessionTokens = rollingUsage && rollingUsage.session
    ? rollingUsage.session.totalTokens || 0
    : 0;

  if (elements.activeModelDisplay) {
    elements.activeModelDisplay.textContent = activeModel;
  }
  if (elements.searchModeDisplay) {
    elements.searchModeDisplay.textContent = searchMode;
  }
  if (elements.modelCountDisplay) {
    elements.modelCountDisplay.textContent = modelCount + (modelCount === 1 ? " model" : " models");
  }
  if (elements.heroModelDisplay) {
    elements.heroModelDisplay.textContent = activeModel;
  }
  if (elements.heroSessionDisplay) {
    elements.heroSessionDisplay.textContent = formatNumber(sessionTokens) + " tokens";
  }
  if (elements.heroSearchDisplay) {
    elements.heroSearchDisplay.textContent = "Search mode: " + searchMode.toLowerCase();
  }
}

function renderWorkspaceModes() {
  const conversation = getActiveConversation();
  const searchActive = conversation && conversation.includeSearch !== false;

  if (elements.navCompose) {
    elements.navCompose.classList.add("is-active");
  }
  if (elements.navSearch) {
    elements.navSearch.classList.toggle("is-active", searchActive);
  }
  if (elements.navStructure) {
    elements.navStructure.classList.toggle("is-active", state.showAdvanced);
  }
}

function applyPromptTemplate(trigger) {
  const conversation = getActiveConversation();
  const prompt = trigger.getAttribute("data-prompt-template") || "";

  if (!prompt) {
    return;
  }

  state.draft.prompt = prompt;

  if (conversation) {
    const searchPreference = trigger.getAttribute("data-search");
    if (searchPreference != null) {
      conversation.includeSearch = searchPreference === "true";
      conversation.updatedAt = Date.now();
    }
  }

  if (trigger.getAttribute("data-advanced") === "true") {
    state.showAdvanced = true;
  }

  setStatus("Launchpad loaded. Edit the prompt or press Enter to send.", "info");
  render();
  elements.promptInput.focus();
  const cursorPosition = elements.promptInput.value.length;
  elements.promptInput.setSelectionRange(cursorPosition, cursorPosition);
}

function mergeUsage(target, addition) {
  target.requestCount += Number(addition.requestCount || 0);
  target.promptTokens += Number(addition.promptTokens || 0);
  target.completionTokens += Number(addition.completionTokens || 0);
  target.totalTokens += Number(addition.totalTokens || 0);
  target.totalDurationNs += Number(addition.totalDurationNs || 0);
}

function buildPromptContent() {
  const pieces = [];
  const prompt = state.draft.prompt.trim();
  const context = state.draft.context.trim();
  const constraints = state.draft.constraints.trim();
  const references = state.draft.references.trim();

  if (prompt) {
    pieces.push(prompt);
  }
  if (context) {
    pieces.push("Context:\\n" + context);
  }
  if (constraints) {
    pieces.push("Constraints:\\n" + constraints);
  }
  if (references) {
    pieces.push("References:\\n" + references);
  }

  return pieces.join("\\n\\n").trim();
}

function updateConversationTitle(conversation, userMessage) {
  if (!conversation.messages.length) {
    return;
  }

  if (conversation.title !== "New chat" && conversation.title !== "Untitled") {
    return;
  }

  const firstLine = userMessage.split("\\n")[0].trim();
  conversation.title = firstLine.slice(0, 54) || "Untitled";
}

function serializeMessages(messages) {
  return messages.map(function (message) {
    return {
      role: message.role,
      content: message.content,
    };
  });
}

function sortConversations() {
  state.conversations.sort(function (left, right) {
    return right.updatedAt - left.updatedAt;
  });
}

function ensureConversation() {
  if (!state.conversations.length) {
    const conversation = createConversation(state.usageMeta.default_model || state.models[0] || "");
    state.conversations = [conversation];
    state.activeConversationId = conversation.id;
  }

  if (!getActiveConversation()) {
    state.activeConversationId = state.conversations[0].id;
  }
}

function syncControlsFromConversation() {
  const conversation = getActiveConversation();
  if (!conversation) {
    return;
  }

  elements.modelSelect.value = conversation.model || "";
  elements.searchToggle.checked = conversation.includeSearch !== false;
  elements.systemPromptInput.value = conversation.systemPrompt || "";
  elements.advancedToggle.textContent = state.showAdvanced ? "Hide Inputs" : "Structured Inputs";
  elements.advancedPanel.classList.toggle("hidden", !state.showAdvanced);
  elements.promptInput.value = state.draft.prompt;
  elements.contextInput.value = state.draft.context;
  elements.constraintsInput.value = state.draft.constraints;
  elements.referencesInput.value = state.draft.references;
}

function renderUsagePanel() {
  const rolling = buildRollingUsage();
  const usage = rolling.lifetime;
  const totalTokens = usage.totalTokens || 0;
  const promptShare = totalTokens ? Math.max(6, Math.round((usage.promptTokens / totalTokens) * 100)) : 0;
  const completionShare = totalTokens ? Math.max(6, Math.round((usage.completionTokens / totalTokens) * 100)) : 0;
  const sessionTokenEstimate = formatEstimateLine(
    rolling.session.totalTokens,
    state.usageMeta.estimated_session_token_budget,
    formatNumber,
    "5-hour token",
  );
  const sessionRuntimeEstimate = formatEstimateLine(
    rolling.session.totalDurationNs,
    state.usageMeta.estimated_session_runtime_budget_ns,
    formatDuration,
    "5-hour runtime",
  );
  const weeklyTokenEstimate = formatEstimateLine(
    rolling.weekly.totalTokens,
    state.usageMeta.estimated_weekly_token_budget,
    formatNumber,
    "7-day token",
  );
  const weeklyRuntimeEstimate = formatEstimateLine(
    rolling.weekly.totalDurationNs,
    state.usageMeta.estimated_weekly_runtime_budget_ns,
    formatDuration,
    "7-day runtime",
  );
  const sessionEstimate = [sessionTokenEstimate, sessionRuntimeEstimate].filter(Boolean).join(" · ");
  const weeklyEstimate = [weeklyTokenEstimate, weeklyRuntimeEstimate].filter(Boolean).join(" · ");
  const sessionBarPercent = Number(state.usageMeta.estimated_session_token_budget || 0) > 0
    ? clampPercentage((rolling.session.totalTokens / Number(state.usageMeta.estimated_session_token_budget)) * 100)
    : Number(state.usageMeta.estimated_session_runtime_budget_ns || 0) > 0
      ? clampPercentage((rolling.session.totalDurationNs / Number(state.usageMeta.estimated_session_runtime_budget_ns)) * 100)
      : null;
  const weeklyBarPercent = Number(state.usageMeta.estimated_weekly_token_budget || 0) > 0
    ? clampPercentage((rolling.weekly.totalTokens / Number(state.usageMeta.estimated_weekly_token_budget)) * 100)
    : Number(state.usageMeta.estimated_weekly_runtime_budget_ns || 0) > 0
      ? clampPercentage((rolling.weekly.totalDurationNs / Number(state.usageMeta.estimated_weekly_runtime_budget_ns)) * 100)
      : null;
  const concurrencyDetail = state.usageMeta.concurrency_limit
    ? String(state.usageMeta.concurrency_limit) + " concurrent model" + (state.usageMeta.concurrency_limit === 1 ? "" : "s")
    : "Plan concurrency is not published in this environment";

  renderStudioReadouts(rolling);
  elements.usagePlanBadge.textContent = String((state.usageMeta.plan || "free")).toUpperCase();
  elements.usagePanelBody.innerHTML =
    '<div class="usage-grid">' +
      renderUsageMetric("Lifetime tracked", formatNumber(totalTokens) + " tokens", formatUsageDetail(usage), null) +
      renderUsageMetric(
        "Last " + String(state.usageMeta.session_window_hours || 5) + " hours",
        formatNumber(rolling.session.totalTokens) + " tokens",
        [formatUsageDetail(rolling.session), sessionEstimate].filter(Boolean).join(" · "),
        sessionBarPercent,
      ) +
      renderUsageMetric(
        "Last " + String(state.usageMeta.weekly_window_days || 7) + " days",
        formatNumber(rolling.weekly.totalTokens) + " tokens",
        [formatUsageDetail(rolling.weekly), weeklyEstimate].filter(Boolean).join(" · "),
        weeklyBarPercent,
      ) +
      renderUsageMetric("Prompt tokens", formatNumber(usage.promptTokens), "", promptShare) +
      renderUsageMetric("Completion tokens", formatNumber(usage.completionTokens), "", completionShare) +
      renderUsageMetric("Tracked requests", formatNumber(usage.requestCount), concurrencyDetail, null) +
      renderUsageMetric("Runtime tracked", formatDuration(usage.totalDurationNs), state.usageMeta.note || DEFAULT_USAGE_META.note, null) +
    '</div>';
}

function renderConversationList() {
  sortConversations();
  elements.conversationCount.textContent = String(state.conversations.length);
  elements.conversationList.innerHTML = "";

  state.conversations.forEach(function (conversation) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-item" + (conversation.id === state.activeConversationId ? " active" : "");
    button.dataset.conversationId = conversation.id;

    const title = document.createElement("p");
    title.className = "conversation-title";
    title.textContent = conversation.title || "Untitled";

    const meta = document.createElement("div");
    meta.className = "conversation-meta";
    meta.innerHTML =
      '<span>' + escapeHtml(conversation.model || "No model") + '</span>' +
      '<span>' + escapeHtml(relativeTime(conversation.updatedAt)) + '</span>' +
      '<span>' + formatNumber(conversation.stats.totalTokens || 0) + ' tokens</span>';

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete";
    deleteButton.dataset.deleteConversationId = conversation.id;
    deleteButton.setAttribute("aria-label", "Delete conversation");
    deleteButton.textContent = "Delete";

    button.appendChild(title);
    button.appendChild(meta);
    button.appendChild(deleteButton);
    elements.conversationList.appendChild(button);
  });
}

function buildMessageMeta(message) {
  const chips = [];
  if (message.model) {
    chips.push('<span class="message-meta-chip">' + escapeHtml(message.model) + '</span>');
  }
  if (message.searchResultsCount) {
    chips.push('<span class="message-meta-chip">' + formatNumber(message.searchResultsCount) + ' search results</span>');
  }
  if (message.usage && message.usage.totalTokens) {
    chips.push('<span class="message-meta-chip">' + formatNumber(message.usage.totalTokens) + ' tokens</span>');
  }
  if (message.usage && message.usage.totalDurationNs) {
    chips.push('<span class="message-meta-chip">' + formatDuration(message.usage.totalDurationNs) + '</span>');
  }
  return chips.join("");
}

function renderMessages() {
  const conversation = getActiveConversation();
  const isEmpty = !conversation || !conversation.messages.length;
  elements.messageList.innerHTML = "";
  document.body.classList.toggle("conversation-empty", isEmpty);
  document.body.classList.toggle("conversation-active", !isEmpty);

  if (isEmpty) {
    elements.messageList.innerHTML =
      '<div class="empty-state">' +
        '<div>' +
          '<div class="empty-state-label">Launchpads</div>' +
          '<h2>Pick a direction and start shaping it.</h2>' +
          '<p>Each launchpad seeds the composer instantly. You can run it as-is, refine it, or open structured inputs first for more control.</p>' +
          renderStarterGrid() +
        '</div>' +
      '</div>';
    elements.tokenPill.textContent = "0 tokens this chat";
    return;
  }

  conversation.messages.forEach(function (message) {
    const article = document.createElement("article");
    article.className = "message-card " + (message.role === "user" ? "user" : "assistant");
    article.innerHTML =
      '<div class="message-role">' + escapeHtml(message.role === "user" ? "User" : "Assistant") + '</div>' +
      '<div class="message-content">' + escapeHtml(message.content).replace(/\\n/g, "<br>") + '</div>' +
      '<div class="message-meta">' + buildMessageMeta(message) + '</div>';
    elements.messageList.appendChild(article);
  });

  elements.messageList.scrollTop = elements.messageList.scrollHeight;
  elements.tokenPill.textContent = formatNumber(conversation.stats.totalTokens || 0) + " tokens this chat";
}

function renderModelOptions() {
  const currentValue = elements.modelSelect.value;
  elements.modelSelect.innerHTML = "";

  if (!state.models.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No models available";
    elements.modelSelect.appendChild(option);
    return;
  }

  state.models.forEach(function (modelName) {
    const option = document.createElement("option");
    option.value = modelName;
    option.textContent = modelName;
    elements.modelSelect.appendChild(option);
  });

  const conversation = getActiveConversation();
  const resolvedValue = conversation && conversation.model ? conversation.model : state.models[0];
  elements.modelSelect.value = state.models.includes(resolvedValue) ? resolvedValue : state.models[0];

  if (conversation && !conversation.model) {
    conversation.model = elements.modelSelect.value;
  } else if (currentValue && state.models.includes(currentValue)) {
    elements.modelSelect.value = currentValue;
  }
}

function renderComposerState() {
  const disabled = state.isStreaming;
  elements.promptInput.disabled = disabled;
  elements.contextInput.disabled = disabled;
  elements.constraintsInput.disabled = disabled;
  elements.referencesInput.disabled = disabled;
  elements.systemPromptInput.disabled = disabled;
  elements.modelSelect.disabled = disabled;
  elements.searchToggle.disabled = disabled;
  elements.sendButton.disabled = disabled;
  elements.stopButton.disabled = !disabled;
}

function render() {
  renderModelOptions();
  renderUsagePanel();
  renderConversationList();
  renderMessages();
  renderComposerState();
  syncControlsFromConversation();
  renderWorkspaceModes();
  saveState();
}

function startNewConversation() {
  const conversation = createConversation(elements.modelSelect.value || state.models[0] || state.usageMeta.default_model || "");
  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  state.draft = {
    prompt: "",
    context: "",
    constraints: "",
    references: "",
  };
  setStatus("", "");
  render();
}

function deleteConversation(conversationId) {
  if (state.conversations.length === 1) {
    startNewConversation();
    state.conversations = state.conversations.filter(function (conversation) {
      return conversation.id !== conversationId;
    });
  } else {
    state.conversations = state.conversations.filter(function (conversation) {
      return conversation.id !== conversationId;
    });
  }

  ensureConversation();
  state.draft = {
    prompt: "",
    context: "",
    constraints: "",
    references: "",
  };
  render();
}

async function fetchModels() {
  const response = await fetch("/models");
  if (!response.ok) {
    throw new Error("Model lookup failed");
  }
  const payload = await response.json();
  const rawModels = Array.isArray(payload.models) ? payload.models : [];
  const normalizedModels = rawModels
    .map(function (entry) {
      if (typeof entry === "string") {
        return entry;
      }
      if (entry && typeof entry.model === "string") {
        return entry.model;
      }
      if (entry && typeof entry.name === "string") {
        return entry.name;
      }
      return "";
    })
    .filter(Boolean);

  return Array.from(new Set(normalizedModels)).sort();
}

function resolveModelList(modelNames, usageMeta) {
  const uniqueModels = Array.from(new Set((Array.isArray(modelNames) ? modelNames : []).filter(Boolean)));
  const defaultModel = usageMeta && typeof usageMeta.default_model === "string"
    ? usageMeta.default_model.trim()
    : "";

  if (defaultModel && !uniqueModels.includes(defaultModel)) {
    uniqueModels.unshift(defaultModel);
  }

  return uniqueModels;
}

async function fetchUsageMeta() {
  try {
    const response = await fetch("/usage");
    if (!response.ok) {
      return DEFAULT_USAGE_META;
    }
    const payload = await response.json();
    return Object.assign({}, DEFAULT_USAGE_META, payload || {});
  } catch {
    return DEFAULT_USAGE_META;
  }
}

async function streamConversation(conversation, assistantMessage) {
  const payload = {
    model: conversation.model,
    messages: serializeMessages(conversation.messages),
    system_prompt: conversation.systemPrompt || undefined,
    include_search: conversation.includeSearch !== false,
    stream: true,
  };

  const controller = new AbortController();
  state.abortController = controller;
  state.isStreaming = true;
  renderComposerState();
  setStatus("Streaming response...", "info");

  let response;
  try {
    response = await fetch("/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    state.isStreaming = false;
    state.abortController = null;
    renderComposerState();
    if (error && error.name === "AbortError") {
      setStatus("Streaming stopped.", "info");
      return;
    }
    throw error;
  }

  if (!response.ok) {
    state.isStreaming = false;
    state.abortController = null;
    renderComposerState();
    const payloadText = await response.text();
    throw new Error(payloadText || "Streaming request failed");
  }

  assistantMessage.model = response.headers.get("x-querymind-model") || conversation.model || "";
  assistantMessage.searchResultsCount = Number(response.headers.get("x-querymind-search-results-count") || 0);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }

      buffer += decoder.decode(result.value, { stream: true });
      let newlineIndex = buffer.indexOf("\\n");

      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line) {
          const chunk = JSON.parse(line);
          const piece = chunk && chunk.message && typeof chunk.message.content === "string"
            ? chunk.message.content
            : "";
          if (piece) {
            assistantMessage.content += piece;
          }

          if (chunk && chunk.done) {
            const usage = usageFromResponseChunk(chunk);
            assistantMessage.usage = usage;
            mergeUsage(conversation.stats, usage);
            mergeUsage(state.usage, usage);
          }

          renderMessages();
        }

        newlineIndex = buffer.indexOf("\\n");
      }
    }

    const trailing = buffer.trim();
    if (trailing) {
      const finalChunk = JSON.parse(trailing);
      const piece = finalChunk && finalChunk.message && typeof finalChunk.message.content === "string"
        ? finalChunk.message.content
        : "";
      if (piece) {
        assistantMessage.content += piece;
      }
      if (finalChunk && finalChunk.done) {
        const usage = usageFromResponseChunk(finalChunk);
        assistantMessage.usage = usage;
        mergeUsage(conversation.stats, usage);
        mergeUsage(state.usage, usage);
      }
    }

    setStatus("", "");
  } catch (error) {
    if (error && error.name === "AbortError") {
      setStatus("Streaming stopped.", "info");
    } else {
      throw error;
    }
  } finally {
    state.isStreaming = false;
    state.abortController = null;
    render();
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const conversation = getActiveConversation();
  if (!conversation || state.isStreaming) {
    return;
  }

  const userContent = buildPromptContent();
  if (!userContent) {
    setStatus("Add a prompt before sending.", "");
    return;
  }

  conversation.model = elements.modelSelect.value || conversation.model || state.models[0] || "";
  conversation.includeSearch = elements.searchToggle.checked;
  conversation.systemPrompt = elements.systemPromptInput.value.trim();

  const userMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: userContent,
    model: conversation.model,
    searchResultsCount: 0,
    createdAt: Date.now(),
    usage: createEmptyUsage(),
  };

  const assistantMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    model: conversation.model,
    searchResultsCount: 0,
    createdAt: Date.now(),
    usage: createEmptyUsage(),
  };

  conversation.messages.push(userMessage, assistantMessage);
  conversation.updatedAt = Date.now();
  updateConversationTitle(conversation, userContent);

  state.draft = {
    prompt: "",
    context: "",
    constraints: "",
    references: "",
  };

  render();

  try {
    await streamConversation(conversation, assistantMessage);
  } catch (error) {
    assistantMessage.content = "The request failed. " + (error && error.message ? error.message : "Unknown error.");
    setStatus(assistantMessage.content, "");
    render();
  }
}

function handleConversationClick(event) {
  const deleteButton = event.target.closest("[data-delete-conversation-id]");
  if (deleteButton) {
    const id = deleteButton.getAttribute("data-delete-conversation-id");
    deleteConversation(id);
    return;
  }

  const button = event.target.closest("[data-conversation-id]");
  if (!button) {
    return;
  }

  state.activeConversationId = button.getAttribute("data-conversation-id");
  state.draft = {
    prompt: "",
    context: "",
    constraints: "",
    references: "",
  };
  setStatus("", "");
  render();
}

function handleMessageListClick(event) {
  const templateButton = event.target.closest("[data-prompt-template]");
  if (!templateButton) {
    return;
  }

  applyPromptTemplate(templateButton);
}

function attachEventListeners() {
  elements.newChatButton.addEventListener("click", startNewConversation);
  elements.conversationList.addEventListener("click", handleConversationClick);
  elements.messageList.addEventListener("click", handleMessageListClick);
  elements.composerForm.addEventListener("submit", handleSubmit);

  if (elements.focusPromptButton) {
    elements.focusPromptButton.addEventListener("click", function () {
      elements.promptInput.focus();
    });
  }

  if (elements.navCompose) {
    elements.navCompose.addEventListener("click", function () {
      state.showAdvanced = false;
      render();
      elements.promptInput.focus();
    });
  }

  if (elements.navSearch) {
    elements.navSearch.addEventListener("click", function () {
      const conversation = getActiveConversation();
      if (!conversation) {
        return;
      }

      conversation.includeSearch = conversation.includeSearch === false;
      conversation.updatedAt = Date.now();
      setStatus(
        conversation.includeSearch !== false
          ? "Search is on for this thread."
          : "Search is off for this thread.",
        "info",
      );
      render();
      elements.promptInput.focus();
    });
  }

  if (elements.navStructure) {
    elements.navStructure.addEventListener("click", function () {
      state.showAdvanced = !state.showAdvanced;
      render();
      if (state.showAdvanced) {
        elements.contextInput.focus();
      } else {
        elements.promptInput.focus();
      }
    });
  }

  elements.advancedToggle.addEventListener("click", function () {
    state.showAdvanced = !state.showAdvanced;
    render();
  });

  elements.stopButton.addEventListener("click", function () {
    if (state.abortController) {
      state.abortController.abort();
    }
  });

  elements.promptInput.addEventListener("input", function (event) {
    state.draft.prompt = event.target.value;
  });

  elements.promptInput.addEventListener("keydown", function (event) {
    if (event.isComposing) {
      return;
    }

    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      elements.composerForm.requestSubmit();
    }
  });

  elements.contextInput.addEventListener("input", function (event) {
    state.draft.context = event.target.value;
  });

  elements.constraintsInput.addEventListener("input", function (event) {
    state.draft.constraints = event.target.value;
  });

  elements.referencesInput.addEventListener("input", function (event) {
    state.draft.references = event.target.value;
  });

  elements.systemPromptInput.addEventListener("input", function (event) {
    const conversation = getActiveConversation();
    if (!conversation) {
      return;
    }
    conversation.systemPrompt = event.target.value;
    conversation.updatedAt = Date.now();
    saveState();
  });

  elements.modelSelect.addEventListener("change", function (event) {
    const conversation = getActiveConversation();
    if (!conversation) {
      return;
    }
    conversation.model = event.target.value;
    conversation.updatedAt = Date.now();
    render();
  });

  elements.searchToggle.addEventListener("change", function (event) {
    const conversation = getActiveConversation();
    if (!conversation) {
      return;
    }
    conversation.includeSearch = event.target.checked;
    conversation.updatedAt = Date.now();
    render();
  });
}

async function bootstrap() {
  const persisted = loadPersistedState();

  const results = await Promise.allSettled([fetchModels(), fetchUsageMeta()]);
  const modelsResult = results[0];
  const usageMetaResult = results[1];

  state.usageMeta = usageMetaResult.status === "fulfilled"
    ? usageMetaResult.value
    : DEFAULT_USAGE_META;
  state.models = resolveModelList(
    modelsResult.status === "fulfilled" ? modelsResult.value : [],
    state.usageMeta,
  );

  if (modelsResult.status !== "fulfilled" && state.models.length) {
    setStatus("Live model discovery is unavailable, so the UI is using the configured default model.", "info");
  } else if (modelsResult.status !== "fulfilled") {
    setStatus("The UI loaded, but live model discovery failed. Retry after the backend is healthy.", "");
  }

  if (persisted) {
    state.usage = normalizeUsage(persisted.usage);
    state.showAdvanced = persisted.showAdvanced === true;
    state.conversations = Array.isArray(persisted.conversations)
      ? persisted.conversations.map(function (conversation) {
          return normalizeConversation(conversation, state.usageMeta.default_model || state.models[0] || "");
        })
      : [];
    state.activeConversationId = typeof persisted.activeConversationId === "string"
      ? persisted.activeConversationId
      : null;
  }

  ensureConversation();
  attachEventListeners();
  render();
}

bootstrap();
`;
