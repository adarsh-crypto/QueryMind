from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import aiohttp
import logging

app = FastAPI()

logger = logging.getLogger(__name__)

class Message(BaseModel):
    role: str
    content: str

class RequestItem(BaseModel):
    model: str
    messages: list[Message]
    stream: bool

# Constants or variables for stream and use_context
STREAM = False

@app.get("/search/")
async def search(query: str = Query(..., alias="query")):
    search_api_url = 'http://127.0.0.1:8000/search/'  # The provided search API URL
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(search_api_url, params={"query": query}) as response:
                response.raise_for_status()
                data = await response.json()
                return {"results": data.get('results', [])}
        except (aiohttp.ClientError, KeyError) as e:
            logger.error(f"Error fetching search results: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch search results")

async def fetch_response(request_item: RequestItem) -> str:
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post('http://localhost:11434/api/generate', json=request_item.dict()) as response:
                response.raise_for_status()
                data = await response.json()
                content = data.get('response', '')
                return content
        except (aiohttp.ClientError, KeyError, IndexError) as e:
            logger.error(f"Error fetching response: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch model response")

@app.post("/api/")
async def get_response(user_message_data: dict):
    try:
        # Extract user message content from the request data
        user_message_content = user_message_data.get("content", "")
        
        # Get search results based on the user message content
        search_results = await search(user_message_content)
        search_results_text = " ".join(result["content"] for result in search_results["results"])

        # System message content
        system_message_content = (
            "You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible and follow ALL given instructions. "
        )

        # Construct dynamic combined message content
        combined_message_content = (
            f"The user has asked: '{user_message_content}'. Based on this query, we have found the following information from our search: {search_results_text}. "
            "Please use the above information to provide a detailed and accurate response to the user's query."
        )

        request_item = RequestItem(
            model="llama3.1",
            messages=[
                {"role": "system", "content": system_message_content},
                {"role": "user", "content": combined_message_content}
            ],
            stream=STREAM
        )

        # Send the constructed RequestItem object to the backend service
        content = await fetch_response(request_item)
        return {"content": content}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Internal server error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
