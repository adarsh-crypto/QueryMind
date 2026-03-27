import hashlib
import logging
import os
from typing import Any

import aiohttp
from cachetools import TTLCache
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())
logger = logging.getLogger(__name__)

app = FastAPI(title="QueryMind API")

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful, accurate assistant. Use the provided web search context when it is "
    "relevant, and mention source URLs when you rely on that context."
)

HTTP_TIMEOUT_SECONDS = float(os.getenv("HTTP_TIMEOUT_SECONDS", "30"))
SEARCH_CACHE_SIZE = int(os.getenv("SEARCH_CACHE_SIZE", "100"))
SEARCH_CACHE_TTL_SECONDS = int(os.getenv("SEARCH_CACHE_TTL_SECONDS", "300"))
SEARXNG_DISCOVERY_CACHE_TTL_SECONDS = int(
    os.getenv("SEARXNG_DISCOVERY_CACHE_TTL_SECONDS", "21600")
)
DEFAULT_SEARCH_LANGUAGE = os.getenv("SEARXNG_LANGUAGE", "en")
DEFAULT_SAFESEARCH = int(os.getenv("SEARXNG_SAFESEARCH", "1"))
DEFAULT_SEARCH_LIMIT = int(os.getenv("SEARCH_RESULT_LIMIT", "5"))
SEARXNG_DISCOVERY_URL = os.getenv(
    "SEARXNG_DISCOVERY_URL",
    "https://searx.space/data/instances.json",
).strip()
SEARXNG_ENABLE_FALLBACK_ROTATION = os.getenv(
    "SEARXNG_ENABLE_FALLBACK_ROTATION",
    "true",
).lower() in {"1", "true", "yes", "on"}
SEARXNG_DISCOVERY_CANDIDATE_LIMIT = int(
    os.getenv("SEARXNG_DISCOVERY_CANDIDATE_LIMIT", "8")
)
SEARXNG_DISCOVERY_MAX_ATTEMPTS = int(os.getenv("SEARXNG_DISCOVERY_MAX_ATTEMPTS", "4"))
SEARXNG_EMPTY_RESULT_RETRIES = int(os.getenv("SEARXNG_EMPTY_RESULT_RETRIES", "1"))
SEARXNG_MIN_UPTIME_WEEK = float(os.getenv("SEARXNG_MIN_UPTIME_WEEK", "95"))
SEARXNG_MIN_SEARCH_SUCCESS = float(os.getenv("SEARXNG_MIN_SEARCH_SUCCESS", "70"))

search_cache: TTLCache[tuple[str, int], list[dict[str, Any]]] = TTLCache(
    maxsize=SEARCH_CACHE_SIZE,
    ttl=SEARCH_CACHE_TTL_SECONDS,
)
discovery_cache: TTLCache[str, list[str]] = TTLCache(
    maxsize=1,
    ttl=SEARXNG_DISCOVERY_CACHE_TTL_SECONDS,
)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    content: str | None = None
    messages: list[Message] = Field(default_factory=list)
    model: str | None = None
    max_results: int = Field(default=DEFAULT_SEARCH_LIMIT, ge=1, le=10)
    system_prompt: str | None = None
    include_search: bool = True
    stream: bool = False


def build_timeout() -> aiohttp.ClientTimeout:
    return aiohttp.ClientTimeout(total=HTTP_TIMEOUT_SECONDS)


def dump_model(model: BaseModel) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def normalize_searxng_base_url(raw_url: str) -> str:
    normalized_url = raw_url.rstrip("/")
    if normalized_url.endswith("/search"):
        return normalized_url[:-7]
    return normalized_url


def build_searxng_search_url(base_url: str) -> str:
    normalized_url = normalize_searxng_base_url(base_url)
    return f"{normalized_url}/search"


