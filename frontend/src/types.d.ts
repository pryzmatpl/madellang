interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}

interface MediaRecorderErrorEvent extends Event {
  name: string;
}

declare class MediaRecorder extends EventTarget {
  readonly stream: MediaStream;
  readonly mimeType: string;
  readonly state: "inactive" | "recording" | "paused";
  readonly videoBitsPerSecond: number;
  readonly audioBitsPerSecond: number;
  
  ondataavailable: ((event: BlobEvent) => void) | null;
  onerror: ((event: MediaRecorderErrorEvent) => void) | null;
  onpause: (() => void) | null;
  onresume: (() => void) | null;
  onstart: (() => void) | null;
  onstop: (() => void) | null;
  
  constructor(stream: MediaStream, options?: MediaRecorderOptions);
  
  start(timeslice?: number): void;
  stop(): void;
  pause(): void;
  resume(): void;
  requestData(): void;
  
  static isTypeSupported(mimeType: string): boolean;
}

interface BlobEvent extends Event {
  data: Blob;
  timecode?: number;
} 