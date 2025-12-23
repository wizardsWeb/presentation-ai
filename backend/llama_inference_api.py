import os
import re
import subprocess
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Initialize Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Add request logging
@app.before_request
def log_request_info():
    """Log incoming requests for debugging"""
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{timestamp}] {'='*60}")
    print(f"Request: {request.method} {request.path}")
    print(f"Remote Address: {request.remote_addr}")
    print(f"Headers: {dict(request.headers)}")
    if request.is_json:
        try:
            json_data = request.get_json()
            print(f"JSON Body: {json_data}")
        except:
            print("JSON Body: (could not parse)")
    print(f"{'='*60}\n")

@app.after_request
def log_response_info(response):
    """Log response for debugging"""
    import datetime
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] Response: {response.status_code} for {request.method} {request.path}")
    return response

# Define paths
LLAMA_CPP_DIR = './llama.cpp'
QUANTIZED_MODEL_FILENAME = 'phi-2-ncert-q4_K_M.gguf'
QUANTIZED_MODEL_PATH = os.path.join(LLAMA_CPP_DIR, QUANTIZED_MODEL_FILENAME)

# Get the original directory (backend directory)
ORIGINAL_DIR = os.path.dirname(os.path.abspath(__file__))
LLAMA_CPP_FULL_PATH = os.path.join(ORIGINAL_DIR, LLAMA_CPP_DIR)

# Global variable to store llama executable path
llama_executable_path = None

def find_llama_executable():
    """Find the llama-completion (preferred) or llama-cli executable in various possible locations"""
    global llama_executable_path
    
    if llama_executable_path and os.path.exists(llama_executable_path):
        return llama_executable_path
    
    # Try multiple possible locations and names
    # Prefer llama-completion over llama-cli for non-interactive single-shot inference
    possible_paths = [
        # llama-completion is preferred for single-shot inference (exits after generation)
        os.path.join(LLAMA_CPP_FULL_PATH, 'build', 'bin', 'llama-completion'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'bin', 'llama-completion'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'llama-completion'),
        # Fallback to llama-cli (may require special flags)
        os.path.join(LLAMA_CPP_FULL_PATH, 'build', 'bin', 'llama-cli'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'bin', 'llama-cli'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'llama-cli'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'main'),
        os.path.join(LLAMA_CPP_FULL_PATH, 'build', 'main'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path) and os.access(path, os.X_OK):
            llama_executable_path = path
            print(f"Found llama executable at: {path}")
            return path
    
    return None

def check_model_exists():
    """Check if the quantized model file exists"""
    model_path = os.path.join(LLAMA_CPP_FULL_PATH, QUANTIZED_MODEL_FILENAME)
    return os.path.exists(model_path), model_path

def run_inference(prompt_text, max_tokens=250, top_k=40, top_p=0.9, temperature=0.7):
    """
    Run inference using llama-completion executable (preferred) or llama-cli
    
    Args:
        prompt_text: The prompt text to send to the model
        max_tokens: Maximum number of tokens to generate
        top_k: Top-k sampling parameter
        top_p: Top-p (nucleus) sampling parameter
        temperature: Sampling temperature
    
    Returns:
        tuple: (success: bool, output: str, error: str)
    """
    llama_executable = find_llama_executable()
    if not llama_executable:
        return False, None, "llama-completion/llama-cli executable not found. Please build llama.cpp first."
    
    model_exists, model_path = check_model_exists()
    if not model_exists:
        return False, None, f"Model file not found at: {model_path}"
    
    try:
        # Build command for llama-completion (or llama-cli)
        # Use absolute paths to avoid directory issues
        # Note: Do NOT use --log-disable as it suppresses the model output too!
        cmd = [
            llama_executable,
            '-m', model_path,  # Use full path to model
            '-p', prompt_text,
            '-n', str(max_tokens),
            '--top-k', str(top_k),
            '--top-p', str(top_p),
            '--temp', str(temperature),
        ]
        
        # Debug: print the command
        print(f"Running command: {' '.join(cmd[:3])}...")
        
        # Run inference from the current directory (no need to change dirs with absolute paths)
        # Use stderr=subprocess.STDOUT to combine stderr and stdout
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Redirect stderr to stdout
            text=True,
            timeout=300,  # 5 minute timeout
            check=False,  # Don't raise exception on non-zero exit
            cwd=LLAMA_CPP_FULL_PATH  # Set working directory
        )
        
        # Parse the output (now contains both stdout and stderr combined)
        output = result.stdout
        
        # Debug: print output length
        print(f"Output length: {len(output)} chars, return code: {result.returncode}")
        
        # Extract the generated response from the output
        response_text = parse_inference_output(output, prompt_text)
        
        if result.returncode == 0 and response_text:
            return True, response_text, None
        elif result.returncode == 0:
            # Return code is 0 but parsing failed - return raw output for debugging
            debug_output = f"Combined Output:\n{result.stdout}"
            return False, None, f"Could not parse response. Raw output: {debug_output[:1500]}"
        else:
            error_msg = result.stdout or "Unknown error occurred"
            return False, None, f"Inference failed (exit code {result.returncode}): {error_msg}"
            
    except subprocess.TimeoutExpired:
        return False, None, "Inference timed out after 5 minutes"
    except Exception as e:
        return False, None, f"Error running inference: {str(e)}"


