import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isActive: boolean;
  stream?: MediaStream | null;
  audioStream?: MediaStream | null;  // Added for compatibility
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, stream, audioStream }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Use audioStream if provided, otherwise use stream
  const audioData = audioStream || stream || null;
  
  useEffect(() => {
    if (!audioData || !isActive || !canvasRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    const source = audioContext.createMediaStreamSource(audioData);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    if (!canvasCtx) return;
    
    const draw = () => {
      if (!isActive) return;
      
      animationRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      canvasCtx.fillStyle = 'rgb(20, 20, 20)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        const gradient = canvasCtx.createLinearGradient(
          0, canvas.height, 0, canvas.height - barHeight
        );
        gradient.addColorStop(0, 'rgb(0, 122, 255)');
        gradient.addColorStop(1, 'rgb(111, 184, 255)');
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioData, isActive]);
  
  return (
    <div className={cn(
      "w-full h-20 rounded-lg overflow-hidden bg-black/5",
      isActive ? "opacity-100" : "opacity-30"
    )}>
      <canvas 
        ref={canvasRef}
        width={300}
        height={80}
        className="w-full h-full"
      />
    </div>
  );
};

export default AudioVisualizer;
