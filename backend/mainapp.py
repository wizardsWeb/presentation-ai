
# GPU-first (MPS for Apple Silicon) with CPU fallback, robust Flask API
import torch
import os
from flask import Flask, request, jsonify
from transformers import PhiForCausalLM, AutoTokenizer, StoppingCriteria, StoppingCriteriaList

# --- Device Detection for Mac M3 Air ---
def get_device():
    """Detect and return the best available device for Mac M3 Air"""
    if torch.backends.mps.is_available():
        print("✅ MPS (Metal Performance Shaders) is available - Using GPU acceleration")
        return "mps"
    elif torch.cuda.is_available():
        print("✅ CUDA is available - Using GPU acceleration")
        return "cuda"
    else:
        print("⚠️  No GPU available - Falling back to CPU")
        return "cpu"

device = get_device()

# --- Custom Stopping Criteria ---

# Matches the notebook's robust stopping criteria
class StopOnMultipleInstructions(StoppingCriteria):
    def __init__(self, tokenizer, stop_sequences_str_list):
        self.tokenizer = tokenizer
        self.stop_sequences_str_list = stop_sequences_str_list
        self.start_len = None # Will be set before each generate call

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        if self.start_len is None:
            self.start_len = input_ids.shape[1]
        if input_ids.shape[1] <= self.start_len:
            return False
        newly_generated_ids = input_ids[0, self.start_len:].tolist()
        newly_generated_text = self.tokenizer.decode(newly_generated_ids, skip_special_tokens=True)
        for stop_str in self.stop_sequences_str_list:
            if stop_str in newly_generated_text:
                return True
        return False

# --- Model Setup ---
local_model_path = '../merged_fine_tuned_phi_model'

# Determine device_map based on available device
if device == "mps":
    # For MPS, use float32 (more stable than float16 on MPS)
    print(f"Loading model from {local_model_path} (will use MPS GPU with float32)...")
    try:
        model = PhiForCausalLM.from_pretrained(
            local_model_path,
            trust_remote_code=True,
            device_map="cpu",  # Load on CPU first
            ignore_mismatched_sizes=True,
            torch_dtype=torch.float32  # Use float32 for MPS stability
        )
        # Move model to MPS device
        model = model.to(device)
        print(f"✅ Model moved to {device.upper()} device")
    except Exception as e:
        print(f"⚠️  Error loading model on MPS: {e}")
        print("🔄 Falling back to CPU...")
        device = "cpu"
        model = PhiForCausalLM.from_pretrained(
            local_model_path,
            trust_remote_code=True,
            device_map="cpu",
            ignore_mismatched_sizes=True
        )
elif device == "cuda":
    print(f"Loading model from {local_model_path} (will use CUDA GPU)...")
    model = PhiForCausalLM.from_pretrained(
        local_model_path,
        trust_remote_code=True,
        device_map="cuda",
        ignore_mismatched_sizes=True,
        torch_dtype=torch.float16
    )
else:
    print(f"Loading model from {local_model_path} (CPU-only mode)...")
    model = PhiForCausalLM.from_pretrained(
        local_model_path,
        trust_remote_code=True,
        device_map="cpu",
        ignore_mismatched_sizes=True
    )

tokenizer = AutoTokenizer.from_pretrained(local_model_path, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"
print(f"✅ Model and tokenizer loaded successfully on {device.upper()}")

# Stopping criteria

# Use the same stop sequences as in the notebook
stop_sequences_str_list = [
    "### Instruction:", "## Instruction:", "# Instruction:",
    "# Exercise", "## Exercise:", "### Response:",
    "# Problem", "# Solution", "#",
    "Question:", "Possible rewrite of the question and solution:"
]
stop_criteria = StoppingCriteriaList([StopOnMultipleInstructions(tokenizer, stop_sequences_str_list)])

# --- Flask App ---
app = Flask(__name__)


def generate_ncert_explanation(topic: str) -> str:
    input_string = f"### Instruction:\n{topic}\n### Response:\n"
    inputs = tokenizer(input_string, return_tensors="pt").to(device)
    # Set the start_len for the StoppingCriteria for the current generation
    stop_criteria[0].start_len = inputs.input_ids.shape[1]
    
    # Generation parameters - adjusted for MPS compatibility
    generation_kwargs = {
        "max_new_tokens": 500,
        "do_sample": True,
        "temperature": 0.7,
        "top_p": 0.9,
        "eos_token_id": tokenizer.eos_token_id,
        "stopping_criteria": stop_criteria,
        "pad_token_id": tokenizer.eos_token_id,  # Ensure pad token is set
    }
    
    # For MPS, add additional stability parameters
    if device == "mps":
        generation_kwargs.update({
            "repetition_penalty": 1.1,  # Prevent repetition issues
            "no_repeat_ngram_size": 3,  # Prevent n-gram repetition
        })
    
    try:
        with torch.no_grad():
            # Set model to eval mode for inference
            model.eval()
            outputs = model.generate(**inputs, **generation_kwargs)
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    except RuntimeError as e:
        if "probability tensor" in str(e) or "inf" in str(e) or "nan" in str(e):
            print(f"⚠️  Generation error on {device}: {e}")
            if device == "mps":
                print("🔄 Retrying on CPU due to MPS compatibility issue...")
                # Fallback to CPU for this generation
                inputs_cpu = inputs.to("cpu")
                model_cpu = model.to("cpu")
                model_cpu.eval()
                with torch.no_grad():
                    outputs = model_cpu.generate(**inputs_cpu, **generation_kwargs)
                generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
                # Move model back to original device
                model = model.to(device)
            else:
                raise
        else:
            raise
    response_start_tag = "### Response:\n"
    response_start_index = generated_text.find(response_start_tag)
    if response_start_index != -1:
        extracted_response = generated_text[response_start_index + len(response_start_tag):].strip()
        # Further refine to remove any partial stop sequences that might have been generated just before stopping
        min_idx = len(extracted_response)
        for seq in stop_sequences_str_list:
            idx = extracted_response.find(seq)
            if idx != -1:
                min_idx = min(min_idx, idx)
        extracted_response = extracted_response[:min_idx].strip()
        return extracted_response
    else:
        return "Could not parse generated response."

@app.route('/generate_explanation', methods=['POST'])
def api_generate_explanation():
    data = request.get_json()
    if not data or 'topic' not in data:
        return jsonify({"error": "'topic' key missing in request body"}), 400
    topic = data['topic']
    explanation = generate_ncert_explanation(topic)
    return jsonify({"explanation": explanation})

if __name__ == '__main__':
    # Use port from environment variable or default to 5001 (5000 is often used by AirPlay on macOS)
    port = int(os.environ.get('PORT', 5001))
    print(f"\n🚀 Starting Flask server on port {port}...")
    print(f"📡 Device: {device.upper()}")
    print(f"🌐 Server will be available at http://localhost:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=True)
