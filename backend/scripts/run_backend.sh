#!/bin/bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables if needed
# export USE_LOCAL_MODELS="true"
# export OPENAI_API_KEY="your-openai-api-key"

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload