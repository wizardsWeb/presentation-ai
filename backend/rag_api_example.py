"""
Example usage of the RAG API

Make sure Ollama is running with phi3:latest model:
    ollama serve
    ollama pull phi3:latest

Then start the Flask API:
    python rag_api.py

Then run this example script or use curl/Postman to test.
"""

import requests
import json

# API endpoint
API_URL = "http://localhost:5001/query"

# Example query
query_data = {
    "query": "What are the means of transport?",
    "k": 3  # Retrieve top 3 chunks
}

# Make request
response = requests.post(API_URL, json=query_data)

if response.status_code == 200:
    result = response.json()
    
    print("=" * 80)
    print(f"Query: {result['query']}")
    print("=" * 80)
    
    print("\nRetrieved Chunks:")
    print("-" * 80)
    for chunk in result['retrieved_chunks']:
        print(f"\nRank {chunk['rank']}:")
        print(f"  PDF File: {chunk['pdf_file']}")
        print(f"  Chunk ID: {chunk['chunk_id']}")
        print(f"  Distance: {chunk['distance']:.4f}")
        print(f"  Content (first 200 chars): {chunk['content'][:200]}...")
    
    print("\n" + "=" * 80)
    print("Generated Answer (PPT Format):")
    print("=" * 80)
    print(result['answer'])
    print("=" * 80)
else:
    print(f"Error: {response.status_code}")
    print(response.text)

