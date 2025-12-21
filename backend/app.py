import torch
import gc
from flask import Flask, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, StoppingCriteria, StoppingCriteriaList
# No need for PeftModel if loading an already merged model

# Define a custom stopping criteria to stop generation at various instruction patterns
class StopOnMultipleInstructions(StoppingCriteria):
    def __init__(self, tokenizer, stop_sequences_str_list):
        self.tokenizer = tokenizer
        self.stop_sequences_str_list = stop_sequences_str_list
        self.start_len = None # Will be set before each generate call

    def __call__(self, input_ids: torch.LongTensor, scores: torch.FloatTensor, **kwargs) -> bool:
        if self.start_len is None:
            self.start_len = input_ids.shape[1] # Fallback, assumes first call is initial prompt

        # Get only the newly generated tokens (after the initial prompt)
        if input_ids.shape[1] <= self.start_len:
            return False

        newly_generated_ids = input_ids[0, self.start_len:].tolist()
        newly_generated_text = self.tokenizer.decode(newly_generated_ids, skip_special_tokens=True)

        for stop_str in self.stop_sequences_str_list:
            if stop_str in newly_generated_text:
                return True
        return False

# --- Model Loading Logic ---
# Clear GPU memory and collect garbage
torch.cuda.empty_cache()
gc.collect()
print("GPU memory cleared and garbage collected for Flask app model loading.")

# Define the path to your locally saved merged model
local_model_path = './merged_fine_tuned_phi_model' # This is where the fully merged model is saved

# Quantization configuration (must match training)
bitsandbytes_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=False,
)

# Load the merged model directly
print(f"Loading merged fine-tuned model from {local_model_path}...")
model = AutoModelForCausalLM.from_pretrained(
    local_model_path,
    quantization_config=bitsandbytes_config, # Apply quantization if desired, even for merged model
    trust_remote_code=True,
    device_map="auto"
)

# Load tokenizer from the merged model path
print(f"Loading tokenizer from {local_model_path}...")
tokenizer = AutoTokenizer.from_pretrained(local_model_path, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

print("Merged fine-tuned model and tokenizer loaded successfully.")

# Define multiple stop sequences for cleaner output
stop_sequences_str_list = [
    "### Instruction:", "## Instruction:", "# Instruction:",
    "# Exercise", "## Exercise:",
    "### Response:",
    "# Problem", "# Solution",
    "#",
    "Question:", # Added to specifically catch 'Question:'
    "Possible rewrite of the question and solution:" # Added to specifically catch this phrase
]

# Initialize stopping criteria
stop_criteria = StoppingCriteriaList([StopOnMultipleInstructions(tokenizer, stop_sequences_str_list)])

def generate_ncert_explanation(topic: str) -> str:
    """
    Generates an NCERT-based explanation for a given topic using the loaded fine-tuned model.

    Args:
        topic (str): The topic or question to explain.

    Returns:
        str: The generated NCERT-based explanation.
    """
    input_string = f"### Instruction:\n{topic}\n### Response:\n"
    inputs = tokenizer(input_string, return_tensors="pt").to(model.device)

    # Set the start_len for the StoppingCriteria for the current generation
    stop_criteria[0].start_len = inputs.input_ids.shape[1]

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=500,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            eos_token_id=tokenizer.eos_token_id,
            stopping_criteria=stop_criteria
        )

    generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
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

# Initialize Flask application
app = Flask(__name__)

@app.route('/generate_explanation', methods=['POST'])
def api_generate_explanation():
    data = request.get_json()
    if 'topic' not in data:
        return jsonify({"error": "'topic' key missing in request body"}), 400

    topic = data['topic']
    explanation = generate_ncert_explanation(topic)
    return jsonify({"explanation": explanation})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
