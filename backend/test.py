import os
import subprocess
import sys

# Define paths
llama_cpp_dir = './llama.cpp'
quantized_model_filename = 'phi-2-ncert-q4_K_M.gguf'
quantized_model_path_in_llama_cpp = os.path.join(llama_cpp_dir, quantized_model_filename)

# Get the original directory
original_dir = os.getcwd()

# Ensure the quantized GGUF model exists
if not os.path.exists(quantized_model_path_in_llama_cpp):
    print(f"Error: Quantized GGUF model '{quantized_model_path_in_llama_cpp}' not found. Please ensure the previous quantization step was successful.")
    sys.exit(1)
else:
    print(f"Quantized GGUF model '{quantized_model_path_in_llama_cpp}' found.")

# Change directory to llama.cpp
if not os.path.exists(llama_cpp_dir):
    print(f"Error: Directory '{llama_cpp_dir}' not found.")
    sys.exit(1)

os.chdir(llama_cpp_dir)
print(f"Changed directory to '{llama_cpp_dir}'.")

# Check if llama-cli or main executable exists
# Try multiple possible locations and names
possible_paths = [
    './bin/llama-cli',
    './build/bin/llama-cli',
    './llama-cli',
    './main',
    './build/main',
    './build/examples/main/main',
    './build/examples/server/server',
]

llama_cli_path = None
for path in possible_paths:
    if os.path.exists(path) and os.access(path, os.X_OK):
        llama_cli_path = path
        print(f"Found executable at: {path}")
        break

if not llama_cli_path:
    print("Error: llama-cli or main executable not found.")
    print("\nTo build llama.cpp, run:")
    print("  cd llama.cpp")
    print("  mkdir -p build && cd build")
    print("  cmake ..")
    print("  cmake --build . --target llama-cli -j4")
    print("\nNote: If you encounter build errors on macOS, you may need to:")
    print("  1. Update Xcode Command Line Tools: xcode-select --install")
    print("  2. Or use a pre-built binary from llama.cpp releases")
    print("  3. Or install llama-cpp-python: pip install llama-cpp-python")
    print("\nAlternative: Use Ollama or another inference server instead.")
    os.chdir(original_dir)
    sys.exit(1)

# Define example prompts for inference
# The template for the instruction and response is crucial for the fine-tuned model
example_prompts = [
    "### Instruction:\nWhat is the function of the human brain according to NCERT biology?\n### Response:\n",
    "### Instruction:\nExplain the causes and effects of the Green Revolution in India as per NCERT Social Science.\n### Response:\n",
    "### Instruction:\nDescribe the characteristics of sound waves, based on NCERT Physics.\n### Response:\n"
]

print("Starting inference with the GGUF model...")

for i, prompt_text in enumerate(example_prompts):
    # Extract instruction for printing clarity, but pass full prompt to model
    instruction_part = prompt_text.split('### Response:\n')[0].replace('### Instruction:\n', '').strip()
    print(f"\n--- Inference for Prompt {i+1} ---")
    print(f"Instruction: {instruction_part}")
    print("-" * 60)

    # Run inference using the llama-cli executable with the quantized model
    try:
        # Escape the prompt text for shell command
        cmd = [
            llama_cli_path,
            '-m', quantized_model_filename,
            '-p', prompt_text,
            '-n', '250',
            '--top-k', '40',
            '--top-p', '0.9',
            '--temp', '0.7',
            '--log-disable'
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print(result.stdout)
        if result.stderr:
            print("Stderr:", result.stderr, file=sys.stderr)
            
    except subprocess.CalledProcessError as e:
        print(f"Error running inference: {e}", file=sys.stderr)
        print(f"Command output: {e.stdout}", file=sys.stderr)
        print(f"Command error: {e.stderr}", file=sys.stderr)
    except FileNotFoundError:
        print(f"Error: llama-cli executable not found at '{llama_cli_path}'", file=sys.stderr)
        break

print("\nInference with GGUF model complete. Review the generated responses above.")

# Navigate back to the original directory
os.chdir(original_dir)
print("Returned to original directory.")