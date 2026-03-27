const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful, accurate assistant. Use the provided web search context when it is relevant, and mention source URLs when you rely on that context.";

const DEFAULT_SEARCH_LANGUAGE = "en";
const DEFAULT_SAFESEARCH = "1";
const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_OLLAMA_BASE_URL = "https://ollama.com/api";
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SEARX_DISCOVERY_URL = "https://searx.space/data/instances.json";
const DEFAULT_SEARX_DISCOVERY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_SEARX_DISCOVERY_CANDIDATE_LIMIT = 8;
const DEFAULT_SEARX_DISCOVERY_MAX_ATTEMPTS = 4;
const DEFAULT_SEARX_EMPTY_RESULT_RETRIES = 1;
const DEFAULT_SEARX_MIN_UPTIME_WEEK = 95;
const DEFAULT_SEARX_MIN_SEARCH_SUCCESS = 70;

const searchCache = new Map();
const discoveryCache = new Map();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function isEnabled(value, fallback = false) {
  if (value == null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function normalizeSearxBaseUrl(baseUrl) {
  const normalizedUrl = String(baseUrl || "").replace(/\/+$/, "");
  if (normalizedUrl.endsWith("/search")) {
    return normalizedUrl.slice(0, -7);
  }

  return normalizedUrl;
}

function buildSearxSearchUrl(baseUrl) {
  const normalizedUrl = normalizeSearxBaseUrl(baseUrl);
  if (!normalizedUrl) {
    throw new HttpError(500, "No SearxNG base URL is configured");
  }

  return `${normalizedUrl}/search`;
}

function getPrimarySearxBaseUrl(env) {
  if (!env.SEARXNG_BASE_URL) {
    return null;
  }

  return normalizeSearxBaseUrl(env.SEARXNG_BASE_URL);
}

function normalizeOllamaBaseUrl(baseUrl) {
  const rawUrl = (baseUrl || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, "");
  if (rawUrl.endsWith("/api")) {
    return rawUrl;
  }

  return `${rawUrl}/api`;
}

function getOllamaHeaders(env) {
  const headers = {
    "content-type": "application/json",
  };
  const ollamaBaseUrl = normalizeOllamaBaseUrl(env.OLLAMA_BASE_URL);
  const apiKey = env.OLLAMA_API_KEY;

  if (ollamaBaseUrl.startsWith("https://ollama.com") && !apiKey) {
    throw new HttpError(500, "OLLAMA_API_KEY is required when using ollama.com");
  }

  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

function getDefaultModel(env) {
  if (!env.OLLAMA_MODEL) {
    throw new HttpError(500, "OLLAMA_MODEL is not configured");
  }

  return env.OLLAMA_MODEL;
}

function parsePositiveInt(value, fallback, max = 10) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function parsePositiveFloat(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function rotateCandidates(candidates, query) {
  if (candidates.length < 2) {
    return candidates;
  }

  let hash = 0;
  for (let index = 0; index < query.length; index += 1) {
    hash = (hash * 31 + query.charCodeAt(index)) >>> 0;
  }
  const offset = hash % candidates.length;
  return [...candidates.slice(offset), ...candidates.slice(0, offset)];
}

function scoreDiscoveredInstance(details) {
  const uptimeWeek = Number(details?.uptime?.uptimeWeek || 0);
  const uptimeMonth = Number(details?.uptime?.uptimeMonth || 0);
  const searchSuccess = Number(details?.timing?.search?.success_percentage || 0);
  const initialLatency = Number(details?.timing?.initial?.all?.value || 999);
  const mainBonus = details?.main ? 20 : 0;
  const privacyBonus = details?.analytics ? -50 : 10;

  return uptimeWeek * 3 + uptimeMonth * 2 + searchSuccess * 4 + mainBonus + privacyBonus - initialLatency * 25;
}

function dedupeUrls(entries) {
  const uniqueUrls = [];
  for (const [, url] of entries) {
    if (!uniqueUrls.includes(url)) {
      uniqueUrls.push(url);
    }
  }
  return uniqueUrls;
}

function selectDiscoveredInstances(instances, env) {
  const strictCandidates = [];
  const fallbackCandidates = [];
  const broadCandidates = [];
  const minUptimeWeek = parsePositiveFloat(env.SEARXNG_MIN_UPTIME_WEEK, DEFAULT_SEARX_MIN_UPTIME_WEEK);
  const minSearchSuccess = parsePositiveFloat(
    env.SEARXNG_MIN_SEARCH_SUCCESS,
    DEFAULT_SEARX_MIN_SEARCH_SUCCESS,
  );

  for (const [instanceUrl, details] of Object.entries(instances || {})) {
    if (!details || typeof details !== "object") {
      continue;
    }
    if (!String(instanceUrl).startsWith("https://")) {
      continue;
    }
    if (details.generator !== "searxng") {
      continue;
    }
    if (details?.http?.status_code !== 200) {
      continue;
    }

    const normalizedUrl = normalizeSearxBaseUrl(instanceUrl);
    const score = scoreDiscoveredInstance(details);
    const uptimeWeek = Number(details?.uptime?.uptimeWeek || 0);
    const searchSuccess = Number(details?.timing?.search?.success_percentage || 0);

    broadCandidates.push([score, normalizedUrl]);

    if (details.analytics) {
      continue;
    }

    fallbackCandidates.push([score, normalizedUrl]);
    if (
      details.network_type === "normal" &&
      details.main &&
      uptimeWeek >= minUptimeWeek &&
      searchSuccess >= minSearchSuccess
    ) {
      strictCandidates.push([score, normalizedUrl]);
    }
  }

  for (const pool of [strictCandidates, fallbackCandidates, broadCandidates]) {
    if (pool.length) {
      pool.sort((left, right) => right[0] - left[0]);
      return dedupeUrls(pool).slice(
        0,
        parsePositiveInt(
          env.SEARXNG_DISCOVERY_CANDIDATE_LIMIT,
          DEFAULT_SEARX_DISCOVERY_CANDIDATE_LIMIT,
          20,
        ),
      );
    }
  }

  return [];
}

function buildSearchContext(results) {
  if (!results.length) {
    return "No relevant web results were returned.";
  }

  return results
    .map((result, index) => {
      const title = result.title || "Untitled";
      const snippet = result.content || "No snippet available.";
      return `[${index + 1}] ${title}\nURL: ${result.url}\nSnippet: ${snippet}`;
    })
    .join("\n\n");
}

function resolveUserQuery(payload) {
  if (typeof payload.content === "string" && payload.content.trim()) {
    return payload.content.trim();
  }

  if (Array.isArray(payload.messages)) {
    for (let index = payload.messages.length - 1; index >= 0; index -= 1) {
      const message = payload.messages[index];
      if (message?.role === "user" && typeof message.content === "string" && message.content.trim()) {
        return message.content.trim();
      }
    }
  }

  throw new HttpError(400, "Request must include either content or at least one user message");
}

function resolveMessages(payload) {
  if (Array.isArray(payload.messages) && payload.messages.length) {
    return payload.messages
      .filter((message) => typeof message?.role === "string" && typeof message?.content === "string")
      .map((message) => ({ role: message.role, content: message.content }));
  }

  return [{ role: "user", content: resolveUserQuery(payload) }];
}

function sanitizeSearchResult(item) {
  return {
    title: item?.title || "",
    url: item?.url || "",
    content: item?.content || item?.snippet || "",
    engine: item?.engine || "",
    score: item?.score ?? null,
  };
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new HttpError(response.status, `Upstream request failed with status ${response.status}`);
  }

  return response.json();
}

async function fetchDiscoveredSearxInstances(env) {
  const discoveryUrl = env.SEARXNG_DISCOVERY_URL || DEFAULT_SEARX_DISCOVERY_URL;
  const cacheKey = discoveryUrl;
  const cachedEntry = discoveryCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.instances;
  }

  let data;
  try {
    data = await fetchJson(discoveryUrl, {
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    console.warn("SearxNG discovery failed", error);
    return [];
  }

  const instances = selectDiscoveredInstances(data?.instances || {}, env);
  discoveryCache.set(cacheKey, {
    expiresAt:
      Date.now() +
      parsePositiveInt(
        env.SEARXNG_DISCOVERY_CACHE_TTL_SECONDS,
        DEFAULT_SEARX_DISCOVERY_CACHE_TTL_MS / 1000,
        86400,
      ) *
        1000,
    instances,
  });
  return instances;
}

async function getSearxCandidateUrls(query, env) {
  const candidates = [];
  const primaryUrl = getPrimarySearxBaseUrl(env);
  if (primaryUrl) {
    candidates.push(primaryUrl);
  }

  if (isEnabled(env.SEARXNG_ENABLE_FALLBACK_ROTATION, true)) {
    const discoveredUrls = await fetchDiscoveredSearxInstances(env);
    for (const url of rotateCandidates(discoveredUrls, query)) {
      if (!candidates.includes(url)) {
        candidates.push(url);
      }
    }
  }

  if (!candidates.length) {
    throw new HttpError(500, "No SearxNG base URL is configured and no discovered instances are available");
  }

  return candidates;
}

async function fetchSingleSearxResultSet(baseUrl, query, maxResults, env) {
  const url = new URL(buildSearxSearchUrl(baseUrl));
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", env.SEARXNG_LANGUAGE || DEFAULT_SEARCH_LANGUAGE);
  url.searchParams.set("safesearch", env.SEARXNG_SAFESEARCH || DEFAULT_SAFESEARCH);

  if (env.SEARXNG_ENGINES) {
    url.searchParams.set("engines", env.SEARXNG_ENGINES);
  }
  if (env.SEARXNG_CATEGORIES) {
    url.searchParams.set("categories", env.SEARXNG_CATEGORIES);
  }
  if (env.SEARXNG_TIME_RANGE) {
    url.searchParams.set("time_range", env.SEARXNG_TIME_RANGE);
  }

  let data;
  try {
    data = await fetchJson(url.toString(), {
      headers: {
        accept: "application/json",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(502, `Search request failed for ${baseUrl}: ${error.message}`);
    }
    throw error;
  }

  return Array.isArray(data.results)
    ? data.results.slice(0, maxResults).map((item) => ({
        ...sanitizeSearchResult(item),
        search_instance: baseUrl,
      }))
    : [];
}

async function fetchSearxResults(query, maxResults, env) {
  const cacheKey = `${query}:${maxResults}`;
  const cachedEntry = searchCache.get(cacheKey);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return cachedEntry.results;
  }

  const candidateUrls = await getSearxCandidateUrls(query, env);
  const maxAttempts = Math.min(
    candidateUrls.length,
    parsePositiveInt(
      env.SEARXNG_DISCOVERY_MAX_ATTEMPTS,
      DEFAULT_SEARX_DISCOVERY_MAX_ATTEMPTS,
      10,
    ),
  );
  const emptyResultRetries = parsePositiveInt(
    env.SEARXNG_EMPTY_RESULT_RETRIES,
    DEFAULT_SEARX_EMPTY_RESULT_RETRIES,
    5,
  );

  let lastEmptyResults = null;
  let lastFailure = null;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex += 1) {
    const baseUrl = candidateUrls[attemptIndex];
    try {
      const results = await fetchSingleSearxResultSet(baseUrl, query, maxResults, env);
      if (results.length) {
        searchCache.set(cacheKey, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          results,
        });
        return results;
      }

      lastEmptyResults = results;
      if (attemptIndex >= emptyResultRetries) {
        break;
      }
    } catch (error) {
      lastFailure = error;
      console.warn("SearxNG candidate failed", baseUrl, error);
    }
  }

  if (lastEmptyResults) {
    searchCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      results: lastEmptyResults,
    });
    return lastEmptyResults;
  }

  if (lastFailure instanceof HttpError) {
    console.warn(
      "All SearxNG candidates failed; returning empty results",
      lastFailure.message,
    );
    return [];
  }

  console.warn("All SearxNG candidates failed; returning empty results");
  return [];
}

async function fetchOllamaModels(env) {
  const url = `${normalizeOllamaBaseUrl(env.OLLAMA_BASE_URL)}/tags`;

  try {
    const data = await fetchJson(url, {
      headers: getOllamaHeaders(env),
    });
    return Array.isArray(data.models) ? data.models : [];
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(502, `Ollama model lookup failed: ${error.message}`);
    }
    throw error;
  }
}