def parse_inference_output(output, prompt_text):
    """
    Parse the output from llama-completion to extract the generated response.
    
    Args:
        output: The raw stdout from llama-completion (may include stderr if combined)
        prompt_text: The original prompt text
    
    Returns:
        str: The extracted response text, or None if parsing failed
    """
    if not output:
        return None
    
    # llama-completion outputs: GPU info + prompt + generated text + stats
    # We need to extract just the generated part after "### Response:\n"
    
    lines = output.split('\n')
    response_lines = []
    collecting = False
    
    # Patterns to skip (GPU info, stats, etc.)
    skip_patterns = [
        'common_perf_print:',
        'llama_memory_breakdown_print:',
        'ggml_metal',
        'ggml_cpu',
        'Loading model',
        'MTLGPUFamily',
        'simdgroup',
        'has unified memory',
        'has bfloat',
        'has tensor',
        'use residency',
        'use shared',
        'recommendedMaxWorkingSetSize',
        'tensor API disabled',
        'using embedded metal',
        'loaded in',
        'creating a residency',
        'GPU name:',
        'GPU family:',
        '## Instruction:',  # Sometimes model outputs ## instead of ###
    ]
    
    for line in lines:
        # Skip lines matching skip patterns
        if any(pattern in line for pattern in skip_patterns):
            continue
        
        # Look for the Response marker
        if '### Response:' in line:
            collecting = True
            # Get any text after "### Response:" on the same line
            after_marker = line.split('### Response:')[-1].strip()
            if after_marker:
                response_lines.append(after_marker)
            continue
        
        if collecting:
            # Stop at end markers
            if '[end of text]' in line:
                # Get text before the marker
                before_marker = line.split('[end of text]')[0].strip()
                if before_marker:
                    response_lines.append(before_marker)
                break
            
            # Stop at special tokens
            if '<|im_end|>' in line:
                before_marker = line.split('<|im_end|>')[0].strip()
                if before_marker:
                    response_lines.append(before_marker)
                break
            
            # Stop at next instruction (model generating more Q&A pairs)
            if '### Instruction:' in line or '### Example:' in line:
                break
            
            # Skip empty lines at the start of response
            if not response_lines and not line.strip():
                continue
            
            response_lines.append(line)
    
    # Join and clean the response
    response_text = '\n'.join(response_lines).strip()
    
    # Clean up any remaining special tokens
    response_text = response_text.replace('<|im_end|>', '').strip()
    response_text = response_text.replace('[end of text]', '').strip()
    
    return response_text if response_text else None

