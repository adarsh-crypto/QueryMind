import argparse
import json
import os
from querymind import scraper, query_engine

CONFIG_PATH = os.path.expanduser("~/.querymindrc")

def load_user_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    return {}

def main():
    user_config = load_user_config()
    parser = argparse.ArgumentParser(description="QueryMind - Local Search + LLM")
    parser.add_argument("--query", required=True, help="Search query or question")
    parser.add_argument("--model", help="Model to use (ollama or huggingface)")

    args = parser.parse_args()
    model = args.model or user_config.get("default_model", "ollama")

    print(f"🔍 Searching DuckDuckGo for: '{args.query}'")
    results = scraper.search(args.query)

    if model == "ollama":
        answer = query_engine.ask_ollama(results)
    elif model == "huggingface":
        answer = query_engine.ask_huggingface(results)
    else:
        raise ValueError(f"❌ Unsupported model: {model}")

    print("🧠 LLM Answer:\n", answer)