async function fetchOllamaChat(messages, model, env) {
  const url = `${normalizeOllamaBaseUrl(env.OLLAMA_BASE_URL)}/chat`;

  try {
    return await fetchJson(url, {
      method: "POST",
      headers: getOllamaHeaders(env),
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(502, `Ollama chat request failed: ${error.message}`);
    }
    throw error;
  }
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (request.method === "GET" && path === "/health") {
        return json({ status: "ok" });
      }

      if (request.method === "GET" && path === "/search") {
        const query = url.searchParams.get("query");
        if (!query) {
          throw new HttpError(400, "query is required");
        }

        const maxResults = parsePositiveInt(
          url.searchParams.get("max_results"),
          parsePositiveInt(env.SEARCH_RESULT_LIMIT, DEFAULT_SEARCH_LIMIT),
        );
        const results = await fetchSearxResults(query, maxResults, env);
        return json({ results });
      }

      if (request.method === "GET" && path === "/models") {
        const models = await fetchOllamaModels(env);
        return json({ models });
      }

      if (request.method === "POST" && path === "/api") {
        const payload = await parseJsonBody(request);
        if (payload?.stream) {
          throw new HttpError(400, "Streaming responses are not implemented for this endpoint");
        }

        const userQuery = resolveUserQuery(payload || {});
        const baseMessages = resolveMessages(payload || {});
        const includeSearch = payload?.include_search !== false;
        const maxResults = parsePositiveInt(
          payload?.max_results,
          parsePositiveInt(env.SEARCH_RESULT_LIMIT, DEFAULT_SEARCH_LIMIT),
        );

        let searchResults = [];
        if (includeSearch) {
          searchResults = await fetchSearxResults(userQuery, maxResults, env);
        }

        const messages = [
          {
            role: "system",
            content: payload?.system_prompt || DEFAULT_SYSTEM_PROMPT,
          },
        ];

        if (includeSearch) {
          messages.push({
            role: "system",
            content: `Web search context:\n${buildSearchContext(searchResults)}`,
          });
        }

        messages.push(...baseMessages);

        const responseData = await fetchOllamaChat(
          messages,
          payload?.model || getDefaultModel(env),
          env,
        );

        return json({
          content: responseData?.message?.content || "",
          model: responseData?.model || payload?.model || null,
          search_results: searchResults,
        });
      }

      throw new HttpError(404, "Not found");
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ detail: error.message }, error.status);
      }

      const message = error instanceof Error ? error.message : "Internal server error";
      return json({ detail: message }, 500);
    }
  },
};