def get_primary_searxng_base_url() -> str | None:
    raw_url = os.getenv("SEARXNG_BASE_URL", "").strip()
    if not raw_url:
        return None
    return normalize_searxng_base_url(raw_url)


def get_ollama_base_url() -> str:
    raw_url = os.getenv("OLLAMA_BASE_URL", "https://ollama.com/api").strip()
    normalized_url = raw_url.rstrip("/")
    if normalized_url.endswith("/api"):
        return normalized_url
    return f"{normalized_url}/api"


def get_ollama_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    api_key = os.getenv("OLLAMA_API_KEY", "").strip()
    base_url = get_ollama_base_url()

    if base_url.startswith("https://ollama.com") and not api_key:
        raise HTTPException(
            status_code=500,
            detail="OLLAMA_API_KEY is required when using ollama.com",
        )

    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    return headers


def get_default_ollama_model() -> str:
    model = os.getenv("OLLAMA_MODEL", "").strip()
    if not model:
        raise HTTPException(
            status_code=500,
            detail="OLLAMA_MODEL is not configured",
        )
    return model


def rotate_candidates(candidates: list[str], query: str) -> list[str]:
    if len(candidates) < 2:
        return candidates

    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()
    offset = int(digest[:8], 16) % len(candidates)
    return candidates[offset:] + candidates[:offset]


def score_discovered_instance(details: dict[str, Any]) -> float:
    uptime_week = float(details.get("uptime", {}).get("uptimeWeek") or 0)
    uptime_month = float(details.get("uptime", {}).get("uptimeMonth") or 0)
    search_success = float(
        details.get("timing", {}).get("search", {}).get("success_percentage") or 0
    )
    initial_latency = float(
        details.get("timing", {}).get("initial", {}).get("all", {}).get("value") or 999
    )
    main_bonus = 20 if details.get("main") else 0
    privacy_bonus = 10 if not details.get("analytics") else -50
    return (
        (uptime_week * 3)
        + (uptime_month * 2)
        + (search_success * 4)
        + main_bonus
        + privacy_bonus
        - (initial_latency * 25)
    )


def select_discovered_instances(instances: dict[str, Any]) -> list[str]:
    strict_candidates: list[tuple[float, str]] = []
    fallback_candidates: list[tuple[float, str]] = []
    broad_candidates: list[tuple[float, str]] = []

    for instance_url, details in instances.items():
        if not isinstance(details, dict):
            continue

        http_info = details.get("http", {})
        timing = details.get("timing", {})
        search_timing = timing.get("search", {})
        if http_info.get("status_code") != 200:
            continue
        if details.get("generator") != "searxng":
            continue
        if not instance_url.startswith("https://"):
            continue

        normalized_url = normalize_searxng_base_url(instance_url)
        score = score_discovered_instance(details)
        uptime_week = float(details.get("uptime", {}).get("uptimeWeek") or 0)
        search_success = float(search_timing.get("success_percentage") or 0)

        broad_candidates.append((score, normalized_url))

        if details.get("analytics"):
            continue

        fallback_candidates.append((score, normalized_url))
        if (
            details.get("network_type") == "normal"
            and details.get("main")
            and uptime_week >= SEARXNG_MIN_UPTIME_WEEK
            and search_success >= SEARXNG_MIN_SEARCH_SUCCESS
        ):
            strict_candidates.append((score, normalized_url))

    for pool in (strict_candidates, fallback_candidates, broad_candidates):
        if pool:
            ordered = sorted(pool, key=lambda item: item[0], reverse=True)
            unique_urls: list[str] = []
            for _, url in ordered:
                if url not in unique_urls:
                    unique_urls.append(url)
            return unique_urls[:SEARXNG_DISCOVERY_CANDIDATE_LIMIT]

    return []


