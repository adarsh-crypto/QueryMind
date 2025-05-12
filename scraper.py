from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from bs4 import BeautifulSoup
import aiohttp
import asyncio
import logging
from cachetools import TTLCache
from ratelimit import limits, sleep_and_retry

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

GOOGLE_SEARCH_URL = "https://www.google.com/search"
cache = TTLCache(maxsize=100, ttl=300)  # Cache with max size of 100 items and TTL of 300 seconds

@sleep_and_retry
@limits(calls=10, period=60)  # Limit to 10 requests per 60 seconds
async def get_google_search_results(query):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    params = {
        'q': query,
        'hl': 'en'  # Language parameter to ensure results are in English
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(GOOGLE_SEARCH_URL, headers=headers, params=params) as response:
            response.raise_for_status()
            return await response.text()

async def parse_google_search_results(html):
    soup = BeautifulSoup(html, 'html.parser')
    results = []

    for g in soup.find_all('div', class_='g'):
        anchors = g.find_all('a')
        if anchors:
            link = anchors[0]['href']
            results.append(link)

    return results

async def fetch_content(session, url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        async with session.get(url, headers=headers) as response:
            response.raise_for_status()
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')

            # Extract main content and clean it
            content = ' '.join(soup.stripped_strings)
            return {'url': url, 'content': content}
    except aiohttp.ClientError as e:
        logger.error("Error fetching content from %s: %s", url, e)
        return {'url': url, 'content': ""}

async def get_content_from_links(links):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_content(session, url) for url in links]
        results = await asyncio.gather(*tasks)
    return results

@app.get("/search/")
async def search(query: str):
    if query in cache:
        results = cache[query]
    else:
        html = await get_google_search_results(query)
        search_results = await parse_google_search_results(html)
        results = await get_content_from_links(search_results)
        cache[query] = results

    if results:
        return JSONResponse(content={"results": results})
    else:
        raise HTTPException(status_code=404, detail="No content found for the query")

# To run the API, use the command:
# uvicorn web_search_api:app --reload
