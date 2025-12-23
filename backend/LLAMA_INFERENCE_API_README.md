# Llama Inference API

A Flask REST API for running inference with the fine-tuned Phi-2 NCERT model using llama.cpp.

## Prerequisites

1. **Build llama.cpp**: The `llama-cli` executable must be built first
   ```bash
   cd llama.cpp
   mkdir -p build && cd build
   cmake ..
   cmake --build . --target llama-cli -j4
   ```

2. **Model file**: The quantized model `phi-2-ncert-q4_K_M.gguf` must be in the `llama.cpp/` directory

3. **Python dependencies**: Install required packages
   ```bash
   pip install Flask flask-cors
   ```

## Running the API

```bash
cd backend
python llama_inference_api.py
```

The API will start on `http://0.0.0.0:5001`

## API Endpoints

### 1. Health Check

**GET** `/health`

Check if the API is ready and if required components are available.

**Response:**
```json
{
  "status": "healthy",
  "llama_cli_found": true,
  "llama_cli_path": "/path/to/llama-cli",
  "model_exists": true,
  "model_path": "/path/to/model.gguf"
}
```

### 2. Single Inference

**POST** `/inference`

Run inference for a single instruction.

**Request Body:**
```json
{
  "instruction": "What is the function of the human brain according to NCERT biology?",
  "max_tokens": 250,    // optional, default: 250
  "top_k": 40,          // optional, default: 40
  "top_p": 0.9,         // optional, default: 0.9
  "temperature": 0.7    // optional, default: 0.7
}
```

**Response:**
```json
{
  "success": true,
  "instruction": "What is the function of the human brain according to NCERT biology?",
  "response": "The human brain is the control center...",
  "error": null
}
```

**Error Response:**
```json
{
  "success": false,
  "instruction": "...",
  "response": null,
  "error": "Error message here"
}
```

### 3. Batch Inference

**POST** `/batch_inference`

Run inference for multiple instructions in a single request.

**Request Body:**
```json
{
  "instructions": [
    "What is the function of the human brain?",
    "Explain the Green Revolution in India",
    "Describe sound waves"
  ],
  "max_tokens": 250,    // optional
  "top_k": 40,          // optional
  "top_p": 0.9,         // optional
  "temperature": 0.7    // optional
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "instruction": "What is the function of the human brain?",
      "response": "The human brain...",
      "error": null
    },
    {
      "instruction": "Explain the Green Revolution in India",
      "response": "The Green Revolution...",
      "error": null
    }
  ]
}
```

### 4. Model Information

**GET** `/model/info`

Get information about the loaded model.

**Response:**
```json
{
  "model_filename": "phi-2-ncert-q4_K_M.gguf",
  "model_exists": true,
  "model_path": "/path/to/model.gguf",
  "model_size_bytes": 1572864000,
  "model_size_mb": 1500.0
}
```

## Example Usage

### Using curl

```bash
# Health check
curl http://localhost:5001/health

# Single inference
curl -X POST http://localhost:5001/inference \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "What is photosynthesis?",
    "max_tokens": 200
  }'

# Batch inference
curl -X POST http://localhost:5001/batch_inference \
  -H "Content-Type: application/json" \
  -d '{
    "instructions": [
      "What is photosynthesis?",
      "Explain the water cycle"
    ]
  }'
```

### Using Python

```python
import requests

# Health check
response = requests.get('http://localhost:5001/health')
print(response.json())

# Single inference
response = requests.post('http://localhost:5001/inference', json={
    'instruction': 'What is the function of the human brain?',
    'max_tokens': 250,
    'temperature': 0.7
})
result = response.json()
print(result['response'])

# Batch inference
response = requests.post('http://localhost:5001/batch_inference', json={
    'instructions': [
        'What is photosynthesis?',
        'Explain the water cycle'
    ]
})
results = response.json()
for item in results['results']:
    print(f"Q: {item['instruction']}")
    print(f"A: {item['response']}\n")
```

### Using JavaScript/TypeScript

```javascript
// Health check
fetch('http://localhost:5001/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Single inference
fetch('http://localhost:5001/inference', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instruction: 'What is the function of the human brain?',
    max_tokens: 250
  })
})
  .then(res => res.json())
  .then(data => console.log(data.response));
```

## Configuration

The API uses the following default paths (relative to the `backend/` directory):

- **Llama.cpp directory**: `./llama.cpp`
- **Model filename**: `phi-2-ncert-q4_K_M.gguf`
- **Port**: `5001` (configurable in the script)

## Error Handling

The API handles various error cases:

- Missing or invalid request body
- Missing llama-cli executable
- Missing model file
- Inference timeouts (5 minute limit)
- Subprocess execution errors

All errors are returned with appropriate HTTP status codes:
- `400`: Bad request (missing/invalid parameters)
- `500`: Server error (inference failure, missing components)

## Notes

1. **Prompt Format**: The API automatically formats instructions using the template:
   ```
   ### Instruction:
   {instruction}
   ### Response:
   ```
   This is required for the fine-tuned model to work correctly.

2. **Timeout**: Each inference request has a 5-minute timeout to prevent hanging requests.

3. **CORS**: CORS is enabled for all routes, allowing cross-origin requests from web applications.

4. **Thread Safety**: The API processes requests sequentially. For concurrent requests, consider using a production WSGI server like Gunicorn.

## Production Deployment

For production, use a WSGI server:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 llama_inference_api:app
```

## Troubleshooting

1. **"llama-cli executable not found"**
   - Build llama.cpp first (see Prerequisites)
   - Check that the executable is in one of the expected locations

2. **"Model file not found"**
   - Ensure `phi-2-ncert-q4_K_M.gguf` is in the `llama.cpp/` directory
   - Check the file path in the error message

3. **Inference timeouts**
   - Increase the timeout in the code if needed
   - Check system resources (CPU, memory)
   - Verify the model file is not corrupted

4. **Port already in use**
   - Change the port in `llama_inference_api.py` (last line)
   - Or kill the process using port 5001

