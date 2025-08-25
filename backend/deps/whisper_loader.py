import os
import sys

# Add the custom PyTorch to Python path first
custom_pytorch = os.path.abspath(os.path.join(os.path.dirname(__file__), "pytorch"))
if os.path.exists(custom_pytorch):
    sys.path.insert(0, custom_pytorch)

# Now add the custom whisper to Python path
custom_whisper = os.path.abspath(os.path.join(os.path.dirname(__file__), "whisper"))
if os.path.exists(custom_whisper):
    sys.path.insert(0, custom_whisper)

# Now we can safely import whisper
import whisper

def get_whisper_info():
    """Returns information about the Whisper installation"""
    try:
        info = {
            "version": getattr(whisper, "__version__", "Unknown"),
            "available_models": whisper.available_models(),
            "load_model_available": hasattr(whisper, "load_model")
        }
        return info
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Print Whisper information when this module is run directly
    info = get_whisper_info()
    print(f"Whisper info: {info}") 