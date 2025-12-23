import faiss
import numpy as np
import pickle
import os
from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
import requests
import json

# Initialize Flask application
app = Flask(__name__)

# Paths to FAISS index and metadata
FAISS_INDEX_PATH = os.path.join('faiss_store', 'faiss_index.bin')
METADATA_PATH = os.path.join('faiss_store', 'faiss_metadata.pkl')

# Initialize global variables
index = None
metadata_for_faiss = None
model = None

# Ollama API configuration
OLLAMA_API_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "phi3:latest"

def load_rag_components():
    """Load FAISS index, metadata, and embedding model"""
    global index, metadata_for_faiss, model
    
    # Load the FAISS index
    if not os.path.exists(FAISS_INDEX_PATH):
        raise FileNotFoundError(f"FAISS index not found at {FAISS_INDEX_PATH}")
    
    index = faiss.read_index(FAISS_INDEX_PATH)
    print(f"FAISS index loaded from {FAISS_INDEX_PATH}")
    
    # Load the metadata
    if not os.path.exists(METADATA_PATH):
        raise FileNotFoundError(f"Metadata not found at {METADATA_PATH}")
    
    with open(METADATA_PATH, 'rb') as f:
        metadata_for_faiss = pickle.load(f)
    print(f"Metadata loaded from {METADATA_PATH}")
    
    # Initialize the SentenceTransformer model
    model_name = 'all-MiniLM-L6-v2'
    model = SentenceTransformer(model_name)
    print(f"Embedding model '{model_name}' initialized successfully.")

def retrieve_chunks(query, k=3):
    """
    Retrieve top k chunks from FAISS index based on query similarity
    
    Args:
        query (str): The search query
        k (int): Number of chunks to retrieve (default: 3)
    
    Returns:
        list: List of retrieved chunks with metadata
    """
    # Generate embedding for the query
    query_embedding = model.encode([query]).astype('float32')
    
    # Perform similarity search
    distances, indices = index.search(query_embedding, k)
    
    retrieved_chunks = []
    for i, idx in enumerate(indices[0]):
        # Find the corresponding metadata for the text chunk at 'idx'
        matched_metadata = None
        for meta in metadata_for_faiss:
            if meta.get('content_type') == 'text' and meta.get('embedding_index') == idx:
                matched_metadata = meta
                break
        
        if matched_metadata:
            retrieved_chunks.append({
                'rank': i + 1,
                'distance': float(distances[0][i]),
                'chunk_id': matched_metadata['chunk_id'],
                'pdf_file': matched_metadata['pdf_file'],
                'content': matched_metadata['content']
            })
    
    return retrieved_chunks

def generate_answer_with_ollama(query, retrieved_chunks):
    """
    Generate answer using Ollama phi3:latest model with retrieved contexts
    
    Args:
        query (str): The user query
        retrieved_chunks (list): List of retrieved chunks (top 3)
    
    Returns:
        str: Generated answer formatted as descriptive bullet points
    """
    # Prepare context from top 3 chunks
    context_parts = []
    for chunk in retrieved_chunks[:3]:  # Ensure we only use top 3
        context_parts.append(f"Rank {chunk['rank']}:\n{chunk['content']}")
    
    context = "\n\n".join(context_parts)
    
    # Construct prompt for PPT slide format with descriptive and comprehensive bullet points
    prompt = f"""Based on the following context, provide a comprehensive and detailed answer to the question in 6-8 descriptive bullet points suitable for a PowerPoint slide. Each bullet point should be:
- Descriptive and informative (not just one sentence)
- Well-explained with relevant details from the context
- Clear and easy to understand
- Comprehensive enough to convey the full meaning

Context:
{context}

Question: {query}

Answer (provide 6-8 descriptive bullet points, each on a new line starting with "-". Make each point detailed and informative):"""
    
    # Call Ollama API
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.7,
            "max_tokens": 1000  # Increased for more descriptive responses
        }
    }
    
    try:
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=180)  # Increased timeout for longer responses
        response.raise_for_status()
        
        result = response.json()
        answer = result.get('response', '').strip()
        
        if not answer:
            return "No response generated from Ollama model."
        
        # Clean up the answer - extract bullet points
        # Remove any prefix text before bullet points
        lines = answer.split('\n')
        bullet_points = []
        for line in lines:
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*')):
                # Remove bullet symbol and clean
                cleaned = line.lstrip('-•*').strip()
                if cleaned:
                    bullet_points.append(cleaned)
            elif line and not any(keyword in line.lower() for keyword in ['answer', 'context', 'question']):
                # If it's a valid line but doesn't have bullet and isn't a header, add it
                if len(line) > 10:  # Only add substantial lines
                    bullet_points.append(line)
        
        # If we got bullet points, return them; otherwise return the raw answer
        if bullet_points:
            # Return all bullet points (up to 10 max to avoid too many)
            # Remove limit to allow more descriptive points
            final_points = bullet_points[:10]  # Increased limit for more points
            return '\n'.join([f"- {point}" for point in final_points])
        else:
            # Fallback: try to split by sentences and create bullet points
            sentences = [s.strip() for s in answer.split('.') if s.strip()]
            if sentences:
                final_points = sentences[:8]  # Allow more sentences as bullet points
                return '\n'.join([f"- {point}" for point in final_points])
            return answer
            
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Cannot connect to Ollama API at {OLLAMA_API_URL}. Make sure Ollama is running."
        print(f"Error: {error_msg}")
        return f"Error: {error_msg}"
    except requests.exceptions.Timeout as e:
        error_msg = "Ollama API request timed out. The model might be taking too long to respond."
        print(f"Error: {error_msg}")
        return f"Error: {error_msg}"
    except requests.exceptions.RequestException as e:
        error_msg = f"Error calling Ollama API: {str(e)}"
        print(f"Error: {error_msg}")
        return f"Error: {error_msg}"
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"Error: {error_msg}")
        return f"Error: {error_msg}"

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "faiss_loaded": index is not None,
        "metadata_loaded": metadata_for_faiss is not None,
        "model_loaded": model is not None
    })