def format_prompt(instruction):
    """
    Format instruction into the expected prompt template for the fine-tuned model
    
    Args:
        instruction: The instruction/question text
    
    Returns:
        Formatted prompt string
    """
    return f"### Instruction:\n{instruction}\n### Response:\n"

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - simple test"""
    return jsonify({
        "message": "Llama Inference API is running",
        "endpoints": {
            "health": "/health",
            "inference": "/inference (POST)",
            "batch_inference": "/batch_inference (POST)",
            "model_info": "/model/info"
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    print("Health check endpoint called")
    llama_executable = find_llama_executable()
    model_exists, model_path = check_model_exists()
    
    return jsonify({
        "status": "healthy",
        "llama_executable_found": llama_executable is not None,
        "llama_executable_path": llama_executable if llama_executable else None,
        "model_exists": model_exists,
        "model_path": model_path if model_exists else None
    })

@app.route('/inference', methods=['POST'])
def inference():
    """
    Main inference endpoint
    
    Request body:
    {
        "instruction": "What is the function of the human brain according to NCERT biology?",
        "max_tokens": 250,  // optional, default: 250
        "top_k": 40,        // optional, default: 40
        "top_p": 0.9,       // optional, default: 0.9
        "temperature": 0.7  // optional, default: 0.7
    }
    
    Response:
    {
        "success": true,
        "instruction": "...",
        "response": "...",
        "error": null
    }
    """
    print("Inference endpoint called")
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        if 'instruction' not in data:
            return jsonify({"error": "Missing 'instruction' in request body"}), 400
        
        instruction = data['instruction']
        if not isinstance(instruction, str) or not instruction.strip():
            return jsonify({"error": "Instruction must be a non-empty string"}), 400
        
        # Get optional parameters
        max_tokens = data.get('max_tokens', 250)
        top_k = data.get('top_k', 40)
        top_p = data.get('top_p', 0.9)
        temperature = data.get('temperature', 0.7)
        
        # Format prompt
        prompt_text = format_prompt(instruction)
        
        # Run inference
        success, output, error = run_inference(
            prompt_text,
            max_tokens=max_tokens,
            top_k=top_k,
            top_p=top_p,
            temperature=temperature
        )
        
        if success:
            print(f"✓ Inference successful for: {instruction[:50]}...")
            return jsonify({
                "success": True,
                "instruction": instruction,
                "response": output.strip(),
                "error": None
            })
        else:
            print(f"✗ Inference failed for: {instruction[:50]}...")
            print(f"  Error: {error}")
            return jsonify({
                "success": False,
                "instruction": instruction,
                "response": None,
                "error": error
            }), 500
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

@app.route('/batch_inference', methods=['POST'])
def batch_inference():
    """
    Batch inference endpoint for multiple instructions
    
    Request body:
    {
        "instructions": [
            "What is the function of the human brain?",
            "Explain the Green Revolution in India"
        ],
        "max_tokens": 250,  // optional
        "top_k": 40,        // optional
        "top_p": 0.9,       // optional
        "temperature": 0.7  // optional
    }
    
    Response:
    {
        "success": true,
        "results": [
            {
                "instruction": "...",
                "response": "...",
                "error": null
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        if 'instructions' not in data:
            return jsonify({"error": "Missing 'instructions' in request body"}), 400
        
        instructions = data['instructions']
        if not isinstance(instructions, list) or len(instructions) == 0:
            return jsonify({"error": "Instructions must be a non-empty list"}), 400
        
        # Get optional parameters
        max_tokens = data.get('max_tokens', 250)
        top_k = data.get('top_k', 40)
        top_p = data.get('top_p', 0.9)
        temperature = data.get('temperature', 0.7)
        
        results = []
        for instruction in instructions:
            if not isinstance(instruction, str) or not instruction.strip():
                results.append({
                    "instruction": instruction,
                    "response": None,
                    "error": "Invalid instruction format"
                })
                continue
            
            prompt_text = format_prompt(instruction)
            success, output, error = run_inference(
                prompt_text,
                max_tokens=max_tokens,
                top_k=top_k,
                top_p=top_p,
                temperature=temperature
            )
            
            results.append({
                "instruction": instruction,
                "response": output.strip() if success else None,
                "error": error if not success else None
            })
        
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}"
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get information about the model"""
    model_exists, model_path = check_model_exists()
    
    info = {
        "model_filename": QUANTIZED_MODEL_FILENAME,
        "model_exists": model_exists,
        "model_path": model_path if model_exists else None
    }
    
    if model_exists:
        try:
            file_size = os.path.getsize(model_path)
            info["model_size_bytes"] = file_size
            info["model_size_mb"] = round(file_size / (1024 * 1024), 2)
        except Exception as e:
            info["size_error"] = str(e)
    
    return jsonify(info)

if __name__ == '__main__':
    # Check if llama executable exists on startup
    llama_executable = find_llama_executable()
    if not llama_executable:
        print("WARNING: llama-completion/llama-cli executable not found!")
        print("The API will start but inference endpoints will fail.")
        print("Please build llama.cpp first:")
        print("  cd llama.cpp && cmake --build build --target llama-completion -j4")
    
    # Check if model exists
    model_exists, model_path = check_model_exists()
    if not model_exists:
        print(f"WARNING: Model file not found at: {model_path}")
        print("The API will start but inference endpoints will fail.")
    
    # Run Flask app
    print("\n" + "="*50)
    print("Llama Inference API Server")
    print("="*50)
    print(f"Model: {QUANTIZED_MODEL_FILENAME}")
    print(f"Model exists: {model_exists}")
    print(f"llama executable found: {llama_executable is not None}")
    if llama_executable:
        print(f"llama executable path: {llama_executable}")
    print("="*50)
    print("\nAvailable endpoints:")
    print("  GET  / - Root endpoint (test)")
    print("  GET  /health - Health check")
    print("  POST /inference - Single inference")
    print("  POST /batch_inference - Batch inference")
    print("  GET  /model/info - Model information")
    print("\nStarting server on http://0.0.0.0:5001...")
    print("Server will also be available at http://127.0.0.1:5001")
    print("Server will also be available at http://localhost:5001")
    print("="*50 + "\n")
    
    try:
        app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"\nERROR: Port 5001 is already in use!")
            print("Please either:")
            print("  1. Stop the other process using port 5001")
            print("  2. Change the port in this script")
            print(f"\nError details: {e}")
        else:
            print(f"\nERROR starting server: {e}")
        sys.exit(1)

