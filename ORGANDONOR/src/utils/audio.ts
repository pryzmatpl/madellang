export class AudioProcessor {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private isRecording = false;
  private onAudioDataCallback: ((data: ArrayBuffer) => void) | null = null;

  async startRecording(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.processAudioChunk(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
      };
      
      // Set a short timeslice to get frequent chunks for real-time processing
      this.mediaRecorder.start(100);
      this.isRecording = true;
      
      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    
    this.mediaRecorder.stop();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRecording = false;
    console.log('Recording stopped');
  }

  onAudioData(callback: (data: ArrayBuffer) => void): void {
    this.onAudioDataCallback = callback;
  }

  private async processAudioChunk(chunk: Blob): Promise<void> {
    if (!this.onAudioDataCallback) return;
    
    try {
      const arrayBuffer = await chunk.arrayBuffer();
      this.onAudioDataCallback(arrayBuffer);
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      
      source.onended = () => {
        audioContext.close();
      };
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }
}

export const audioProcessor = new AudioProcessor();