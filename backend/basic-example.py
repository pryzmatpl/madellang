import asyncio
import queue
import pyaudio
import numpy as np
import torch
import whisper
from transformers import MarianTokenizer, MarianMTModel
from fastapi import FastAPI, WebSocket
from starlette.websockets import WebSocketDisconnect
import torchaudio
import soundfile as sf
import io

app = FastAPI()

# Audio settings
SAMPLE_RATE = 44100
CHUNK_SIZE = 1024
CHANNELS = 1

# Device setup
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Model initialization
whisper_model = whisper.load_model("base").to(device)
whisper_model = torch.compile(whisper_model, mode="reduce-overhead")  # Optimize for AMD GPU
translation_model_name = "Helsinki-NLP/opus-mt-en-es"
tokenizer = MarianTokenizer.from_pretrained(translation_model_name)
translation_model = MarianMTModel.from_pretrained(translation_model_name).to(device)
translation_model = torch.compile(translation_model, mode="reduce-overhead")
tacotron2 = torch.hub.load('NVIDIA/DeepLearningExamples:torchhub', 'nvidia_tacotron2', pretrained=True).to(device)
tacotron2 = torch.compile(tacotron2, mode="reduce-overhead")
waveglow = torch.hub.load('NVIDIA/DeepLearningExamples:torchhub', 'nvidia_waveglow', pretrained=True).to(device)
waveglow = torch.compile(waveglow, mode="reduce-overhead")
tacotron2.eval()
waveglow.eval()

# Audio input queue
audio_queue = asyncio.Queue()
# Text queues
transcript_queue = queue.Queue()
translated_queue = queue.Queue()


async def capture_audio():
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paFloat32,
                    channels=CHANNELS,
                    rate=SAMPLE_RATE,
                    input=True,
                    frames_per_buffer=CHUNK_SIZE)

    try:
        while True:
            data = stream.read(CHUNK_SIZE, exception_on_overflow=False)
            audio_data = np.frombuffer(data, dtype=np.float32)
            await audio_queue.put(audio_data)
    except asyncio.CancelledError:
        stream.stop_stream()
        stream.close()
        p.terminate()
        raise


async def process_speech_to_text():
    try:
        while True:
            audio_chunk = await audio_queue.get()
            # Resample to Whisper's expected 16kHz
            audio_tensor = torch.tensor(audio_chunk, dtype=torch.float32).to(device)
            resampler = torchaudio.transforms.Resample(SAMPLE_RATE, 16000).to(device)
            audio_tensor = resampler(audio_tensor)
            # Transcribe
            with torch.no_grad():
                result = whisper_model.transcribe(audio_tensor.cpu().numpy(), language="en", fp16=False)
            transcript = result["text"]
            transcript_queue.put(transcript)
    except asyncio.CancelledError:
        raise


async def process_translation():
    try:
        while True:
            transcript = transcript_queue.get(block=True)
            # Translate to Spanish
            inputs = tokenizer(transcript, return_tensors="pt", padding=True).to(device)
            with torch.no_grad():
                translated = translation_model.generate(**inputs)
            translated_text = tokenizer.batch_decode(translated, skip_special_tokens=True)[0]
            translated_queue.put(translated_text)
    except asyncio.CancelledError:
        raise


async def process_text_to_speech(websocket: WebSocket):
    try:
        while True:
            text = translated_queue.get(block=True)
            # Prepare text for Tacotron2
            sequence = np.array(tacotron2.text_to_sequence(text, ['english_cleaners']))[None, :]
            sequence = torch.from_numpy(sequence).to(device).long()
            # Synthesize
            with torch.no_grad():
                mel_outputs, mel_outputs_postnet, _, alignments = tacotron2.infer(sequence)
                audio = waveglow.infer(mel_outputs_postnet)
            # Convert to bytes
            audio_np = audio[0].cpu().numpy()
            buffer = io.BytesIO()
            sf.write(buffer, audio_np, SAMPLE_RATE, format='wav')
            audio_bytes = buffer.getvalue()
            await websocket.send_bytes(audio_bytes)
    except asyncio.CancelledError:
        raise


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        # Start all processing tasks
        audio_task = asyncio.create_task(capture_audio())
        stt_task = asyncio.create_task(process_speech_to_text())
        translation_task = asyncio.create_task(process_translation())
        tts_task = asyncio.create_task(process_text_to_speech(websocket))

        # Send intermediate results
        while True:
            if not transcript_queue.empty():
                transcript = transcript_queue.get()
                await websocket.send_json({"transcript": transcript})
            if not translated_queue.empty():
                translated = translated_queue.get()
                await websocket.send_json({"translated": translated})
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        audio_task.cancel()
        stt_task.cancel()
        translation_task.cancel()
        tts_task.cancel()
    except Exception as e:
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)