async def fetch_discovered_searxng_instances(session: aiohttp.ClientSession) -> list[str]:
    cache_key = "instances"
    if cache_key in discovery_cache:
        return discovery_cache[cache_key]

    if not SEARXNG_DISCOVERY_URL:
        return []

    try:
        async with session.get(SEARXNG_DISCOVERY_URL) as response:
            response.raise_for_status()
            data = await response.json()
    except aiohttp.ClientError as exc:
        logger.error("SearxNG discovery failed: %s", exc)
        return []

    instances = data.get("instances", {})
    selected_instances = select_discovered_instances(instances)
    discovery_cache[cache_key] = selected_instances
    return selected_instances


async def get_searxng_candidate_urls(
    session: aiohttp.ClientSession,
    query: str,
) -> list[str]:
    primary_url = get_primary_searxng_base_url()
    candidates: list[str] = []

    if primary_url:
        candidates.append(primary_url)

    if SEARXNG_ENABLE_FALLBACK_ROTATION:
        discovered_urls = await fetch_discovered_searxng_instances(session)
        for url in rotate_candidates(discovered_urls, query):
            if url not in candidates:
                candidates.append(url)

    if not candidates:
        raise HTTPException(
            status_code=500,
            detail="No SearxNG base URL is configured and no discovered instances are available",
        )

    return candidates


async def fetch_single_searxng_result_set(
    session: aiohttp.ClientSession,
    base_url: str,
    query: str,
    max_results: int,
) -> list[dict[str, Any]]:
    params = {
        "q": query,
        "format": "json",
        "language": DEFAULT_SEARCH_LANGUAGE,
        "safesearch": DEFAULT_SAFESEARCH,
    }

    configured_engines = os.getenv("SEARXNG_ENGINES", "").strip()
    configured_categories = os.getenv("SEARXNG_CATEGORIES", "").strip()
    configured_time_range = os.getenv("SEARXNG_TIME_RANGE", "").strip()

    if configured_engines:
        params["engines"] = configured_engines
    if configured_categories:
        params["categories"] = configured_categories
    if configured_time_range:
        params["time_range"] = configured_time_range

    try:
        async with session.get(build_searxng_search_url(base_url), params=params) as response:
            response.raise_for_status()
            data = await response.json()
    except aiohttp.ClientError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Search request failed for {base_url}",
        ) from exc

    results = []
    for item in data.get("results", [])[:max_results]:
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "content": item.get("content") or item.get("snippet") or "",
                "engine": item.get("engine", ""),
                "score": item.get("score"),
                "search_instance": base_url,
            }
        )

    return results


def build_search_context(results: list[dict[str, Any]]) -> str:
    if not results:
        return "No relevant web results were returned."

    blocks = []
    for index, result in enumerate(results, start=1):
        title = result.get("title") or "Untitled"
        url = result.get("url") or ""
        snippet = result.get("content") or "No snippet available."
        blocks.append(f"[{index}] {title}\nURL: {url}\nSnippet: {snippet}")

    return "\n\n".join(blocks)


def resolve_user_query(chat_request: ChatRequest) -> str:
    if chat_request.content:
        return chat_request.content

    for message in reversed(chat_request.messages):
        if message.role == "user" and message.content.strip():
            return message.content

    raise HTTPException(
        status_code=400,
        detail="Request must include either content or at least one user message",
    )


def resolve_messages(chat_request: ChatRequest) -> list[dict[str, str]]:
    if chat_request.messages:
        return [dump_model(message) for message in chat_request.messages]

    query = resolve_user_query(chat_request)
    return [{"role": "user", "content": query}]


async def fetch_searxng_results(query: str, max_results: int) -> list[dict[str, Any]]:
    cache_key = (query, max_results)
    if cache_key in search_cache:
        return search_cache[cache_key]

    last_empty_results: list[dict[str, Any]] | None = None
    failure_messages: list[str] = []

    async with aiohttp.ClientSession(timeout=build_timeout()) as session:
        candidate_urls = await get_searxng_candidate_urls(session, query)
        max_attempts = min(len(candidate_urls), max(SEARXNG_DISCOVERY_MAX_ATTEMPTS, 1))

        for attempt_index, base_url in enumerate(candidate_urls[:max_attempts], start=1):
            try:
                results = await fetch_single_searxng_result_set(
                    session=session,
                    base_url=base_url,
                    query=query,
                    max_results=max_results,
                )
            except HTTPException as exc:
                logger.warning("SearxNG candidate failed for %s: %s", base_url, exc.detail)
                failure_messages.append(str(exc.detail))
                continue

            if results:
                search_cache[cache_key] = results
                return results

            last_empty_results = results
            logger.info("SearxNG candidate returned no results: %s", base_url)
            if attempt_index > SEARXNG_EMPTY_RESULT_RETRIES:
                break

    if last_empty_results is not None:
        search_cache[cache_key] = last_empty_results
        return last_empty_results

    if failure_messages:
        logger.warning(
            "All SearxNG candidates failed; returning empty results. Last error: %s",
            failure_messages[-1],
        )
    else:
        logger.warning("All SearxNG candidates failed; returning empty results")

    empty_results: list[dict[str, Any]] = []
    search_cache[cache_key] = empty_results
    return empty_results


async def fetch_ollama_models() -> list[dict[str, Any]]:
    async with aiohttp.ClientSession(timeout=build_timeout()) as session:
        try:
            async with session.get(
                f"{get_ollama_base_url()}/tags",
                headers=get_ollama_headers(),
            ) as response:
                response.raise_for_status()
                data = await response.json()
        except aiohttp.ClientError as exc:
            logger.error("Ollama model lookup failed: %s", exc)
            raise HTTPException(status_code=502, detail="Failed to fetch Ollama models") from exc

    return data.get("models", [])


async def fetch_ollama_chat_response(
    messages: list[dict[str, str]],
    model: str,
    stream: bool,
) -> dict[str, Any]:
    payload = {
        "model": model,
        "messages": messages,
        "stream": stream,
    }

    async with aiohttp.ClientSession(timeout=build_timeout()) as session:
        try:
            async with session.post(
                f"{get_ollama_base_url()}/chat",
                headers=get_ollama_headers(),
                json=payload,
            ) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as exc:
            logger.error("Ollama chat request failed: %s", exc)
            raise HTTPException(status_code=502, detail="Failed to fetch model response") from exc


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/search/")
async def search(
    query: str = Query(..., alias="query"),
    max_results: int = Query(DEFAULT_SEARCH_LIMIT, ge=1, le=10),
) -> dict[str, Any]:
    results = await fetch_searxng_results(query, max_results=max_results)
    return {"results": results}


@app.get("/models/")
async def list_models() -> dict[str, Any]:
    models = await fetch_ollama_models()
    return {"models": models}


@app.post("/api/")
async def get_response(chat_request: ChatRequest) -> dict[str, Any]:
    if chat_request.stream:
        raise HTTPException(
            status_code=400,
            detail="Streaming responses are not implemented for this endpoint",
        )

    user_query = resolve_user_query(chat_request)
    base_messages = resolve_messages(chat_request)
    search_results: list[dict[str, Any]] = []

    if chat_request.include_search:
        search_results = await fetch_searxng_results(user_query, chat_request.max_results)

    messages = [
        {
            "role": "system",
            "content": chat_request.system_prompt or DEFAULT_SYSTEM_PROMPT,
        }
    ]

    if chat_request.include_search:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Web search context:\n"
                    f"{build_search_context(search_results)}"
                ),
            }
        )

    messages.extend(base_messages)

    response_data = await fetch_ollama_chat_response(
        messages=messages,
        model=chat_request.model or get_default_ollama_model(),
        stream=False,
    )

    assistant_message = response_data.get("message", {})
    return {
        "content": assistant_message.get("content", ""),
        "model": response_data.get("model"),
        "search_results": search_results,
    }
