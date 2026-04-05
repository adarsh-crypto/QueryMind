# QueryMind

QueryMind is a serverless multi-model chat workspace built on Cloudflare Workers.
It serves a custom web UI, calls Ollama Cloud for model responses, and uses SearxNG for optional web search context.

Live URLs:

- [https://querymind.eeveon.com](https://querymind.eeveon.com)
- [https://querymind-api.sinha-adarsh200.workers.dev](https://querymind-api.sinha-adarsh200.workers.dev)

## What It Does

- ChatGPT-style web UI with streaming replies
- Live Ollama Cloud model selection from `/models`
- Optional web search via SearxNG
- SearxNG fallback rotation using `searx.space` discovery
- Structured inputs for context, constraints, references, and system prompts
- Rolling local usage tracking for the last 5 hours and 7 days
- Fully serverless deployment on Cloudflare Workers

## Architecture

- Frontend shell: [src/ui.js](src/ui.js)
- Worker API and static asset serving: [src/worker.js](src/worker.js)
- Cloudflare config: [wrangler.jsonc](wrangler.jsonc)
- Example local env file: [.dev.vars.example](.dev.vars.example)
- Local Python version: [main.py](main.py)

Request flow:

1. The browser loads `/`, `/app.css`, and `/app.js` from the Worker.
2. The UI fetches `/models` and `/usage` to populate the workspace.
3. Chat requests go to `POST /api`.
4. If search is enabled, the Worker queries SearxNG first.
5. The Worker sends the final chat request to Ollama Cloud.
6. Responses come back as JSON or NDJSON streaming chunks.

## API

Public endpoints:

- `GET /health`
- `GET /`
- `GET /app.css`
- `GET /app.js`
- `GET /models`
- `GET /usage`
- `GET /search?query=...&max_results=5`
- `POST /api`

`POST /api` accepts either:

- `content`
- `messages`

Optional fields:

- `model`
- `include_search`
- `max_results`
- `system_prompt`
- `stream`

Streaming responses are returned as `application/x-ndjson`.

## Example Requests

Health check:

```bash
curl -sS https://querymind.eeveon.com/health
```

List models:

```bash
curl -sS https://querymind.eeveon.com/models
```

Search only:

```bash
curl -sS "https://querymind.eeveon.com/search?query=cloudflare&max_results=5"
```

Normal chat:

```bash
curl -sS -X POST https://querymind.eeveon.com/api \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is Cloudflare?",
    "include_search": false
  }'
```

Streaming chat:

```bash
curl -N -sS -X POST https://querymind.eeveon.com/api \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Summarize Cloudflare in three bullets.",
    "include_search": true,
    "max_results": 5,
    "stream": true
  }'
```

## Local Development

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .dev.vars.example .dev.vars
```

Run the Worker locally:

```bash
npm run dev
```

The Worker will be available through Wrangler local dev.

## Environment Variables

Required for Ollama Cloud:

- `OLLAMA_API_KEY`
- `OLLAMA_MODEL`

Main runtime settings:

- `OLLAMA_BASE_URL`
- `OLLAMA_PLAN`
- `SEARXNG_BASE_URL`
- `SEARXNG_DISCOVERY_URL`
- `SEARXNG_ENABLE_FALLBACK_ROTATION`
- `SEARXNG_DISCOVERY_CANDIDATE_LIMIT`
- `SEARXNG_DISCOVERY_MAX_ATTEMPTS`
- `SEARXNG_EMPTY_RESULT_RETRIES`
- `SEARXNG_MIN_UPTIME_WEEK`
- `SEARXNG_MIN_SEARCH_SUCCESS`
- `SEARXNG_ENGINES`
- `SEARXNG_CATEGORIES`
- `SEARXNG_TIME_RANGE`

Optional usage estimate settings:

- `OLLAMA_ESTIMATED_SESSION_TOKEN_BUDGET`
- `OLLAMA_ESTIMATED_WEEKLY_TOKEN_BUDGET`
- `OLLAMA_ESTIMATED_SESSION_RUNTIME_BUDGET_NS`
- `OLLAMA_ESTIMATED_WEEKLY_RUNTIME_BUDGET_NS`

Important note:

- Ollama's public API does not expose exact remaining free-tier quota.
- QueryMind therefore tracks rolling local usage and can optionally display estimate bars if you configure your own budgets.

## Search Reliability

The Worker supports two search modes:

- Preferred: set `SEARXNG_BASE_URL` to your own SearxNG instance
- Fallback: discover public instances from `https://searx.space/data/instances.json`

Public SearxNG instances are convenient but less reliable under load, so production setups should prefer a private or self-hosted instance.

## Deployment

This project is deployed as a Cloudflare Worker.

Deploy:

```bash
npx wrangler deploy --keep-vars
```

Current Worker config lives in [wrangler.jsonc](wrangler.jsonc).

## Notes

- The Worker serves both the API and the frontend.
- The UI is mobile-friendly and optimized for streaming chat.
- The local Python app in [main.py](main.py) mirrors the same general backend behavior for local or non-Worker use.