@app.route('/query', methods=['POST'])
def query_rag():
    """
    Main RAG endpoint that retrieves chunks and generates answer
    
    Request body:
    {
        "query": "What are the means of transport?",
        "k": 3  // optional, defaults to 3
    }
    
    Response:
    {
        "query": "...",
        "retrieved_chunks": [...],
        "answer": "- Descriptive point 1\n- Descriptive point 2\n- Descriptive point 3\n..."
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({"error": "Missing 'query' in request body"}), 400
        
        query = data['query']
        k = data.get('k', 3)  # Default to 3 chunks
        
        if not isinstance(query, str) or not query.strip():
            return jsonify({"error": "Query must be a non-empty string"}), 400
        
        # Retrieve chunks
        retrieved_chunks = retrieve_chunks(query, k=k)
        
        if not retrieved_chunks:
            return jsonify({
                "query": query,
                "retrieved_chunks": [],
                "answer": "No relevant chunks found for the query."
            })
        
        # Generate answer using Ollama
        answer = generate_answer_with_ollama(query, retrieved_chunks)
        
        # Format response
        response_data = {
            "query": query,
            "retrieved_chunks": [
                {
                    "rank": chunk['rank'],
                    "distance": chunk['distance'],
                    "chunk_id": chunk['chunk_id'],
                    "pdf_file": chunk['pdf_file'],
                    "content": chunk['content']
                }
                for chunk in retrieved_chunks
            ],
            "answer": answer
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error in query_rag: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/retrieve', methods=['POST'])
def retrieve_only():
    """
    Endpoint to only retrieve chunks without generating answer
    
    Request body:
    {
        "query": "What are the means of transport?",
        "k": 3  // optional, defaults to 3
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({"error": "Missing 'query' in request body"}), 400
        
        query = data['query']
        k = data.get('k', 3)
        
        retrieved_chunks = retrieve_chunks(query, k=k)
        
        return jsonify({
            "query": query,
            "retrieved_chunks": [
                {
                    "rank": chunk['rank'],
                    "distance": chunk['distance'],
                    "chunk_id": chunk['chunk_id'],
                    "pdf_file": chunk['pdf_file'],
                    "content": chunk['content']
                }
                for chunk in retrieved_chunks
            ]
        })
        
    except Exception as e:
        print(f"Error in retrieve_only: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Load RAG components on startup
    try:
        load_rag_components()
        print("RAG API initialized successfully!")
        print(f"Ollama model: {OLLAMA_MODEL}")
        print(f"Ollama API URL: {OLLAMA_API_URL}")
    except Exception as e:
        print(f"Failed to initialize RAG components: {e}")
        raise
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5001, debug=True)

